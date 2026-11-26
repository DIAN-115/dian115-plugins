import { CSS } from './styles.js'
import { DEFAULT_CONFIG, normalizeConfig, seasonLabel, shortTime, posterBox, el, today } from './lib.js'

const KEYS = { config: 'config', rules: 'rules', subs: 'subs', history: 'history', lastRun: 'last_run' }
const TABS = [
  ['overview', '总览'],
  ['rules', '规则'],
  ['subs', '订阅'],
  ['records', '记录'],
]

export function mount(element, ctx) {
  const state = {
    tab: 'overview',
    config: Object.assign({}, DEFAULT_CONFIG),
    rules: [],
    subs: [],
    history: [],
    lastRun: null,
    libraries: [],
    editing: null,
    busy: false,
    toast: '',
    error: '',
    loaded: false,
  }
  let toastTimer = 0

  const style = el('style', { text: CSS })
  const page = el('section', { class: 'ms-page' })
  const headTitles = el('div', { class: 'ms-head-titles' },
    el('h1', { text: '缺集自动订阅' }),
    el('p', { text: '按规则把缺集变成订阅' }))
  const headActions = el('div', { class: 'ms-head-actions' })
  const tabs = el('nav', { class: 'ms-tabs' })
  const body = el('main', { class: 'ms-body' })

  page.appendChild(el('header', { class: 'ms-head' }, headTitles, headActions))
  page.appendChild(tabs)
  page.appendChild(body)
  element.appendChild(style)
  element.appendChild(page)

  if (ctx.navigation?.close) headActions.appendChild(el('button', {
    class: 'ms-btn ms-btn-sm ms-btn-ghost', type: 'button', text: '返回',
    onclick: () => ctx.navigation.close(),
  }))
  if (ctx.navigation?.openSidebar) headActions.appendChild(el('button', {
    class: 'ms-btn ms-btn-sm ms-btn-ghost', type: 'button', text: '菜单',
    onclick: () => ctx.navigation.openSidebar(),
  }))

  const refresh = el('button', { class: 'ms-btn', type: 'button', text: '刷新', onclick: () => load(true) })
  const runNow = el('button', { class: 'ms-btn ms-btn-primary', type: 'button', text: '立即运行', onclick: () => runScan() })
  headActions.appendChild(refresh)
  headActions.appendChild(runNow)

  TABS.forEach(([key, label]) => {
    const node = el('button', {
      class: 'ms-tab', type: 'button', text: label,
      'aria-selected': 'false', dataset: { tab: key },
    })
    node.addEventListener('click', () => { state.tab = key; render() })
    tabs.appendChild(node)
  })

  function showToast(text) {
    state.toast = text
    renderToast()
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { state.toast = ''; renderToast() }, 4000)
  }

  function renderToast() {
    const existing = body.querySelector('.ms-toast')
    if (existing) existing.remove()
    if (!state.toast) return
    body.appendChild(el('div', { class: 'ms-toast', text: state.toast, role: 'status' }))
  }

  async function load(manual) {
    if (state.busy) return
    state.busy = true
    render()
    try {
      const [config, rules, subs, history, lastRun, libraries] = await Promise.all([
        ctx.storage.get(KEYS.config),
        ctx.storage.get(KEYS.rules),
        ctx.storage.get(KEYS.subs),
        ctx.storage.get(KEYS.history),
        ctx.storage.get(KEYS.lastRun),
        loadLibraries(),
      ])
      state.config = normalizeConfig(config)
      state.rules = Array.isArray(rules) ? rules : []
      state.subs = Array.isArray(subs) ? subs : []
      state.history = Array.isArray(history) ? history : []
      state.lastRun = lastRun && typeof lastRun === 'object' ? lastRun : null
      state.libraries = libraries
      state.error = ''
      state.loaded = true
      if (manual) showToast('已刷新')
    } catch (error) {
      state.error = String((error && error.message) || error)
      state.loaded = true
    } finally {
      state.busy = false
      render()
    }
  }

  async function loadLibraries() {
    try {
      const res = await ctx.api.get('/api/plugin-host/emby/libraries')
      const items = Array.isArray(res && res.items) ? res.items : []
      return items.map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || item.id || ''),
        proxyId: Number(item.proxy_id || 0),
      }))
    } catch (error) {
      return []
    }
  }

  async function runScan() {
    if (state.busy) return
    state.busy = true
    render()
    try {
      const run = await ctx.tasks.run('scan', `scan_manual:${Date.now()}`, { manual: true })
      showToast(`已提交运行：${(run && run.id) || '任务队列'}`)
    } catch (error) {
      showToast(`提交失败：${error.message}`)
    } finally {
      state.busy = false
      render()
    }
  }

  function render() {
    tabs.querySelectorAll('.ms-tab').forEach((node) => {
      node.setAttribute('aria-selected', node.dataset.tab === state.tab ? 'true' : 'false')
    })
    refresh.disabled = state.busy
    runNow.disabled = state.busy
    body.replaceChildren()
    if (!state.loaded) {
      body.appendChild(el('div', { class: 'ms-load', text: '正在读取插件数据…' }))
      return
    }
    if (state.error) {
      body.appendChild(el('div', { class: 'ms-card' },
        el('div', { class: 'ms-card-title' }, el('h2', { text: '读取失败' })),
        el('p', { class: 'ms-hint', text: state.error })))
    }
    if (state.tab === 'overview') body.appendChild(viewOverview())
    if (state.tab === 'rules') body.appendChild(viewRules())
    if (state.tab === 'subs') body.appendChild(viewSubs())
    if (state.tab === 'records') body.appendChild(viewRecords())
    renderToast()
  }

  /* ---------- 总览 ---------- */

  function viewOverview() {
    const frag = document.createDocumentFragment()
    frag.appendChild(bandLastRun())
    frag.appendChild(statsBand())
    frag.appendChild(autoRow())
    frag.appendChild(settingsCard())
    frag.appendChild(recentCard())
    return frag
  }

  function bandLastRun() {
    const run = state.lastRun
    const children = [el('span', { class: 'ms-dot' }), el('span', { text: '上次运行' })]
    if (!run) {
      children.push(el('span', { text: '暂无运行记录' }))
    } else {
      children.push(el('b', { text: shortTime(run.at) }))
      if (run.trigger) children.push(el('span', { class: 'ms-chip', text: String(run.trigger) }))
      if (Number.isFinite(Number(run.checked))) children.push(el('span', { text: `检查 ${Number(run.checked)} 季` }))
      if (Number.isFinite(Number(run.created))) children.push(el('span', { class: 'ms-chip', text: `订阅 ${Number(run.created)}` }))
      if (Number(run.failed) > 0) children.push(el('span', { class: 'ms-tag ms-tag-warn', text: `失败 ${Number(run.failed)}` }))
    }
    return el('div', { class: 'ms-card ms-lastrun' }, children)
  }

  function statsBand() {
    const running = state.subs.filter((sub) => sub.state !== '已齐全').length
    const weekNew = state.history.filter((item) => item.action === 'created' && new Date(item.at).getTime() >= today(7)).length
    const enabled = state.rules.filter((rule) => rule.enabled !== false).length
    return el('div', { class: 'ms-card ms-stats' },
      el('div', { class: 'ms-stat' },
        el('b', { text: String(running) }),
        el('div', { class: 'ms-stat-body' },
          el('span', { text: '订阅进行中' }),
          el('em', { class: 'ms-stat-note', text: `近 7 天新增 ${weekNew}` }))),
      el('div', { class: 'ms-stats-sep' }),
      el('div', { class: 'ms-stat' },
        el('b', { text: String(enabled) }),
        el('div', { class: 'ms-stat-body' },
          el('span', { text: '启用规则' }),
          el('em', { class: 'ms-stat-note', text: `共 ${state.rules.length} 条` }))))
  }

  function autoRow() {
    const button = el('button', {
      class: 'ms-switch', type: 'button', 'aria-checked': state.config.autoRun ? 'true' : 'false',
      'aria-label': state.config.autoRun ? '关闭自动运行' : '开启自动运行',
      onclick: () => toggleConfig('autoRun', !state.config.autoRun),
    })
    return el('div', { class: 'ms-card ms-toggle-row' }, button,
      el('div', { class: 'ms-toggle-text' },
        el('strong', { text: '自动运行' }),
        el('span', { text: '每小时检查一次；开启后每 10 分钟核对订阅是否还在库里' })))
  }

  function settingsCard() {
    const maxField = numberField('单轮最多订阅', state.config.maxPerRound, 1, 100, 1, '超出的留到下一轮')
    const coolField = numberField('失败重试冷却（天）', state.config.cooldownDays, 0, 90, 1, '只重试本插件创建的订阅')
    const intervalField = numberField('订阅间隔（毫秒）', state.config.intervalMs, 0, 10000, 100, '0 表示不额外等待')
    const channelSelect = el('select', { 'aria-label': '通知渠道' },
      el('option', { value: 'all', text: '全部渠道' }),
      el('option', { value: 'telegram', text: 'Telegram' }),
      el('option', { value: 'wecom', text: '企业微信' }))
    channelSelect.value = state.config.channels || 'all'

    const notifyBox = el('input', { type: 'checkbox', 'aria-label': '发送结果通知' })
    notifyBox.checked = state.config.notify !== false
    const dropBox = el('input', { type: 'checkbox', 'aria-label': '剧集被删就删订阅' })
    dropBox.checked = state.config.dropWhenDeleted !== false
    const checkBox = el('input', { type: 'checkbox', 'aria-label': '每 10 分钟自动核对' })
    checkBox.checked = state.config.checkLedger !== false

    const save = el('button', {
      class: 'ms-btn ms-btn-primary ms-btn-sm', type: 'button', text: '保存设置',
      onclick: async () => {
        const next = normalizeConfig({
          autoRun: state.config.autoRun,
          checkLedger: checkBox.checked,
          notify: notifyBox.checked,
          dropWhenDeleted: dropBox.checked,
          channels: channelSelect.value,
          maxPerRound: Number(maxField.querySelector('input').value),
          cooldownDays: Number(coolField.querySelector('input').value),
          intervalMs: Number(intervalField.querySelector('input').value),
        })
        try {
          state.config = next
          await ctx.storage.set(KEYS.config, next)
          showToast('设置已保存')
          render()
        } catch (error) {
          showToast(`保存失败：${error.message}`)
        }
      },
    })

    return el('div', { class: 'ms-card' },
      el('div', { class: 'ms-card-title' }, el('h2', { text: '运行设置' })),
      el('div', { class: 'ms-form-grid' }, maxField, coolField, intervalField,
        el('div', { class: 'ms-field' },
          el('label', { text: '通知渠道' }), channelSelect,
          el('span', { class: 'ms-hint', text: '按宿主已开启的渠道发送' }))),
      el('div', { class: 'ms-checks' },
        el('label', { class: 'ms-check' }, notifyBox, '发送结果通知'),
        el('label', { class: 'ms-check' }, dropBox, '剧集被删就删订阅'),
        el('label', { class: 'ms-check' }, checkBox, '每 10 分钟自动核对')),
      el('div', { class: 'ms-form-foot' },
        el('span', { class: 'ms-hint', text: '设置存在插件自己的数据里，升级新版本不会被清空' }),
        save))
  }

  function numberField(label, value, min, max, step, hint) {
    return el('div', { class: 'ms-field' },
      el('label', { text: label }),
      el('input', {
        type: 'number', value: String(value == null ? '' : value),
        min: String(min), max: String(max), step: String(step), 'aria-label': label,
      }),
      el('span', { class: 'ms-hint', text: hint }))
  }

  function recentCard() {
    const rows = state.history.slice(0, 4)
    const card = el('div', { class: 'ms-card' },
      el('div', { class: 'ms-card-title' },
        el('h2', { text: '最近记录' }),
        el('button', {
          class: 'ms-btn ms-btn-sm', type: 'button', text: '查看全部',
          onclick: () => { state.tab = 'records'; render() },
        })))
    if (!rows.length) {
      card.appendChild(el('div', { class: 'ms-empty', text: '还没有运行记录，点「立即运行」试一次' }))
      return card
    }
    card.appendChild(el('div', { class: 'ms-recent' }, rows.map((item) => recordRow(item))))
    return card
  }

  function recordRow(item) {
    const tone = ACTION_TONE[item.action] || 'muted'
    return el('div', { class: 'ms-recent-row' },
      posterBox(item),
      el('div', { class: 'ms-recent-main' },
        el('div', { class: 'ms-recent-top' },
          el('strong', { class: 'ms-recent-title', text: `${item.title || '—'} ${seasonLabel(item.season)}` }),
          el('span', { class: `ms-tag ms-tag-${tone}`, text: item.label || ACTION_LABEL[item.action] || '记录' })),
        item.rule ? el('span', { class: 'ms-recent-sub', text: `规则 · ${item.rule}` }) : null,
        el('span', { class: 'ms-recent-time', text: shortTime(item.at) })))
  }

  /* ---------- 规则 ---------- */

  function viewRules() {
    const card = el('div', { class: 'ms-card' },
      el('div', { class: 'ms-card-title' },
        el('h2', { text: '订阅规则' }),
        state.editing ? null : el('button', {
          class: 'ms-btn ms-btn-sm', type: 'button', text: '新增规则',
          onclick: () => {
            state.editing = { id: '', name: '', enabled: true, include: [], exclude: [], seasons: '', minMissing: 1, proxyId: 0, libraryIds: [], special: false }
            render()
          },
        })))
    if (state.editing) card.appendChild(ruleForm(state.editing))
    else if (!state.rules.length) card.appendChild(el('div', { class: 'ms-empty', text: '还没有规则。新增一条后，插件会按包含/排除关键词挑选剧集。' }))
    else state.rules.forEach((rule) => card.appendChild(ruleCard(rule)))
    return card
  }

  function ruleCard(rule) {
    const enabled = rule.enabled !== false
    const toggle = el('button', {
      class: 'ms-switch', type: 'button', 'aria-checked': enabled ? 'true' : 'false',
      'aria-label': enabled ? `停用规则 ${rule.name}` : `启用规则 ${rule.name}`,
      onclick: async () => {
        rule.enabled = !enabled
        await saveRules()
      },
    })
    const libraries = rule.libraryIds && rule.libraryIds.length
      ? rule.libraryIds.map((id) => (state.libraries.find((lib) => lib.id === id) || {}).name || id).join('、')
      : '全部媒体库'
    return el('div', { class: 'ms-rule' },
      el('div', { class: 'ms-rule-top' }, toggle, el('span', { class: 'ms-rule-name', text: rule.name })),
      el('div', { class: 'ms-rule-meta' },
        el('span', { text: rule.include && rule.include.length ? `包含：${rule.include.join('、')}` : '包含：全部' }),
        rule.exclude && rule.exclude.length ? el('span', { text: `排除：${rule.exclude.join('、')}` }) : null,
        el('span', { text: `季：${rule.seasons || '全部'}` }),
        el('span', { text: `至少缺 ${rule.minMissing || 1} 集` }),
        el('span', { text: libraries })),
      el('div', { class: 'ms-rule-actions' },
        el('button', {
          class: 'ms-btn ms-btn-sm', type: 'button', text: '编辑',
          onclick: () => { state.editing = Object.assign({}, rule); render() },
        }),
        el('button', {
          class: 'ms-btn ms-btn-sm ms-btn-ghost', type: 'button', text: '删除',
          onclick: async () => {
            state.rules = state.rules.filter((item) => item.id !== rule.id)
            await saveRules()
            showToast('已删除规则')
          },
        })))
  }

  function ruleForm(rule) {
    const nameInput = el('input', { type: 'text', value: rule.name || '', placeholder: '例如 连载追更', 'aria-label': '规则名称' })
    const includeInput = el('input', { type: 'text', value: (rule.include || []).join('，'), placeholder: '多个关键词用逗号分隔，留空表示全部', 'aria-label': '包含关键词' })
    const excludeInput = el('input', { type: 'text', value: (rule.exclude || []).join('，'), placeholder: '命中这些词的剧集跳过', 'aria-label': '排除关键词' })
    const seasonsInput = el('input', { type: 'text', value: rule.seasons || '', placeholder: '如 1-3,5；留空表示全部季', 'aria-label': '季范围' })
    const minInput = el('input', { type: 'number', value: String(rule.minMissing || 1), min: '1', max: '50', 'aria-label': '每季至少缺几集' })
    const proxyInput = el('input', { type: 'number', value: String(rule.proxyId || ''), min: '0', placeholder: '留空用默认实例', 'aria-label': 'Emby 实例 ID' })
    const enableBox = el('input', { type: 'checkbox', 'aria-label': '启用这条规则' })
    enableBox.checked = rule.enabled !== false

    const librarySelect = el('select', { 'aria-label': '媒体库' },
      el('option', { value: '', text: '全部媒体库' }),
      ...state.libraries.map((lib) => el('option', { value: lib.id, text: `${lib.name}${lib.proxyId ? ` (#${lib.proxyId})` : ''}` })))
    librarySelect.value = (rule.libraryIds && rule.libraryIds[0]) || ''

    const save = el('button', {
      class: 'ms-btn ms-btn-primary ms-btn-sm', type: 'button', text: '保存规则',
      onclick: async () => {
        const next = {
          id: rule.id || `rule_${Date.now().toString(36)}`,
          name: nameInput.value.trim() || '未命名规则',
          enabled: enableBox.checked,
          include: splitWords(includeInput.value),
          exclude: splitWords(excludeInput.value),
          seasons: seasonsInput.value.trim(),
          minMissing: Math.max(1, Math.min(50, Math.round(Number(minInput.value) || 1))),
          proxyId: Number(proxyInput.value) || 0,
          libraryIds: librarySelect.value ? [librarySelect.value] : [],
          special: false,
        }
        const index = state.rules.findIndex((item) => item.id === next.id)
        if (index >= 0) state.rules[index] = next
        else state.rules.push(next)
        state.editing = null
        await saveRules()
        showToast('规则已保存')
      },
    })
    const cancel = el('button', { class: 'ms-btn ms-btn-sm ms-btn-ghost', type: 'button', text: '取消', onclick: () => { state.editing = null; render() } })

    return el('div', { class: 'ms-rule' },
      el('div', { class: 'ms-form-grid' },
        fieldWrap('规则名称', nameInput),
        fieldWrap('包含关键词', includeInput),
        fieldWrap('排除关键词', excludeInput),
        fieldWrap('季范围', seasonsInput, '留空表示全部季，0 表示特别篇'),
        fieldWrap('每季至少缺几集', minInput),
        fieldWrap('媒体库', librarySelect),
        fieldWrap('Emby 实例 ID', proxyInput)),
      el('div', { class: 'ms-checks' }, el('label', { class: 'ms-check' }, enableBox, '启用这条规则')),
      el('div', { class: 'ms-form-foot' },
        el('span', { class: 'ms-hint', text: '关键词按剧集名称包含匹配' }),
        el('div', { class: 'ms-head-actions' }, cancel, save)))
  }

  function fieldWrap(label, control, hint) {
    return el('div', { class: 'ms-field' }, el('label', { text: label }), control, hint ? el('span', { class: 'ms-hint', text: hint }) : null)
  }

  function splitWords(text) {
    return String(text || '').split(/[,，\s]+/).map((word) => word.trim()).filter(Boolean)
  }

  async function saveRules() {
    try {
      await ctx.storage.set(KEYS.rules, state.rules)
      render()
    } catch (error) {
      showToast(`保存规则失败：${error.message}`)
    }
  }

  /* ---------- 订阅 ---------- */

  function viewSubs() {
    const card = el('div', { class: 'ms-card' },
      el('div', { class: 'ms-card-title' }, el('h2', { text: `订阅中的季（${state.subs.length}）` })))
    if (!state.subs.length) {
      card.appendChild(el('div', { class: 'ms-empty', text: '还没有由本插件创建的订阅' }))
      return card
    }
    const list = el('div', { class: 'ms-recent' })
    state.subs.forEach((sub) => {
      const tone = sub.state === '已齐全' ? 'ok' : 'info'
      list.appendChild(el('div', { class: 'ms-recent-row' },
        posterBox(sub),
        el('div', { class: 'ms-recent-main' },
          el('div', { class: 'ms-recent-top' },
            el('strong', { class: 'ms-recent-title', text: `${sub.title || '—'} ${seasonLabel(sub.season)}` }),
            el('span', { class: `ms-tag ms-tag-${tone}`, text: sub.state || '进行中' })),
          el('span', { class: 'ms-recent-sub', text: `${sub.needed ? `缺 ${sub.needed}` : '无待补集'}${sub.rule ? ` · 规则 · ${sub.rule}` : ''}` }),
          el('span', { class: 'ms-recent-time', text: `更新 ${shortTime(sub.checked_at || sub.created_at)}` })),
        el('button', { class: 'ms-btn ms-btn-sm ms-btn-ghost', type: 'button', text: '取消', onclick: () => cancelSub(sub) })))
    })
    card.appendChild(list)
    return card
  }

  async function cancelSub(sub) {
    try {
      if (sub.pool_id) await ctx.api.delete(`/api/subscribe/pool/intents/${encodeURIComponent(sub.pool_id)}`)
      state.subs = state.subs.filter((item) => item.key !== sub.key)
      state.history = [{
        at: new Date().toISOString(), key: sub.key, title: sub.title, season: sub.season,
        poster_path: sub.poster_path, action: 'dropped', label: '已取消', rule: sub.rule, note: '在插件页面取消',
      }].concat(state.history).slice(0, 200)
      await ctx.storage.set(KEYS.subs, state.subs)
      await ctx.storage.set(KEYS.history, state.history)
      showToast('已取消订阅')
      render()
    } catch (error) {
      showToast(`取消失败：${error.message}`)
    }
  }

  /* ---------- 记录 ---------- */

  function viewRecords() {
    const card = el('div', { class: 'ms-card' },
      el('div', { class: 'ms-card-title' }, el('h2', { text: `运行记录（${state.history.length}）` })))
    if (!state.history.length) {
      card.appendChild(el('div', { class: 'ms-empty', text: '暂无记录' }))
      return card
    }
    const list = el('div', {})
    state.history.slice(0, 80).forEach((item) => {
      list.appendChild(el('div', { class: 'ms-record' },
        el('span', { class: 'ms-record-time', text: shortTime(item.at) }),
        el('div', { class: 'ms-record-main' },
          el('div', { class: 'ms-record-title', text: `${item.title || '—'} ${seasonLabel(item.season)}` }),
          el('div', {
            class: 'ms-record-sub',
            text: [item.rule ? `规则 · ${item.rule}` : '', item.needed ? `缺 ${item.needed}` : '', item.note || item.error || ''].filter(Boolean).join(' · '),
          })),
        el('span', { class: `ms-tag ms-tag-${ACTION_TONE[item.action] || 'muted'}`, text: item.label || ACTION_LABEL[item.action] || '记录' })))
    })
    card.appendChild(list)
    return card
  }

  async function toggleConfig(key, value) {
    const next = normalizeConfig(Object.assign({}, state.config, { [key]: value }))
    try {
      state.config = next
      await ctx.storage.set(KEYS.config, next)
      render()
      showToast(value ? '自动运行已开启' : '自动运行已关闭')
    } catch (error) {
      showToast(`保存失败：${error.message}`)
    }
  }

  load(false)

  return () => {
    clearTimeout(toastTimer)
    element.replaceChildren()
  }
}

const ACTION_LABEL = { created: '已订阅', failed: '失败', dropped: '已移除', merged: '已合并' }
const ACTION_TONE = { created: 'info', failed: 'warn', dropped: 'muted', merged: 'ok' }
