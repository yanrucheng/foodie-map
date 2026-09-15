# 开发与运行

## 运行环境

- Node.js 24 LTS，支持 `>=24.11.0 <25`；[.nvmrc](../.nvmrc) 固定当前验证版本 `24.21.0`。
- npm 11；[package.json](../package.json) 的 `packageManager` 记录验证版本 `11.19.0`，`package-lock.json` 是依赖版本的权威来源。
- 数据工具需要 Python `>=3.11`，条件来自 [cuisine-boarding/pyproject.toml](../skills/cuisine-boarding/pyproject.toml)。现有脚本只使用标准库；快速集的 boarding 工具测试及发布门禁的 `check:coverage` 都需要 Python。
- 浏览器测试另需锁定的 Chrome Headless Shell 和 Playwright WebKit；`npm run browser:install` 安装两者。`npm ci` 不下载浏览器。

`engines` 与 `.npmrc` 的 `engine-strict=true` 约束安装；`devEngines` 同时在 npm 命令启动前检查 Node/npm。修改支持范围时须同步这两份标准字段及 `.nvmrc`，核对锁文件所有依赖的 engines，并重放干净安装。不要使用 `--force` 绕过环境检查。

## 从干净 checkout 开始

在仓库根目录执行。以下示例使用 nvm；也可通过其他版本管理器或 Node 官方发行包提供同一运行环境。

```sh
nvm install
nvm use
node --version
npm --version
npm ci
npm run check
npm test
npm run build
```

Node 24 自带兼容的 npm 11。如果需要与记录版本完全一致，可在所选 Node 环境中安装 `npm@11.19.0`。正常安装不得改变 `package-lock.json`。只有有意变更依赖时才使用 `npm install`，并一起审阅 manifest 和锁文件。

开发服务器：

```sh
npm run dev -- --host 127.0.0.1
```

生产产物写入 `dist/`。预览这些产物：

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

打开终端显示的地址；用 Ctrl-C 结束服务。开发服务器用于开发，`preview` 用于本地验证生产构建。

## 命令职责

所有实现集中在 `package.json` scripts，Makefile 只转调它们。

| npm 入口 | Make 入口 | 职责与失败语义 |
|---|---|---|
| `npm run check:repository` | npm 直接运行 | 检查当前工作区/暂存内容的 1,000,000 字节上限与输出目录；CI 另检查本次新增历史对象。 |
| `npm run check` | `make check` | 顺序执行类型、规范与数据检查；任一步失败即非零退出。 |
| `npm run check:types` | 经 `make check` | 检查应用、数据工具、快速测试和 Vite/Vitest 配置，不生成 JS、声明或 tsbuildinfo。 |
| `npm run check:lint` | 经 `make check` | ESLint 的 JS/TS 规则、Hooks 调用与依赖规则；警告也失败。 |
| `npm run validate:data` | 经 `make check` | 只读校验登记数据与 taxonomy/mappings；数据错误非零退出，维护提示不阻止通过。 |
| `npm test` | `make test` | Vitest 快速集；断言、加载、配置错误或空集合均失败。 |
| `npm run build` | `make build` | Vite 生成生产资产；构建错误失败。类型与测试由上述独立入口承担。 |
| `npm run browser:install` | `make browser:install` | 安装锁定的 Chrome Headless Shell 和 WebKit。Linux 先安装两引擎的系统依赖。 |
| `npm run test:e2e` | `make test:e2e` | 构建一次后运行 Chromium/WebKit 生产浏览器集；服务、动态端口和浏览器由测试清理。`-- --prebuilt` 验证已有 `dist`，不重建。 |
| `npm run test:all` | `make test:all` | 顺序调用快速集和浏览器集。 |
| `npm run test:performance` | `make test:performance` | 按 P07 协议测量已有 `dist` 与固定种子 1000 条 fixture；超预算或采样失败非零退出。 |
| `npm run test:gates` | `make test:gates` | 在临时源码副本注入坏数据、正式覆盖表过期、类型和行为失败；原工作区不注入故障。 |
| `npm run check:coverage` | 经发布门禁 | 只读比较正式 catalog、年度数据、本地来源证据与派生覆盖表；漂移即失败。 |
| `npm run rehearse:catalog` | npm 直接运行 | 经正式 parser/校验器重放隔离新城、两版、覆盖对账、同版修订与恢复；保存输入及命令。 |
| `npm run release:check` | `make release:check` | 顺序运行 check、完整快速集、P03 覆盖检查、build、已有产物浏览器集和性能预算；成功后保存产物凭据。 |
| `npm run release:verify` | `make release:verify` | 比较凭据、源码/锁文件和全部产物字节；任何变化均失败。 |
| `npm run release:snapshot` | `make release:snapshot` | 导出 Git 登记及未跟踪的当前源码候选和逐文件哈希，不把工作树冒充为 HEAD。 |
| `npm run dev` / `npm run preview` | `make dev` / `make preview` | 开发服务 / 本地生产预览。需要额外 CLI 参数时直接调用 npm。 |
| `npm run readme` | `make readme` | 使用 Python 更新现有数据覆盖表，会修改接入指南。 |

