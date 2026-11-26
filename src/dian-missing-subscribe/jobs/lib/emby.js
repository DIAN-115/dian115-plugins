// Emby / TMDB 只读查询：列出剧集、取季信息、读缺集。
import { seasonAllowed } from './state.js'

export async function listSeries(ctx, rule, cap = 200) {
  const libraries = rule.libraryIds && rule.libraryIds.length ? rule.libraryIds : ['']
  const out = []
  for (const libraryId of libraries) {
    let offset = 0
    while (out.length < cap) {
      const query = [`type=Series`, `limit=50`, `offset=${offset}`]
      if (rule.proxyId) query.push(`proxy_id=${encodeURIComponent(rule.proxyId)}`)
      if (libraryId) query.push(`library_id=${encodeURIComponent(libraryId)}`)
      let page
      try {
        page = await ctx.api.get(`/api/plugin-host/emby/items?${query.join('&')}`)
      } catch (error) {
        await ctx.task.log(`读取媒体库失败：${error.message}`)
        break
      }
      const items = Array.isArray(page && page.items) ? page.items : []
      out.push(...items)
      if (items.length < 50) break
      offset += 50
    }
  }
  return out
}

export async function tvSeasons(ctx, tmdbId) {
  const info = await ctx.api.get(`/api/tmdb/tv/${encodeURIComponent(tmdbId)}`)
  const seasons = Array.isArray(info && info.seasons) ? info.seasons : []
  return {
    title: String((info && (info.name || info.title)) || ''),
    year: String((info && (info.first_air_date || '')).slice(0, 4) || ''),
    poster: String((info && info.poster_path) || ''),
    seasons: seasons
      .map((item) => ({
        season: Number(item.season_number || 0),
        episodes: Number(item.episode_count || 0),
        air_date: String(item.air_date || ''),
        poster: String(item.poster_path || ''),
      }))
      .filter((item) => Number.isFinite(item.season)),
  }
}

export async function missingEpisodes(ctx, tmdbId, season, totalEpisodes, proxyId) {
  const query = [`tmdb_id=${encodeURIComponent(tmdbId)}`, `season=${encodeURIComponent(season)}`]
  if (Number.isFinite(Number(totalEpisodes)) && Number(totalEpisodes) > 0) query.push(`total_episodes=${Number(totalEpisodes)}`)
  if (proxyId) query.push(`proxy_id=${encodeURIComponent(proxyId)}`)
  return ctx.api.get(`/api/plugin-host/emby/episodes?${query.join('&')}`)
}

export function isSeriesInLibrary(items, tmdbId) {
  const target = String(tmdbId)
  return (items || []).some((item) => {
    const ids = item && item.provider_ids
    if (!ids) return false
    const key = ids.Tmdb || ids.tmdb || ids.TmdbId
    return key != null && String(key) === target
  })
}

// 规则候选季：TMDB 有集数、规则允许、且该季还没全收齐。
export function candidateSeasons(tv, rule) {
  return (tv.seasons || []).filter((season) => season.season === 0 ? rule.special : seasonAllowed(season.season, rule) && season.season > 0)
}

// 该季是否已经开播（首集播出日 ≤ 今天）；TMDB 没给播出日的一律按已开播处理。
export function seasonAired(season, todayYmd) {
  const air = String((season && season.air_date) || '').trim().slice(0, 10)
  if (!air || !/^\d{4}-\d{2}-\d{2}$/.test(air)) return true
  return air <= String(todayYmd)
}

// 宿主本地日期 YYYY-MM-DD
export function todayYmd(date) {
  const d = date || new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
