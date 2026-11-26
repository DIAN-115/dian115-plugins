// 页面用的纯函数与常量（放在 ui/ 目录内，加密包会一起公开）。
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

export function normalizeConfig(raw) {
  const base = Object.assign({}, DEFAULT_CONFIG)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    ;['autoRun', 'checkLedger', 'notify', 'dropWhenDeleted'].forEach((key) => {
      if (typeof raw[key] === 'boolean') base[key] = raw[key]
    })
    if (Number.isFinite(Number(raw.maxPerRound))) base.maxPerRound = Math.max(1, Math.min(100, Math.round(Number(raw.maxPerRound))))
    if (Number.isFinite(Number(raw.cooldownDays))) base.cooldownDays = Math.max(0, Math.min(90, Math.round(Number(raw.cooldownDays))))
    if (Number.isFinite(Number(raw.intervalMs))) base.intervalMs = Math.max(0, Math.min(10000, Math.round(Number(raw.intervalMs))))
    if (typeof raw.channels === 'string' && raw.channels) base.channels = raw.channels
  }
  return base
}

export function seasonLabel(season) {
  const number = Number(season)
  if (!Number.isFinite(number) || number <= 0) return '全剧'
  return `S${String(number).padStart(2, '0')}`
}

export function expandEpisodes(text, cap = 600) {
  const out = []
  String(text == null ? '' : text).split(',').forEach((part) => {
    const token = part.trim()
    if (!token) return
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]) && out.length < cap; n += 1) out.push(n)
      return
    }
    if (/^\d+$/.test(token)) out.push(Number(token))
  })
  return Array.from(new Set(out))
}

export function today(days) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime() - days * 86400000
}

export function parseTime(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function shortTime(value) {
  const date = parseTime(value)
  if (!date) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function relDay(value) {
  const date = parseTime(value)
  if (!date) return ''
  const today0 = new Date()
  today0.setHours(0, 0, 0, 0)
  const diff = Math.round((today0.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${diff} 天前`
}

export function posterURL(posterPath) {
  if (!posterPath) return ''
  if (/^https?:\/\//.test(posterPath)) return posterPath
  return `/api/emby-manager/tmdb-image?path=${encodeURIComponent(posterPath)}`
}

export function initial(title) {
  const text = String(title || '').trim()
  return text ? text.slice(0, 1) : '·'
}

export function el(tag, props, ...children) {
  const node = document.createElement(tag)
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value == null || value === false) return
      if (key === 'class') node.className = value
      else if (key === 'text') node.textContent = value
      else if (key === 'html') node.innerHTML = value
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value)
      else if (key === 'dataset') Object.assign(node.dataset, value)
      else node.setAttribute(key, value === true ? '' : String(value))
    })
  }
  children.flat(3).forEach((child) => {
    if (child == null || child === false) return
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child)
  })
  return node
}

export function posterBox(item, className = 'ms-poster') {
  const url = item.poster_url || posterURL(item.poster_path)
  if (!url) return el('div', { class: className + ' ms-poster-fallback', text: initial(item.title) })
  const img = el('img', { src: url, alt: item.title || '', loading: 'lazy', decoding: 'async' })
  img.addEventListener('error', () => {
    const fallback = el('div', { class: className + ' ms-poster-fallback', text: initial(item.title) })
    if (img.parentNode) img.parentNode.replaceChild(fallback, img)
  })
  return el('div', { class: className }, img)
}