开发反馈使用受影响快速测试；交付使用完整 `release:check`。PR 与 main 使用相同入口。P03 已通过用户交接验收，正式 catalog、年度数据与 `check:coverage` 已接通；当前发布检查运行真实覆盖校验，没有成功占位命令。

## 快速测试与资源隔离

`vitest.config.ts` 声明 `tests/unit/**/*.test.{ts,tsx}` 为快速集合。纯逻辑使用 Node 环境，URL 与 React Hook 测试通过文件级注释选择 jsdom。

```sh
npm test -- tests/unit/urlState.test.ts
npm test -- --sequence.shuffle --sequence.seed=101
npm test -- --sequence.shuffle --sequence.seed=202
```

快速集不启动服务器或浏览器，不读取外部 HTTP、不真实等待，也不依赖固定端口、临时路径、随机顺序或个人目录。时间行为使用 Vitest fake timers，外部接口在边界处 stub；每条测试清理计时器并恢复 mocks、全局和环境变量。React 测试显式 `cleanup`，URL 测试通过真实 History API 写入并恢复 URL。

## 生产浏览器验证

```sh
npm run browser:install
npm run test:e2e
```

Linux/CI 首次运行前执行 `npx playwright install-deps chromium webkit`。浏览器位于本 checkout 的 `node_modules/.cache/puppeteer` 和 `node_modules/.cache/playwright`，无需个人目录中的全局浏览器。

Chrome Headless Shell 保存在 `node_modules/.cache/puppeteer/`。采用官方独立 headless 运行器，使自动验证不依赖桌面合成器；本机普通 Chrome headless 在最小按钮页面不产生动画帧，Headless Shell 已验证动画帧、真实点击和截图正常。安装或系统库问题由浏览器安装命令明确报错；不要把“未启动浏览器”当成测试通过。

浏览器集复用 `node:test` 和生产构建 harness。早期显示/状态场景仍隔离发现模块与 HTTP，以便分别测试坏 JSON、长文本等边界。`catalog.test.mjs`、P07 的 `release-cache`、`release-flow`、`release-rollout` 通过原始 catalog → 正式 parser → adapter/P04/P05 → releaseBuild，并启用真实 Worker。新城和两版只在隔离数据目录中构造；不替换 cities.ts 来证明扩展。正式 `dist` 冒烟及 P05 全名单联调直接读取实际年度数据，后者单独隔离传感器和外部瓦片。

Worker 场景通过本地 HTTP 服务控制坏响应与 A/B 产物切换，不拦截 Worker 内部请求。CSP 在浏览器边界阻断外部瓦片/字体。WebKit 的全局 `setOffline` 开关会产生导航内部错误，因此其离线场景使用本地 origin 连接中断；Chromium 同时启用浏览器离线开关。两者都实际从 CacheStorage 重载应用；需要当前 Safari 或真机结论时另做实测。

