import {
  KEYS, DEFAULT_CONFIG, normalizeConfig, normalizeRules, expandEpisodes, episodesText,
  seasonLabel, poolKey, isoNow, pushHistory, ruleTitleMatch, importLegacyLedger,
} from './lib/state.js'
import { listSeries, tvSeasons, missingEpisodes, candidateSeasons, seasonAired, todayYmd } from './lib/emby.js'
import { listPool, createIntent } from './lib/pool.js'

const DAY_MS = 24 * 60 * 60 * 1000

export async function run(ctx, input) {
  const manual = Boolean(input && input.manual)
  const config = normalizeConfig(await ctx.storage.get(KEYS.config))
  if (!manual && !config.autoRun) {
    await ctx.task.log('自动运行已关闭，跳过本轮')
    return { skipped: 'auto_run_off' }
  }

  const rules = normalizeRules(await ctx.storage.get(KEYS.rules)).filter((rule) => rule.enabled)
  const storedSubs = await ctx.storage.get(KEYS.subs)
  const subs = Array.isArray(storedSubs) ? storedSubs : []
  if (!subs.length) {
    // 升级到 1.1.x 后第一次运行：把 1.0.x 的账本接管过来。
    const legacy = await ctx.storage.get(KEYS.legacyLedger)
    const imported = importLegacyLedger(legacy)
    if (imported.length) {
      subs.push(...imported)
      await ctx.task.log(`已接管旧账本 ${imported.length} 条订阅`)
      await ctx.storage.set(KEYS.subs, subs)
    }
  }
  const cooldown = asObject(await ctx.storage.get(KEYS.cooldown))
  const storedHistory = await ctx.storage.get(KEYS.history)
  let history = Array.isArray(storedHistory) ? storedHistory : []

  const startedAt = Date.now()
  const stat = { checked: 0, created: 0, merged: 0, skipped: 0, failed: 0 }
  const points = []

  if (!rules.length) {
    await ctx.task.log('没有启用中的规则')
    await saveLastRun(ctx, { at: isoNow(startedAt), trigger: manual ? '手动触发' : '定时运行', ...stat, note: '没有启用中的规则' })
    return stat
  }

  await ctx.task.update({ stage: '读取订阅池', message: '读取聚合订阅' })
  let pool = []
  try {
    pool = await listPool(ctx, 'tv')
  } catch (error) {
    await ctx.task.log(`读取订阅池失败：${error.message}`)
  }
  const poolByKey = new Map(pool.map((item) => [poolKey(item), item]))
  const knownKeys = new Set(subs.map((sub) => sub.key))
  pool.forEach((item) => knownKeys.add(poolKey(item)))

  const activeRules = rules.length
  let totalSeasons = 0
  for (const rule of rules) {
    const series = await listSeries(ctx, rule)
    totalSeasons += series.length
  }
  await ctx.task.update({ stage: '扫描剧集', total: totalSeasons, done: 0 })

  let done = 0
  for (const rule of rules) {
    let series = []
    try {
      series = await listSeries(ctx, rule)
    } catch (error) {
      await ctx.task.log(`规则「${rule.name}」读取剧集失败：${error.message}`)
      continue
    }
    series.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans'))
    for (const item of series) {
      done += 1
      await ctx.task.update({ done, message: String(item.name || '') })

      const title = String(item.name || '')
      if (!title || !ruleTitleMatch(title, rule)) continue
      const tmdbId = tmdbOf(item)
      if (!tmdbId) continue

      let tv
      try {
        tv = await tvSeasons(ctx, tmdbId)
      } catch (error) {
        await ctx.task.log(`读取 TMDB ${tmdbId} 失败：${error.message}`)
        continue
      }
      const displayTitle = tv.title || title
      const today = todayYmd()
      const allSeasons = candidateSeasons(tv, rule)
      const seasons = allSeasons.filter((season) => seasonAired(season, today))
      const waiting = allSeasons.length - seasons.length
      if (waiting > 0) {
        stat.skipped += waiting
        await ctx.task.log(`${displayTitle}：${waiting} 季还没开播，等开播后再订阅`)
      }
      for (const season of seasons) {
        if (stat.created >= config.maxPerRound) break
        if (ctx.remaining() < 30000) break
        const key = `${Number(rule.proxyId || item.proxy_id || 0)}:${Number(tmdbId)}:${Number(season.season)}`
        if (knownKeys.has(key)) {
          stat.merged += 1
          continue
        }
        const cool = cooldown[key]
        if (cool && Number(cool.until || 0) > startedAt) {
          stat.skipped += 1
          continue
        }
        let episodes
        try {
          episodes = await missingEpisodes(ctx, tmdbId, season.season, season.episodes, rule.proxyId || item.proxy_id)
        } catch (error) {
          await ctx.task.log(`${displayTitle} ${seasonLabel(season.season)} 读取缺集失败：${error.message}`)
          stat.failed += 1
          cooldown[key] = { at: isoNow(), attempts: (Number(cool && cool.attempts) || 0) + 1, until: startedAt + config.cooldownDays * DAY_MS, title: displayTitle }
          continue
        }
        stat.checked += 1
        const covered = episodes && episodes.covered_episodes ? String(episodes.covered_episodes) : ''
        const neededList = expandEpisodes(episodes && episodes.needed_episodes)
        if (!neededList.length) {
          stat.skipped += 1
          continue
        }
        if (neededList.length < rule.minMissing) {
          stat.skipped += 1
          continue
        }
        try {
          const payload = {
            tmdb_id: Number(tmdbId),
            media_type: 'tv',
            title: displayTitle,
            year: tv.year || String(item.production_year || ''),
            season: Number(season.season),
            total_episodes: Number(season.episodes || 0),
            episode_scope_mode: 'follow',
            initial_covered_episodes: covered,
            initial_needed_episodes: episodesText(neededList),
            poster_path: String(season.poster || tv.poster || ''),
          }
          if (rule.proxyId || item.proxy_id) payload.proxy_id = Number(rule.proxyId || item.proxy_id)
          const created = await createIntent(ctx, payload)
          const poolId = created && created.id ? created.id : null
          const entry = {
            key,
            pool_id: poolId,
            title: displayTitle,
            season: Number(season.season),
            tmdb_id: Number(tmdbId),
            proxy_id: payload.proxy_id || 0,
            poster_path: payload.poster_path,
            poster_url: '',
            covered: covered,
            needed: episodesText(neededList),
            rule: rule.name,
            created_at: isoNow(startedAt),
            checked_at: isoNow(startedAt),
            state: '进行中',
          }
          subs.push(entry)
          knownKeys.add(key)
          delete cooldown[key]
          history = pushHistory(history, {
            at: isoNow(startedAt), key, title: displayTitle, season: Number(season.season),
            action: 'created', label: '已订阅', poster_path: payload.poster_path, rule: rule.name,
            needed: entry.needed,
          })
          stat.created += 1
          points.push(`${displayTitle} ${seasonLabel(season.season)} 缺 ${entry.needed}`)
          await ctx.task.log(`已订阅 ${displayTitle} ${seasonLabel(season.season)}（缺 ${entry.needed}）`)
          if (config.intervalMs > 0) await ctx.sleep(config.intervalMs)
        } catch (error) {
          stat.failed += 1
          cooldown[key] = { at: isoNow(), attempts: (Number(cool && cool.attempts) || 0) + 1, until: startedAt + config.cooldownDays * DAY_MS, title: displayTitle }
          history = pushHistory(history, {
            at: isoNow(startedAt), key, title: displayTitle, season: Number(season.season),
            action: 'failed', label: '失败', poster_path: payloadPoster(tv, season), rule: rule.name,
            error: String(error && error.message || '').slice(0, 120),
          })
          await ctx.task.log(`创建 ${displayTitle} ${seasonLabel(season.season)} 失败：${error.message}`)
        }
      }
      if (stat.created >= config.maxPerRound) break
    }
    if (stat.created >= config.maxPerRound) {
      await ctx.task.log(`本轮已达单轮上限 ${config.maxPerRound}，剩余留到下一轮`)
      break
    }
  }

  await ctx.storage.set(KEYS.subs, subs)
  await ctx.storage.set(KEYS.cooldown, cooldown)
  await ctx.storage.set(KEYS.history, history)
  await saveLastRun(ctx, { at: isoNow(startedAt), trigger: manual ? '手动触发' : '定时运行', ...stat, duration_ms: Date.now() - startedAt })

  if (config.notify) await sendNotify(ctx, config, stat, points, manual)
  return stat
}

