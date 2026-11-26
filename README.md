# 缺集自动订阅 · 1.1.1 明文源码

这里放的是 `dian-missing-subscribe` 的**未加密源码**（不是 `.dian115p` 安装包），方便直接阅读、改代码、提 PR。

```
dian-missing-subscribe/
├─ plugin.json         # v3 清单：ui.entry / jobs / declared_usage
├─ jobs/
│  ├─ scan.js          # 每小时扫描：规则 → 剧集 → TMDB 季 → Emby 缺集 → 建/合并订阅
│  ├─ audit.js         # 每 10 分钟核对：订阅池没了就移除，剧被删就取消，否则 PATCH 集数
│  └─ lib/
│     ├─ state.js      # 存储键、默认设置、规则归一化、集数串展开/压缩、历史栈
│     ├─ emby.js       # Emby / TMDB 只读查询
│     └─ pool.js       # 聚合订阅池 list / create / patch / delete
├─ ui/
│  ├─ page.js          # 页面入口，export mount(element, ctx)，四个标签：总览/规则/订阅/记录
│  ├─ styles.js        # 主题变量 + 玻璃质感样式
│  ├─ lib.js           # DOM 助手、海报地址、时间格式化、默认设置
│  └─ icon.svg
└─ dist/               # 留给本机编译产物（不提交二进制）
```

## 结构约定

- 页面与静态资源只能放 `ui/`，后台代码放 `ui/` 之外；`ui/entry` 必须导出 `mount(element, ctx)`，返回值是卸载函数。
- 后台没有 DOM、没有 Node 模块、没有 `fetch`，对外一律走 `ctx.api` / `ctx.storage` / `ctx.notify` / `ctx.sleep`，全部 `await`。
- 存储键：`config` / `rules` / `subs` / `cooldown` / `history` / `last_run`。
- 页面颜色全用宿主主题变量（`--app-bg` / `--app-surface` / `--app-text` / `--app-border` / `--app-accent`），窄面板（≤560px）自适应。

## 接口

- `GET /api/plugin-host/emby/items?type=Series&library_id=…&proxy_id=…&limit=50&offset=…`
- `GET /api/plugin-host/emby/libraries`
- `GET /api/plugin-host/emby/episodes?tmdb_id=…&season=…&total_episodes=…` → `covered_episodes` / `needed_episodes`
- `GET /api/tmdb/tv/{id}` → `seasons[].season_number` / `episode_count`
- `GET|POST /api/subscribe/pool/intents`，`PATCH /api/subscribe/pool/intents/{id}/episodes`，`DELETE /api/subscribe/pool/intents/{id}`

## 编译成安装包

明文包不能直接上架。改完后在宿主编译 MCP 里编译出 `protected-v4` 的 `.dian115p`，再放到仓库根目录，然后更新 `plugin-market/v3/index.json` 的版本与下载地址。

```bash
# 本机只做结构检查（不能代替编译）
node scripts/check.mjs dian-missing-subscribe --pack dist/dian-missing-subscribe-1.1.1.dian115p
```

## 1.1.1 / 1.1.0 与 1.0.x 的差别

- 页面：统计从三张卡改成一条窄带（去掉「已补齐」卡，只留「订阅进行中」与「启用规则」），窄面板不再被拉宽
- 最近记录改成带海报的列表，状态标签与片名同行，时间收在信息块里；宽面板自动分栏
- 订阅账本键仍是 `实例:TMDB:季`，新增 `cooldown` / `last_run` 两份单独存储
- 1.1.1 起自动接管 1.0.x 的 `ledger`（旧账本 → 新 `subs`），旧 `config` 下划线键自动映射，旧 `history` 动作（`subscribed` / `skipped` / `ignored` / `pruned`）正常映射标签
