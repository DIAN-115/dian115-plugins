import { KEYS, normalizeConfig, expandEpisodes, episodesText, seasonLabel, poolKey, isoNow, pushHistory, importLegacyLedger } from './lib/state.js'
import { missingEpisodes, listSeries, isSeriesInLibrary } from './lib/emby.js'
import { listPool, patchEpisodes, deleteIntent } from './lib/pool.js'

const MAX_CHECK = 40

export async function run(ctx, input) {
  const manual = Boolean(input && input.manual)
  const config = normalizeConfig(await ctx.storage.get(KEYS.config))
  if (!manual && !config.checkLedger) {
    await ctx.task.log('订阅核对已关闭，跳过本轮')
    return { skipped: 'audit_off' }
  }

  const storedSubs = await ctx.storage.get(KEYS.subs)
  const subs = Array.isArray(storedSubs) ? storedSubs : []
  if (!subs.length) {
    const imported = importLegacyLedger(await ctx.storage.get(KEYS.legacyLedger))
    if (!imported.length) return { checked: 0, dropped: 0, updated: 0 }
    subs.push(...imported)
    await ctx.storage.set(KEYS.subs, subs)
    await ctx.task.log(`已接管旧账本 ${imported.length} 条订阅`)
  }

  const storedHistory = await ctx.storage.get(KEYS.history)
  let history = Array.isArray(storedHistory) ? storedHistory : []

  let pool = []
  try {
    pool = await listPool(ctx, 'tv')
  } catch (error) {
    await ctx.task.log(`读取订阅池失败：${error.message}`)
    return { error: 'pool_unavailable' }
  }
  const poolByKey = new Map(pool.map((item) => [poolKey(item), item]))

  const kept = []
  const processed = new Set()
  const stat = { checked: 0, dropped: 0, updated: 0 }
  const touched = []

  await ctx.task.update({ stage: '核对订阅', total: subs.length, done: 0 })

  for (const sub of subs) {
    if (stat.checked >= MAX_CHECK) continue
    if (ctx.remaining() < 15000) continue
    processed.add(sub.key)
    stat.checked += 1
    await ctx.task.update({ done: stat.checked, message: `${sub.title || ''} ${seasonLabel(sub.season)}` })

    const item = poolByKey.get(sub.key)
    if (!item) {
      stat.dropped += 1
      history = pushHistory(history, {
        at: isoNow(), key: sub.key, title: sub.title, season: sub.season, poster_path: sub.poster_path,
        action: 'dropped', label: '已移除', rule: sub.rule, note: '宿主订阅池里已不存在',
      })
      touched.push(`${sub.title} ${seasonLabel(sub.season)} 已被移除`)
      continue
    }

    let episodes = null
    try {
      episodes = await missingEpisodes(ctx, sub.tmdb_id, sub.season, item.total_episodes_known || 0, sub.proxy_id)
    } catch (error) {
      await ctx.task.log(`${sub.title} ${seasonLabel(sub.season)} 读取缺集失败：${error.message}`)
      kept.push(sub)
      continue
    }
    const covered = String((episodes && episodes.covered_episodes) || '')
    const neededList = expandEpisodes(episodes && episodes.needed_episodes)
    const needed = episodesText(neededList)
    const total = Number((episodes && episodes.total_episodes) || item.total_episodes_known || 0)

    if (total === 0 && !covered) {
      // 这一季在 Emby 里已经完全没有了：可能是剧被删。
      if (config.dropWhenDeleted && await seriesGone(ctx, sub)) {
        try {
          await deleteIntent(ctx, item.id || sub.pool_id)
          stat.dropped += 1
          history = pushHistory(history, {
            at: isoNow(), key: sub.key, title: sub.title, season: sub.season, poster_path: sub.poster_path,
            action: 'dropped', label: '已移除', rule: sub.rule, note: '剧集已不在媒体库',
          })
          touched.push(`${sub.title} ${seasonLabel(sub.season)} 剧集已删除，订阅已取消`)
          continue
        } catch (error) {
          await ctx.task.log(`取消订阅失败：${error.message}`)
        }
      }
    }

    if (covered !== String(item.covered_episodes || '') || needed !== String(item.needed_episodes || '')) {
      try {
        await patchEpisodes(ctx, item.id, { covered_episodes: covered, needed_episodes: needed, total_episodes: total })
        stat.updated += 1
      } catch (error) {
        await ctx.task.log(`更新集数失败：${error.message}`)
      }
    }

    kept.push(Object.assign({}, sub, {
      pool_id: item.id || sub.pool_id,
      covered,
      needed,
      checked_at: isoNow(),
      state: needed ? '进行中' : '已齐全',
      poster_path: sub.poster_path || String(item.poster_path || ''),
    }))
  }

  subs.forEach((sub) => { if (!processed.has(sub.key)) kept.push(sub) })
  await ctx.storage.set(KEYS.subs, dedupeByKey(kept))
  await ctx.storage.set(KEYS.history, history)

  if ((stat.dropped || stat.updated) && config.notify && touched.length) {
    try {
      await ctx.notify({
        title: '缺集自动订阅 · 订阅核对',
        body: [`取消 ${stat.dropped} 条，更新 ${stat.updated} 条`, ...touched.slice(0, 6)].join('\n'),
        level: 'info',
        format: 'markdown',
        channels: config.channels && config.channels !== 'all' ? [config.channels] : ['all'],
        dedupe_key: `audit:${Date.now()}`,
      })
    } catch (error) {
      await ctx.task.log(`发送通知失败：${error.message}`)
    }
  }
  return stat
}

function dedupeByKey(list) {
  const map = new Map()
  list.forEach((item) => { if (item && item.key) map.set(item.key, item) })
  return Array.from(map.values())
}

async function seriesGone(ctx, sub) {
  try {
    const items = await listSeries(ctx, { libraryIds: [], proxyId: sub.proxy_id }, 100)
    if (isSeriesInLibrary(items, sub.tmdb_id)) return false
    const query = `type=Series&limit=20&q=${encodeURIComponent(String(sub.title || ''))}`
    const page = await ctx.api.get(`/api/plugin-host/emby/items?${query}${sub.proxy_id ? `&proxy_id=${sub.proxy_id}` : ''}`)
    const items2 = Array.isArray(page && page.items) ? page.items : []
    return !isSeriesInLibrary(items2, sub.tmdb_id)
  } catch (error) {
    await ctx.task.log(`核对剧集是否存在失败：${error.message}`)
    return false
  }
}

export async function recover() {
  return { action: 'resume' }
}