可将机器可读结果与标记/热力图截图写入自选目录：

```sh
E2E_ARTIFACT_DIR="$(mktemp -d)" npm run test:e2e
```

默认失败证据放在 `test-results/e2e/failures/`；指定 `E2E_ARTIFACT_DIR` 后写入该目录。首个失败保留场景、浏览器、页面错误、截图、数据集、源码和构建信息。成功场景的临时截图自动删除。测试不重试失败。axe 执行异常直接失败；每项 incomplete 需要实际 ARIA 引用或保守颜色对比计算支持，未知情况失败，逐项核对报告与原始 axe JSON 一起保存。

## 依赖与后续 Packet

应用地图代码统一从 [src/lib/leaflet.ts](../src/lib/leaflet.ts) 导入，类型可从 `leaflet` 导入。核心、markercluster、heat 和三份必要 CSS 由 npm 锁文件与 Vite 管理。`leaflet.heat` 使用 Leaflet UMD 设置的 `window.L`，适配边界由 P01 负责；业务组件显式导入模块。不要重新添加 HTML CDN 脚本或独立 Leaflet 副本。

P02 的 `npm run validate:data` 已接入 `check`，`--root` 支持隔离数据副本；Python boarding 调用同一 TypeScript 合同。P03 扩展 catalog 发现与年度对账，P07 组合这些权威命令建立持续门禁。字段和未知值约定见[数据接入指南](data-onboarding-guide.md)。

P05 已稳定定位回调并移除地图初始化 effect 的 Hooks 依赖临时豁免。地图、定位会话和瓦片事件的生命周期验证见 [P05 交付记录](../openspec/changes/p05-map-location-correctness/tasks.md)。

Python 数据工具可以先只检查入口，不写餐厅数据：

```sh
python3 --version
python3 skills/cuisine-boarding/board.py --help
```

实际接入遵循[数据接入指南](data-onboarding-guide.md)和 P02/P03 的合同。

## P08 展示与验证

[`restaurantPresentation.ts`](../src/config/restaurantPresentation.ts) 是自动配色、消费形式名称和本地 SVG 的共享入口，替代原 cuisineRegistry 手工色表。类别语义仍由 taxonomy/mappings 维护，字段规则由 contract.ts 维护。FNV-1a 32 位哈希取 360 色相，62% 饱和度、28% 亮度、白色前景；OTHER 固定 #666666。React 和 Leaflet 共用受信 Tabler Outline 3.46.0 图形，许可随 `public/icons/tabler-LICENSE.txt` 构建。没有远程图标依赖。

`serving_form` 是独立可选字段。useFilters 统一组合类别/形式过滤，统计、地图和热力图消费同一结果；形式按钮数量按整份数据（含无坐标）计数。App 的当前选中记录同时驱动标记外圈、桌面弹窗和移动详情；标记点击与搜索更新同一状态，关闭、筛选撤下和切版清理同步撤下外圈。每次激活传递现有选择对象，因此连续鼠标点击或再次搜索同一记录也会同步实际弹窗状态。全未标注名单仍可浏览。标记可见直径 32px、图形 20px、操作目标 44px；最高缩放继续聚合，spiderfy 间距倍率 1.6，保留来源坐标。实际正式补标和同义 key 规范化由数据任务负责。

针对性复核沿用既有入口，无新增 CLI：

```sh
rtk npm test -- tests/unit/restaurantPresentation.test.ts tests/unit/useFilters.test.ts tests/unit/dataTools.test.ts
rtk proxy env E2E_ARTIFACT_DIR=test-results/p08/browser node --test tests/e2e/visual-encoding.test.mjs
```

