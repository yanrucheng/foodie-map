## 1. 环境与基线

- [x] 1.1 核验运行环境和依赖 engines，记录支持版本与当前失败原因；验收对应 P01-R1。
- [x] 1.2 在干净安装环境重放现有快速测试，修复启动/隔离问题或记录下游负责的局部例外；验收对应 P01-R1、P01-R4、P01-R5。

## 2. 构建与检查入口

- [x] 2.1 将地图代码与必要样式纳入锁文件/构建，验证插件单例协作；验收对应 P01-R2。
- [x] 2.2 建立统一 check/test/build 入口，Makefile 调用相同实现；注入故障确认非零退出；验收对应 P01-R3、P01-R4。
- [x] 2.3 取消空测试报绿，按快慢层次整理测试执行边界并记录时长；验收对应 P01-R3、P01-R5。

## 3. 运行文档与交接

- [x] 3.1 在 readme 中给出环境、安装、运行、检查、生产预览和排障入口；由干净 checkout 重放；验收对应 P01-R1、P01-R4。
- [x] 3.2 在生产预览禁用运行时代码 CDN 和外部字体/瓦片，提交启动证据；验收对应 P01-R2。
- [x] 3.3 提交命令合同与下游需移除的例外清单，补充本包设计中的具体环境/导入选择；验收对应 P01-R1–P01-R5。

## 4. 验收记录

- [x] 4.1 开发 Agent 按下表提交证据及上游/实现提交信息。
- [ ] 4.2 验收负责人逐项复核 P01-R1–P01-R5，填写判定后才确认本包完成。

| 要求 | 开发证据与实际结果 | 验收负责人判定 |
|---|---|---|
| P01-R1 | 无 node_modules/dist 的源码快照执行 `npm ci`：0，3.84 s，锁文件 SHA256 前后相同；`check`、25 条快速测试、`build` 均为 0。`dev`/`preview` 启动后 HTTP 200，随后受控停止。Node 26 和损坏锁文件分别以 `EBADDEVENGINES` / `EUSAGE` 失败。见[环境](evidence/environment.json)、[干净安装](evidence/clean-install.log)、[启动](evidence/dev-preview.log)、[故障](evidence/failure-injection.log)。 | 待验收 |
| P01-R2 | `npm run browser:install`：0；`E2E_ARTIFACT_DIR=… npm run test:e2e`：0，3/3 场景通过。生产场景阻断所有外部 HTTP，实际拦截 25 次字体/瓦片请求；本地引擎、聚合、热力图像素、模式切换、筛选和搜索均正常，pageErrors=[]。见[浏览器日志](evidence/browser.log)、[网络与运行状态](evidence/bundled-runtime.json)、[标记截图](evidence/runtime-marker.png)、[热力图截图](evidence/runtime-heat.png)。 | 待验收 |
| P01-R3 | `npm run check` 的类型注入退出 2、规范注入退出 1；`npm test` 的断言失败/空集合均退出 1；坏 Vite 配置使 `npm run build` 退出 1。每次恢复后，同一入口回到 0。见[故障 diff、实际命令与输出](evidence/failure-injection.log)。 | 待验收 |
| P01-R4 | `npm run check` / `make check`、`npm test` / `make test`、`npm run build` / `make build` 全部成功；类型、断言、空集合和构建故障也分别通过 npm/Make 拦截。Make 失败通常归一为 2，底层输出与检查集相同。见[检查/构建](evidence/checks.log)、[快速集](evidence/fast-tests.log)、[故障](evidence/failure-injection.log)。唯一临时例外及接收责任见下文。 | 待验收 |
| P01-R5 | 9/11/5 条测试分别单独通过；全套 25/25，Vitest 433 ms（npm 总耗时 0.785 s）；固定 shuffle seed 101/202 均 25/25，444/443 ms。正常退出，无强制 `process.exit` 或遗留服务；浏览器集独立，最终 runner 4.78 s，含构建总耗时 5.97 s。见[快速集与顺序](evidence/fast-tests.log)、[浏览器](evidence/browser.log)、[资源清理观测](evidence/environment.json)。 | 待验收 |