function tmdbOf(item) {
  const ids = item && item.provider_ids
  if (!ids) return 0
  const value = ids.Tmdb || ids.tmdb || ids.TmdbId
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function payloadPoster(tv, season) {
  return String((season && season.poster) || (tv && tv.poster) || '')
}

async function saveLastRun(ctx, payload) {
  try { await ctx.storage.set(KEYS.lastRun, payload) } catch (error) { await ctx.task.log(`记录运行摘要失败：${error.message}`) }
}

async function sendNotify(ctx, config, stat, points, manual) {
  const body = [
    `检查 ${stat.checked} 季，新增 ${stat.created} 条订阅`,
    stat.merged ? `已有 ${stat.merged} 条` : '',
    stat.failed ? `失败 ${stat.failed} 条` : '',
    points.length ? '' : '',
    ...points.slice(0, 8),
  ].filter(Boolean).join('\n')
  try {
    await ctx.notify({
      title: manual ? '缺集自动订阅 · 手动运行' : '缺集自动订阅 · 本轮结果',
      body,
      level: stat.failed ? 'warning' : 'success',
      format: 'markdown',
      channels: config.channels && config.channels !== 'all' ? [config.channels] : ['all'],
      dedupe_key: `scan:${Date.now()}`,
    })
  } catch (error) {
    await ctx.task.log(`发送通知失败：${error.message}`)
  }
}

export async function recover(ctx, checkpoint) {
  if (checkpoint && checkpoint.done) return { action: 'complete', result: checkpoint.result || null }
  if (!checkpoint || !checkpoint.started) return { action: 'resume' }
  // 创建订阅可能已发生，交给核对任务处理，不盲目重建。
  return { action: 'attention' }
}

export const defaults = DEFAULT_CONFIG