浏览器场景通过原始 catalog、正式 parser 和 releaseBuild 加载隔离新城与类别，验证四类/未知、组合筛选、两端详情、键盘/触摸、重合点和离线图标；开发证据与未验收范围见 [P08 tasks](../openspec/changes/p08-automatic-visual-encoding/tasks.md)。完整交付仍运行 `release:check` / `release:verify` 和既有缓存回滚检查。

## 排障

| 输出或现象 | 处理方式 |
|---|---|
| `EBADDEVENGINES` / `EBADENGINE` | 用 `node --version`、`npm --version` 核对实际执行版本，再切换到 `.nvmrc`；注意旧版本管理器链接可能指向其他版本。 |
| `npm ci` 报 manifest/lock 不一致 | 同时恢复匹配的 manifest/lock，或在有意更新依赖后重新生成并审阅锁文件。 |
| `ENOTFOUND` / registry 下载失败 | 修复网络或 npm registry 访问后重试 `npm ci`；这是未完成安装。 |
| `vitest` / `eslint` / `vite` 未找到 | 在仓库根目录、受支持环境中执行 `npm ci`。 |
| `No test files found` | 修复 include/filter 或测试路径；不能添加 `passWithNoTests` 绕过。 |
| Chrome executable 未找到 | 在当前 checkout 执行 `npm run browser:install`。 |
| 预览仍显示上一构建 | 等待新 Worker 安装完成，关闭该 origin 下所有页面后重新打开；按下文发布/回滚流程核对构建身份，不以清空缓存作为升级流程。 |
| `UPSTREAM_GATE_MISSING` | 必需 script 被移除或候选不完整；恢复正确版本的命令定义，不能用空命令或无条件成功替代。 |
| 没有地图瓦片但控件存在 | 核对外部瓦片网络；字体/瓦片失败不应产生 `L` 或插件未定义错误。 |

## P06 可访问性与跨端复跑

在上述 Node/npm 环境下，既有 `npm run test:e2e` 现在同时运行 Chromium 与 WebKit 的 P06 场景。首次准备浏览器：

```sh
npm run browser:install
E2E_ARTIFACT_DIR=test-results/accessibility npm run test:e2e
```

定向调试（该文件自行构建隔离 fixture，不依赖事先运行 dev server）：

```sh
E2E_ARTIFACT_DIR=/tmp/foodie-p06-evidence node --test tests/e2e/accessible-interface.test.mjs
npm test -- tests/unit/accessibleControls.test.tsx
```

WebKit 在 macOS 默认键盘偏好下使用 Option+Tab 遍历全部控件；Chromium 使用 Tab。自动场景包含实际键盘、鼠标和 CDP touch 输入；仅 HTTP、定位与发现模块为受控边界。正式餐厅 JSON 不写入测试数据。

原生 200% 页面缩放另需 GUI 和完整 Chrome for Testing：

```sh
npx puppeteer browsers install chrome
E2E_ARTIFACT_DIR=/tmp/foodie-p06-zoom node tests/e2e/page-zoom.mjs
```

该脚本在临时 profile/扩展中调用 Chrome 原生 `tabs.setZoom`，确认实际比例、布局视口并截图；退出清理临时资源。窗口可能受显示器可用高度限制，JSON 的 `heightCapped` 必须保留，不得把目标高度当成实测值。完整 Safari、真机软键盘及完整 768×1024 原生 200% 缩放仍待补验。屏幕阅读器专项已按用户最新范围跳过，不记为通过，也不再要求执行；依据见 [P06 交付记录](../openspec/changes/p06-accessible-responsive-interface/tasks.md)。

## 发布候选、升级与回滚

以下命令只在本地检查和打包，不会部署。使用 `.nvmrc` 的 Node、npm 11 和 Python 3.11 以上版本运行：

```sh
npm ci
npm run browser:install
npm run release:check
npm run release:verify
```