## 5. 工作树与环境

- 上游/基线：`fb7c22e50ea543a6d362092a2332aef9c78aebbe`；P01 无上游 Packet 前置。
- 实现保留在当前工作树，未创建实现提交。已验证实现指纹：`93408dd6b9a698f863e2bc9007bb8def797030084d3a3cd7ae26a8b4d2b1f5cb`。重放来源是 HEAD 加当前工作树导出的 160 个文件，目录 `/private/tmp/foodie-map-p01-s894ofjv/clean-oja54teq` 起初没有 node_modules/dist；安装未借用工作区或个人目录的模块。具体文件及产物哈希见[源码清单](evidence/source-manifest.json)。运行验证完成后，仅回填本包 OpenSpec 交接记录和证据。
- 验证环境：macOS 26.4.1 arm64，Node 24.21.0，npm 11.19.0，Python 3.14.0；项目声明 Node `>=24.11.0 <25`、npm 11、数据工具 Python `>=3.11`。224 个依赖 Node engines 在 24.11.0 和 24.21.0 上均满足；实际执行使用 24.21.0。
- `.nvmrc` 固定 24.21.0。机器默认 Node 26.7.0，且本机 `node@24` 链接实际指向 26；验证使用独立安装的 Node 24，不依赖该错误链接。命令日志中的 PATH 选择为 `/private/tmp/foodie-map-p01-s894ofjv/runtime/node_modules/.bin`，其余运行条件按[运行说明](../../../readme/development.md)。
- 锁文件 SHA256：`6bb5816a2d056b684e463534468f23cd9c1be84dbbc586f61f913adbcd1cf36b`，干净安装前后相同。新增地图/类型/规范工具依赖；既有包版本变化仅 `@types/node` 25.6.0→24.13.4、配套 `undici-types` 7.19.2→7.18.2，以及 npm 在 `puppeteer → cosmiconfig → js-yaml ^4.1.0` 的允许范围内重解的 js-yaml 4.1.1→4.3.2。React/Vite/Vitest/jsdom/Puppeteer 保留基线锁定版本。
- 初始基线安装曾因沙箱 DNS 拒绝失败，联网重试后原 25 条测试、构建均通过；见[基线](evidence/baseline.log)。浏览器在默认沙箱因本地监听 EPERM 失败，获得本地服务执行权限后重放。普通 Chrome headless 在最小按钮页面不产生动画帧，官方 Headless Shell 同版本正常；最终使用 HeadlessChrome 147.0.7727.57，桌面 1280×800、移动 390×844。
- 58 个已有数据、P01 验收合同、其他 Packet 和规划输入与初始工作区逐字节一致，详见环境记录。未改变餐厅文件、catalog、业务选择模型或生产站点。

## 6. 失败注入和恢复

全部注入发生在上述隔离源码快照。每个注入都有恢复步骤；最终源码与工作区一致，锁文件一致，无残留故障文件。完整 diff 与 stdout/stderr 在[故障日志](evidence/failure-injection.log)。

| 注入 | 实际入口 | 故障退出 | 恢复结果 |
|---|---|---|---|
| 临时 TS 文件把字符串赋给 number | `npm run check` / `make check` | 2 / 2，TS2322 定位到文件 | 同入口 0 / 0 |
| 临时 TS 文件使用显式 any | `npm run check` | 1，`@typescript-eslint/no-explicit-any` | 0 |
| URL 行为断言把预期年份 2024 改为 2099 | `npm test` / `make test` | 1 / 2，定位断言 | 0 / 0 |
| Vitest include 指向不存在的快速测试目录 | `npm test` / `make test` | 1 / 2，`No test files found` | 0 / 0 |
| Vite 配置抛出明确错误 | `npm run build` / `make build` | 1 / 2，输出配置原因 | 0 / 0 |
| 切换至 Node 26.7.0 | `npm ci --offline --no-audit --no-fund`、`npm run check` | 均 1，EBADDEVENGINES 显示实际/所需版本 | 切回 Node 24，check 为 0 |
| 把锁文件 Leaflet 版本改为 0.0.0，manifest 仍为 1.9.4 | `npm ci --offline --no-audit --no-fund` | 1，EUSAGE 明确指出版本不一致 | 同入口 0，随后 check/test/build 均 0 |

