// 共享常量与纯函数：集数串解析、时间格式化、存储键名。
export const KEYS = {
  config: 'config',
  rules: 'rules',
  subs: 'subs',
  cooldown: 'cooldown',
  history: 'history',
  lastRun: 'last_run',
}

export const DEFAULT_CONFIG = {
  autoRun: true,
  checkLedger: true,
  maxPerRound: 20,
  cooldownDays: 7,
  intervalMs: 1500,
  notify: true,
  channels: 'all',
  dropWhenDeleted: true,
}

export function normalizeConfig(raw, legacy) {
  const base = Object.assign({}, DEFAULT_CONFIG)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) Object.assign(base, pickNumbers(raw))
  if (legacy && typeof legacy === 'object') {
    // 旧版总览的设置叫法不同，按语义搬运，未知字段忽略。
    if (typeof legacy.autoRun === 'boolean') base.autoRun = legacy.autoRun
    if (typeof legacy.notify === 'boolean') base.notify = legacy.notify
    if (typeof legacy.dropWhenDeleted === 'boolean') base.dropWhenDeleted = legacy.dropWhenDeleted
  }
  base.maxPerRound = clampInt(base.maxPerRound, 1, 100, DEFAULT_CONFIG.maxPerRound)
  base.cooldownDays = clampInt(base.cooldownDays, 0, 90, DEFAULT_CONFIG.cooldownDays)
  base.intervalMs = clampInt(base.intervalMs, 0, 10000, DEFAULT_CONFIG.intervalMs)
  return base
}

function pickNumbers(raw) {
  const out = {}
  const copy = ['autoRun', 'checkLedger', 'notify', 'dropWhenDeleted']
  copy.forEach((key) => {
    if (typeof raw[key] === 'boolean') out[key] = raw[key]
  })
  if (typeof raw.maxPerRound === 'number') out.maxPerRound = raw.maxPerRound
  if (typeof raw.cooldownDays === 'number') out.cooldownDays = raw.cooldownDays
  if (typeof raw.intervalMs === 'number') out.intervalMs = raw.intervalMs
  if (typeof raw.channels === 'string' && raw.channels) out.channels = raw.channels
  return out
}

export function clampInt(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

export function normalizeRules(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeRule(item, index)).filter(Boolean)
}

export function normalizeRule(item, index) {
  if (!item || typeof item !== 'object') return null
  const name = String(item.name || item.title || '').trim() || `规则 ${index + 1}`
  return {
    id: String(item.id || `rule_${index}_${Math.random().toString(36).slice(2, 8)}`),
    name,
    enabled: item.enabled !== false,
    proxyId: Number(item.proxyId || item.proxy_id || 0) || 0,
    libraryIds: Array.isArray(item.libraryIds) ? item.libraryIds.map(String) : [],
    include: toList(item.include || item.keywords || ''),
    exclude: toList(item.exclude || ''),
    seasons: String(item.seasons || '').trim(),
    minMissing: clampInt(item.minMissing || 1, 1, 50, 1),
    special: item.special === true,
  }
}

export function toList(value) {
  if (Array.isArray(value)) return value.map((text) => String(text).trim()).filter(Boolean)
  return String(value || '')
    .split(/[,，\s]+/)
    .map((text) => text.trim())
    .filter(Boolean)
}

// "1-3,5" → [1,2,3,5]；上限防止异常数据撑爆内存。
export function expandEpisodes(text, cap = 600) {
  const out = []
  const raw = String(text == null ? '' : text)
  const parts = raw.split(',')
  for (const part of parts) {
    const token = part.trim()
    if (!token) continue
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const from = Number(range[1])
      const to = Number(range[2])
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue
      for (let n = from; n <= to && out.length < cap; n += 1) out.push(n)
      continue
    }
    const single = token.match(/^\d+$/)
    if (single) out.push(Number(token))
    if (out.length >= cap) break
  }
  return Array.from(new Set(out)).sort((a, b) => a - b)
}

export function episodesText(list) {
  if (!list || !list.length) return ''
  const sorted = Array.from(new Set(list.map(Number).filter((n) => Number.isFinite(n)))).sort((a, b) => a - b)
  const chunks = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    if (current === prev + 1) {
      prev = current
      continue
    }
    chunks.push(start === prev ? String(start) : `${start}-${prev}`)
    start = current
    prev = current
  }
  chunks.push(start === prev ? String(start) : `${start}-${prev}`)
  return chunks.join(',')
}

export function seasonLabel(season) {
  const number = Number(season)
  if (!Number.isFinite(number) || number <= 0) return '全剧'
  return `S${String(number).padStart(2, '0')}`
}

export function poolKey(item) {
  return `${Number(item.proxy_id || 0)}:${Number(item.tmdb_id || 0)}:${Number(item.season || 0)}`
}

export function isoNow(now) {
  return new Date(now || Date.now()).toISOString()
}

export function pushHistory(list, entry, cap = 200) {
  const next = [entry].concat(list || [])
  return next.slice(0, cap)
}

export function ruleTitleMatch(title, rule) {
  const name = String(title || '').toLowerCase()
  if (rule.exclude && rule.exclude.some((word) => word && name.includes(word.toLowerCase()))) return false
  if (!rule.include || !rule.include.length) return true
  return rule.include.some((word) => word && name.includes(word.toLowerCase()))
}

export function seasonAllowed(season, rule) {
  const number = Number(season)
  if (!Number.isFinite(number)) return false
  if (number === 0 && !rule.special) return false
  const picked = expandEpisodes(rule.seasons, 200)
  if (!picked.length) return true
  return picked.includes(number)
}