`release:check` 的证据写入 `test-results/release/`，可用 `-- --output <目录>` 改位置，后续 verify 使用同一位置。只有 check、test、check:coverage、build、test:e2e、test:performance 六阶段全部退出 0 才生成 `verified.json`；失败时删除旧凭据。`dist/release.json` 记录 VERSION、源码输入摘要、锁文件摘要、正式发现/数据修订及最终 JS/CSS/HTML 字节摘要。源码摘要包含覆盖文档、递归 catalog 本地来源引用和快速集执行的 boarding 脚本。`verified.json` 记录完整产物清单和实际命令；verify 确认浏览器检查前后的 `dist` 没有变化。通过本地自动门禁不表示独立验收完成，也不授权部署。

GitHub Actions 的 PR/main 检查一致。Pages 上传位于检查成功之后，deploy job 只消费该次上传的产物，不再构建。不要为测试门禁触发生产部署。远端 CI 是否执行成功必须单独记录，本地演练不能代替远端结果。

维护者发布时保留通过检查的整个 `dist` 和对应凭据，包括 `release.json`、`sw.js`、全部 assets、不可变数据和旧 JSON 路径。以这份完整产物作为 A；下一份完整产物作为 B。恢复 A 时复用原产物，不重新编译，也不拼接两份目录。若发布平台无法原子替换目录，安装摘要不一致的新 Worker 会失败，已安装客户端保留旧壳；初次访问者仍可能受不完整部署影响，因此先完成产物上传再切换发布指针。

本地重放使用既有浏览器入口：

```sh
npm run build
E2E_ARTIFACT_DIR=/tmp/foodie-p07-replay node --test tests/e2e/release-cache.test.mjs tests/e2e/release-flow.test.mjs tests/e2e/release-rollout.test.mjs
```

该重放自行构建隔离 A/B fixture，保留同一浏览器的旧页面、Worker 和缓存，再切换本地 HTTP 根目录。A 页面继续操作并加载真实移动异步模块；关闭旧页面后 B 接管；B→A 同样等待旧页面关闭。每阶段检查 `.dataset-status` 的 `data-build`、`data-revision`、当前城市/年度、详情和 `/release.json`。版本提示的 title 也提供简短构建标识。单纯看到新的 VERSION 字符串不足以判定升级完成。

回退条件包括必需门禁失败、壳/数据摘要不一致、关键流程回归或性能预算超限。回滚到已保留的 A 后验证 A 身份、访问过的数据集、在线/离线搜索与详情，再决定是否恢复发布。Worker 保留当前与上一构建的应用缓存，仅清理 Foodie Map 自己的旧命名空间；无需猜测或清空浏览器其他应用缓存。新 Worker 不强制抢占旧页面，新页面在旧 Worker 活跃期间仍获得旧壳，界面提示关闭本应用所有页面后重开。

离线只支持已缓存应用壳和访问过的匹配数据集。首次安装会缓存全部应用 JS/CSS（含延迟加载模块），不会预取所有城市/年度。不可变数据地址由 P02/P03 校验通过的正式 catalog、年度数据和 taxonomy/mappings 生成；同一 catalog 同时随应用构建，Worker 和页面复核资源摘要，防止旧载荷进入新上下文。缺失瓦片与餐厅数据缺失分别显示。HTTP 不可达但 OS 仍报告联网时，也显示真实缓存/离线状态。网络请求及响应体完成最多等待4秒，随后中止并尝试匹配缓存；未缓存项明确失败，恢复联网后可重试。

P03 年度迁移与 P04/P05 正式发现联调已完成，旧 JSON 地址固定派生自 catalog 指定的年度，校验会拒绝不一致的副本。BC-01 退役政策仍待决，不承诺永久兼容。当前内容的 11 份历史名单为 unverified，东京两份为 partial；这是如实记录的资料边界，不因门禁成功改成名单完整。P05 新增按 catalog 选择底图，东京已从高德切到 GSI 标准图；历史在线取证已清理，当前覆盖和精度需按数据接入指南重新抽检。大陆/香港/澳门独立数值与物理精度仍缺证据，东京地图参考也不等于全部餐厅或实地 GPS 精度通过。P06 剩余人工范围、远端 CI 与独立 G1–G4 判定必须另外完成。

