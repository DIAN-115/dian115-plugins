export const CSS = `
.ms-page {
  box-sizing: border-box;
  height: 100%;
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  color: var(--app-text, #e9edf7);
  background:
    radial-gradient(1200px 600px at 80% -10%, color-mix(in srgb, var(--app-accent, #7c9dff) 16%, transparent), transparent 70%),
    var(--app-bg, #0c0f17);
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.ms-page * { box-sizing: border-box; }

/* 顶栏 */
.ms-head {
  display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
  padding: 14px 16px 8px;
}
.ms-head-titles { flex: 1 1 200px; min-width: 0 }
.ms-head h1 { margin: 0; font-size: 19px; line-height: 1.3; letter-spacing: .01em }
.ms-head p { margin: 3px 0 0; font-size: 12.5px; color: var(--app-text-secondary, #93a0bd); opacity: .85 }
.ms-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap }

/* 通用按钮 */
.ms-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 36px; padding: 0 14px; font: inherit; font-size: 13px;
  color: var(--app-text, #e9edf7);
  background: color-mix(in srgb, var(--app-surface, #ffffff) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 16%, transparent);
  border-radius: 999px; cursor: pointer;
  transition: background .18s, border-color .18s, transform .18s;
}
.ms-btn:hover { background: color-mix(in srgb, var(--app-surface, #ffffff) 14%, transparent) }
.ms-btn:active { transform: scale(.97) }
.ms-btn:disabled { opacity: .5; cursor: default }
.ms-btn:focus-visible { outline: 2px solid var(--app-accent, #7c9dff); outline-offset: 2px }
.ms-btn-primary {
  color: #fff; border-color: transparent;
  background: linear-gradient(140deg, color-mix(in srgb, var(--app-accent, #7c9dff) 92%, #ffffff 8%), color-mix(in srgb, var(--app-accent, #7c9dff) 72%, #1a2a6b 28%));
  box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--app-accent, #7c9dff) 70%, transparent);
}
.ms-btn-primary:hover { filter: brightness(1.06) }
.ms-btn-ghost { background: transparent; border-color: transparent; color: var(--app-text-secondary, #93a0bd) }
.ms-btn-sm { min-height: 30px; padding: 0 11px; font-size: 12.5px }

/* 标签栏 */
.ms-tabs {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
  margin: 4px 12px 12px; padding: 4px;
  background: color-mix(in srgb, var(--app-surface, #ffffff) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 12%, transparent);
  border-radius: 999px;
}
.ms-tab {
  border: 0; margin: 0; padding: 9px 4px; font: inherit; font-size: 13.5px;
  color: var(--app-text-secondary, #93a0bd); background: transparent; border-radius: 999px;
  cursor: pointer; min-height: 38px;
}
.ms-tab[aria-selected="true"] {
  color: #fff;
  background: linear-gradient(140deg, color-mix(in srgb, var(--app-accent, #7c9dff) 88%, #ffffff 12%), color-mix(in srgb, var(--app-accent, #7c9dff) 70%, #22347a 30%));
  box-shadow: 0 8px 20px -12px #000;
}

/* 正文 */
.ms-body { min-height: 0; overflow: auto; overscroll-behavior-y: contain; padding: 0 12px 22px; }
.ms-body > * + * { margin-top: 10px }

.ms-card {
  padding: 14px 16px;
  background: color-mix(in srgb, var(--app-surface, #ffffff) 6.5%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 12%, transparent);
  border-radius: 16px;
  backdrop-filter: blur(18px) saturate(140%);
}
.ms-card-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px }
.ms-card-title h2 { margin: 0; font-size: 14.5px; font-weight: 650 }

/* 上次运行 */
.ms-lastrun { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12.5px; color: var(--app-text-secondary, #93a0bd) }
.ms-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--app-accent, #7c9dff); box-shadow: 0 0 8px var(--app-accent, #7c9dff) }
.ms-lastrun b { color: var(--app-text, #e9edf7); font-variant-numeric: tabular-nums }
.ms-chip {
  padding: 2px 8px; border-radius: 999px; font-size: 11.5px;
  background: color-mix(in srgb, var(--app-accent, #7c9dff) 20%, transparent);
  color: color-mix(in srgb, var(--app-accent, #7c9dff) 70%, #ffffff 30%);
}

/* 统计窄带 */
.ms-stats { display: flex; align-items: center; gap: 20px; padding: 13px 18px }
.ms-stat { flex: 1 1 0; display: flex; align-items: center; gap: 13px; min-width: 0 }
.ms-stat b { font-size: 30px; line-height: 1; font-weight: 700; flex: none; font-variant-numeric: tabular-nums }
.ms-stat-body { display: flex; flex-direction: column; gap: 3px; min-width: 0 }
.ms-stat-body span { font-size: 12.5px; color: var(--app-text-secondary, #93a0bd) }
.ms-stat-note { font-style: normal; font-size: 11.5px; color: var(--app-text-secondary, #93a0bd); opacity: .72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.ms-stats-sep { width: 1px; align-self: stretch; background: color-mix(in srgb, var(--app-text, #ffffff) 13%, transparent) }

/* 开关行 */
.ms-toggle-row { display: flex; align-items: center; gap: 12px }
.ms-switch { position: relative; flex: none; width: 46px; height: 26px; border-radius: 999px; border: 0; padding: 0; cursor: pointer;
  background: color-mix(in srgb, var(--app-text, #ffffff) 16%, transparent); transition: background .2s }
.ms-switch[aria-checked="true"] { background: linear-gradient(120deg, #58d68f, #35c07a) }
.ms-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); transition: transform .2s }
.ms-switch[aria-checked="true"]::after { transform: translateX(20px) }
.ms-toggle-text { display: flex; flex-direction: column; gap: 2px; min-width: 0 }
.ms-toggle-text strong { font-size: 13.5px; font-weight: 650 }
.ms-toggle-text span { font-size: 11.5px; color: var(--app-text-secondary, #93a0bd) }

/* 表单 */
.ms-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px }
.ms-field { display: flex; flex-direction: column; gap: 5px; min-width: 0 }
.ms-field label { font-size: 12px; color: var(--app-text-secondary, #93a0bd) }
.ms-field input, .ms-field select, .ms-field textarea {
  width: 100%; min-height: 36px; padding: 0 11px; font: inherit; font-size: 13px;
  color: var(--app-text, #e9edf7);
  background: color-mix(in srgb, var(--app-surface, #ffffff) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 16%, transparent);
  border-radius: 10px;
}
.ms-field textarea { padding: 8px 11px; min-height: 64px; resize: vertical }
.ms-field input:focus, .ms-field select:focus, .ms-field textarea:focus { outline: 2px solid color-mix(in srgb, var(--app-accent, #7c9dff) 60%, transparent); outline-offset: 0 }
.ms-hint { font-size: 11.5px; color: var(--app-text-secondary, #93a0bd); opacity: .72 }
.ms-checks { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px }
.ms-check { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--app-text-secondary, #93a0bd) }
.ms-check input { width: 15px; height: 15px; accent-color: var(--app-accent, #7c9dff) }
.ms-form-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 12px }
.ms-form-foot .ms-hint { flex: 1 1 180px }

/* 最近记录 / 订阅列表：一行一个，窄屏单列，宽面板自动分列 */
.ms-recent { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 4px 16px; margin-top: 10px }
.ms-recent-row {
  display: flex; align-items: center; gap: 12px; padding: 8px 6px; border-radius: 12px;
  transition: background .18s;
}
.ms-recent-row:hover { background: color-mix(in srgb, var(--app-text, #ffffff) 5%, transparent) }
.ms-recent-row .ms-poster { width: 44px; height: 66px; border-radius: 10px; font-size: 17px }
.ms-recent-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px }
.ms-recent-top { display: flex; align-items: center; gap: 8px; min-width: 0 }
.ms-recent-title { flex: 0 1 auto; min-width: 0; font-size: 13.5px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.ms-recent-sub { font-size: 11.5px; color: var(--app-text-secondary, #93a0bd); opacity: .75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.ms-recent-time { font-size: 11.5px; color: var(--app-text-secondary, #93a0bd); font-variant-numeric: tabular-nums }

/* 海报块 */
.ms-poster { position: relative; flex: none; overflow: hidden; border-radius: 8px; background: color-mix(in srgb, var(--app-text, #ffffff) 10%, transparent) }
.ms-poster img { width: 100%; height: 100%; object-fit: cover; display: block }
.ms-poster-fallback {
  display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff;
  background: linear-gradient(150deg, color-mix(in srgb, var(--app-accent, #7c9dff) 82%, #ffffff 18%), color-mix(in srgb, var(--app-accent, #7c9dff) 55%, #1a2450 45%));
}

/* 状态标签 */
.ms-tag {
  flex: none; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; line-height: 1.5;
  border: 1px solid transparent; white-space: nowrap;
}
.ms-tag-ok { color: #5fd39a; background: color-mix(in srgb, #4fd18e 16%, transparent); border-color: color-mix(in srgb, #4fd18e 34%, transparent) }
.ms-tag-info { color: color-mix(in srgb, var(--app-accent, #7c9dff) 78%, #ffffff 22%); background: color-mix(in srgb, var(--app-accent, #7c9dff) 16%, transparent); border-color: color-mix(in srgb, var(--app-accent, #7c9dff) 32%, transparent) }
.ms-tag-warn { color: #f0b45f; background: color-mix(in srgb, #f0a94f 16%, transparent); border-color: color-mix(in srgb, #f0a94f 34%, transparent) }
.ms-tag-muted { color: var(--app-text-secondary, #93a0bd); background: color-mix(in srgb, var(--app-text, #ffffff) 8%, transparent); border-color: color-mix(in srgb, var(--app-text, #ffffff) 14%, transparent) }

/* 规则卡片 */
.ms-rule { padding: 12px 14px; border-radius: 14px; background: color-mix(in srgb, var(--app-surface, #ffffff) 5%, transparent); border: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 11%, transparent) }
.ms-rule + .ms-rule { margin-top: 8px }
.ms-rule-top { display: flex; align-items: center; gap: 10px }
.ms-rule-name { flex: 1 1 auto; min-width: 0; font-size: 13.5px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.ms-rule-meta { margin-top: 6px; font-size: 11.5px; color: var(--app-text-secondary, #93a0bd); opacity: .8; display: flex; flex-wrap: wrap; gap: 6px 12px }
.ms-rule-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px }

/* 记录页 */
.ms-record { display: flex; align-items: center; gap: 10px; padding: 9px 4px; border-bottom: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 8%, transparent) }
.ms-record:last-child { border-bottom: 0 }
.ms-record-time { flex: none; width: 78px; font-size: 11.5px; color: var(--app-text-secondary, #93a0bd); font-variant-numeric: tabular-nums }
.ms-record-main { flex: 1 1 auto; min-width: 0 }
.ms-record-title { font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.ms-record-sub { font-size: 11px; color: var(--app-text-secondary, #93a0bd); opacity: .75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }

/* 空状态与提示 */
.ms-empty { padding: 22px 8px; text-align: center; font-size: 12.5px; color: var(--app-text-secondary, #93a0bd) }
.ms-toast {
  position: sticky; bottom: 8px; margin: 10px auto 0; max-width: 420px;
  padding: 8px 14px; text-align: center; font-size: 12.5px; border-radius: 999px;
  background: color-mix(in srgb, var(--app-text, #ffffff) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-border, #ffffff) 18%, transparent);
}
.ms-load { padding: 28px 8px; text-align: center; font-size: 12.5px; color: var(--app-text-secondary, #93a0bd) }

/* 窄屏与触屏 */
@media (max-width: 560px) {
  .ms-head { padding: 12px 12px 6px }
  .ms-head h1 { font-size: 17px }
  .ms-tabs { margin: 4px 8px 10px }
  .ms-body { padding: 0 8px 20px }
  .ms-card { padding: 12px 13px; border-radius: 14px }
  .ms-stats { gap: 12px; padding: 11px 13px }
  .ms-stat { gap: 10px }
  .ms-stat b { font-size: 26px }
  .ms-lastrun { font-size: 11.5px }
}
@media (pointer: coarse) {
  .ms-page input, .ms-page select, .ms-page textarea { font-size: max(16px, 1em) }
  .ms-btn { min-height: 44px }
  .ms-switch { min-height: 26px }
}
@media (prefers-reduced-motion: reduce) {
  .ms-page * { transition: none !important }
}
`