## 7. 改动责任和下游约定

- `package.json` 是命令实现的权威入口。`check` 管类型/规范，`test` 管确定性快速行为，`build` 管生产产物；Make 仅转调。工作流只调整 Node 来源并补上 `check`，保持原构建包含的类型门禁，完整 CI 留给 P07。
- `src/lib/leaflet.ts` 负责核心/聚合/heat 和三份 CSS 的加载；业务代码显式导入，正式 `@types` 替代手写 CDN 声明，移除 `allowUmdGlobalAccess`。P05 保持这个单例入口，负责地图/定位生命周期。
- 快速集分类：cuisineRegistry 是 Node 纯逻辑；useFilters 是 jsdom 中的 React 行为；urlState 是 jsdom 中的真实 History API 行为。清理 timers/mocks/globals/env，Hook 显式 cleanup，URL 写入后恢复。上述时长是本机采样，发布性能预算由 P07 定义。
- `test:e2e` 自行启动动态端口生产预览，独立浏览器上下文使用测试 fixture，所有外部 HTTP 被阻断；以 finally/after 清理。测试目录不会进入发布数据。服务 worker 在这些 fixture 场景被绕过，P07 单独验证缓存升级、离线和回滚。CLI 的 dev 启动验证读取 Vite 实际输出的可用端口，没有使用预先运行的服务。
- P02 添加真实 `npm run validate:data` 并扩展现有检查/测试；P03 接入数据发现与对账；P07 组合现有入口，避免复制配置。当前无占位 `validate:data`。

### 唯一临时规范例外

[MapShell.tsx](../../../src/components/MapShell.tsx) 第 209 行（地图初始化 effect 的依赖数组）单行禁用 `react-hooks/exhaustive-deps`，对应 **P01-R4-S2**。当前定位回调每次渲染都变化，直接扩展依赖会重建地图；**P05-R4/R5** 接收稳定回调、验证重建/清理、移除例外的工作，最终发布前清零。没有全局规则关闭、全局 any 或测试目录跳过。

另两处规范修复保持行为：`useLocationTracking` 补入稳定的 mapRef 依赖；`gcj02.ts` 缩短数值字面量，`Object.is(0.00669342162296594323, 0.006693421622965943)` 返回 true，不涉及坐标规则修订。

## 8. 待验收及已知限制

- 本包开发任务和开发证据已完成；4.2 及所有验收判定保持待验收，由主线程复核。
- 上述 P05 单行例外尚未移除，原因与接收要求已明确；地图服务完整反馈、空间规则及位置权限场景仍由 P05 实现。
- `npm audit --json` 退出 1：15 项（11 high、3 moderate、1 low），每项对应的包版本均与基线相同；`npm audit --omit=dev --json` 退出 0、生产依赖 0 项。见[全量审计](evidence/dependency-audit.json)、[生产审计](evidence/production-dependency-audit.json)及环境记录中的基线逐项对比。开发工具链升级交由主线程/P07 安排，部分 Puppeteer 修复涉及主版本升级；这次未把它并入工程入口改动。
- 没有运行会改写覆盖表的 `npm run readme`、数据转换/迁移或生产发布；覆盖和数据行为分别属于 P02/P03，发布属于 P07。P01 没有未执行的 MUST 场景，但这里的浏览器证据不替代下游完整产品验收。

总体规则见[总计划](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)，验收合同保持[spec](specs/frontend-engineering/spec.md)原文。