## 性能与故障演练

先构建，再单独运行性能脚本，避免与其他浏览器集并行争用机器：

```sh
npm run build
npm run test:performance -- --output /tmp/foodie-performance.json
npm run test:gates -- --output /tmp/foodie-gate-failures
npm run test:gates -- --positive --output /tmp/foodie-gate-complete
```

性能使用锁定 Chromium、390×844、4× CPU、10 Mbps/40 ms；外部瓦片/字体是固定响应。自动发现当前最大数据集，与种子 `7042026` 的 1000 条合法 fixture 分别冷导航 5 次；Worker 正常安装，JS gzip 包括页面、异步模块与实际请求的 Worker/预缓存代码。原始 LCP/CLS、资源和 20 次输入/筛选样本全部保留；交互完成由目标可见结果和地图点数决定，再跨两个动画帧，p95 用 nearest rank。报告是实验室结果，不是用户 INP/p75。

故障脚本按同一源码输入清单创建隔离副本，包含递归来源引用和测试工具，不依赖 Git。副本仅共享当前 checkout 的 node_modules；正式 catalog 和 `check:coverage` 原样运行。`--positive` 跑完整健康管线，再改写已验证 JS 证明 verify 失败，恢复原字节后通过。干净安装按本文开头从当前 checkout 执行，不能以共享依赖的故障副本代替。

## 源码、数据输入与临时输出

持续开发使用当前 Git 版本；新增覆盖按[数据接入指南](data-onboarding-guide.md)和[来源 runbook](../docs/runbook/runbook-260507-1013-valid-data-source-guide.md)执行。P01–P07 历史日志、截图、迁移现场和候选压缩包已清理，接手时不需要恢复这些材料。旧测试次数或截图不证明当前版本通过；运行本轮所需检查即可。

- 当前数据所引用的来源材料和校准夹具是正式输入，随源码维护。地图抽检夹具为 [map-anchors.json](../tests/fixtures/map-anchors.json)，不包含旧地图截图或测量结果。
- E2E、发布检查和性能结果默认写入 `test-results/`；采集任务原始输出放入被忽略的 `eval/sessions/<session>/outputs/` 或临时目录。完成本轮排障后可删除，下一次检查会重新生成。
- `openspec/changes/*/evidence/` 已退役并被忽略；规格目录保存要求和任务状态。不要把历史输出写回规格目录，也不要把候选源码重复打包进 Git。
- GitHub Actions 的运行 artifacts 保留 7 天，供本轮排障；无长期归档要求。`verified.json` 仅用于核对同次检查的产物，清理它之后再次发布需要重新运行检查。
- 入库单文件上限为 **1,000,000 字节**。`npm run check:repository` 检查工作区、暂存内容；`npm run check:repository -- --staged` 可用于提交前检查。CI 还检查本次新增历史对象，防止“大文件先提交、随后删除”留在 Git 历史。被忽略的原始输出也不能通过强制添加入库。

临时需要把尚未提交的当前源码放到隔离目录检查时，可使用现有 `release:snapshot`；完成当次检查后删除快照，不维护历史候选库：

```sh
npm run release:snapshot -- --output /tmp/foodie-source
mkdir /tmp/foodie-clean-replay
tar -xzf /tmp/foodie-source/candidate-source.tar.gz -C /tmp/foodie-clean-replay
cd /tmp/foodie-clean-replay
# 使用 .nvmrc 对应 Node，按本文开头安装和检查当前源码。
```

常规升级/回滚测试由 `release-rollout.test.mjs` 自行构建隔离 A/B fixture，不依赖已删除的开发预览包。确有两份当前待检查的完整产物时，`release-candidate-replay.mjs --before <A目录> --after <B目录> --output <临时目录>` 可按需使用；不要求保留旧候选才能继续开发。
