# P09 开发与验收任务

本地框架及完整开发者门禁已完成；正式数据尚未补标，独立验收未执行。语义见 [design](design.md) 与 [runbook](../../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md#p09-labeling)，验收编号见 [spec](specs/dining-experience-markers/spec.md)。本文件是开发证据与独立验收的唯一入口。

## 1. 字段、展示与价格

- [x] 1.1 读取当前工作区，登记并保护正式数据与既有未提交修订；确认新字段尚未补标的真实范围。（P09-R1、R9）
- [x] 1.2 在既有 schema 增加 dining_category 和同源类型，覆盖合法、缺省/null、非法值；保留原 serving_form/venue_type 含义与校验，不建立转换/双写。（P09-R1）
- [x] 1.3 在共享纯展示模块实现八项固定图形/名称/顺序及通用缺省表现，提取本地素材并保留许可；沿用既有颜色算法。（P09-R2）
- [x] 1.4 实现共享 price_range 等级解析、¥ 符号输出和 missing/unrecognized；不生成缺价角标，保留实际价格与原文。（P09-R3）

## 2. 应用消费者

- [x] 2.1 扩展 restaurantFacts 并贯通 React/Leaflet 详情、accessible name 和图例；无数据 HTML 覆盖入口。（P09-R2、R3、R5、R8）
- [x] 2.2 用主打体验替换现有形式筛选，保持与菜系 AND、全收录计数、other/未标注区分、搜索揭示及切版清理。（P09-R5）
- [x] 2.3 实现价格右上、NEW 下方、选中/焦点外圈共存；验证四符号、窄屏、放大、键盘/触摸和同坐标 spiderfy，不修改位置规则。（P09-R4）
- [x] 2.4 聚合、统计与热力图继续消费同一过滤结果；混合聚合无代表图标和价格，整份未标注仍正常可用。（P09-R4、R5）

## 3. 工具与接入路径

- [x] 3.1 扩展现有 validation/data-contract 文本与 JSON 汇总，保留旧统计，增加新类别、未标注、价格、分榜单最大组和正确分母。（P09-R6）
- [x] 3.2 验证既有 boarding 只改 cuisine_group，新字段/价格原值透传，dry-run 与失败保持输入/输出；不添加隐式分类器。（P09-R7）
- [x] 3.3 按 runbook 用隔离的新城市/年度正式 catalog 做接入演练，提交字段对账、分布及剩余证据缺口；不改生产城市分支。（P09-R7）
- [x] 3.4 更新接入指南、来源 runbook、开发指南与 cuisine-boarding 文档的实际支持状态、命令示例和同一入口；撤下仅针对 P09 的“代码待实现”提示。（P09-R7、R9）

## 4. 验证与交接

- [x] 4.1 更新受影响的旧四类 UI 测试为新语义；保留旧字段合法性、颜色稳定性、身份/坐标/安全回归。以隔离夹具覆盖八类、缺省、非法、四价、缺价、其他符号及非标准价格。（P09-R1–R8）
- [x] 4.2 运行有针对性的快速检查；最终使用既有 release:check 与 release:verify 验证同一产物，覆盖合同/覆盖摘要/构建/浏览器/性能和 A→B→A 离线升级，不重复构建凑验证次数。（P09-R8、R9）
- [x] 4.3 对正式数据原有字段和原始工作区做逐记录/文件对账，交付真实新字段缺失量；不将 preview.html 数据作为正式补标。（P09-R9）
- [x] 4.4 开发 Agent 在下表登记实现位置、实际命令/结果与产物；临时输出放被忽略的 test-results/ 或临时目录，不放本目录 evidence/。（P09-R9）
- [ ] 4.5 验收负责人独立判定 P09-R1–R9；开发者自测不代签通过。无推送/部署/正式补标授权时仅交付本地实现与证据。（P09-R9）

## 开发证据与独立结论

| 合同 | 开发证据 | 独立验收 |
|---|---|---|
| P09-R1 字段与历史事实 | contract.ts 增量 schema 与同源类型；restaurantPresentation/dataConsumers/dataTools 测试覆盖八值、缺省/null、非法路径和可恢复错误；42 份正式文件基线对账通过 | 未验收 |
| P09-R2 图标与稳定颜色 | restaurantPresentation.ts 穷尽八类映射，本地 Tabler/Lucide/自绘 SVG 与许可；React/Leaflet 同源，既有 360 色相对比与跨上下文稳定性断言保留 | 未验收 |
| P09-R3 价格角标 | parsePriceGrade + restaurantFacts；Unicode Sc/NFKC、同符号 1–4、缺省及恶意/非标准文本；真实价格/币种不变，缺价不创建元素 | 未验收 |
| P09-R4 标记交互 | visual-encoding 的 Chromium/WebKit × 1280/390：四符号、NEW、选中外圈、键盘/触摸、11 点展开；原生 200% 缩放已运行，实际视口限制见下方 | 未验收 |
| P09-R5 统一消费端 | useFilters/FilterPanel/Legend/restaurantFacts；八类计数含无坐标、其他含未标注，组合筛选/热力点数/搜索揭示/切版/全未标注；保留旧选择生命周期测试 | 未验收 |
| P09-R6 分布诊断 | validateDataset + 既有 data-contract.ts；每榜单八类+unclassified、四价+missing/unrecognized、最大组及 listed 分母；空名单 null；正式 JSON 与隔离 catalog 报告可对账 | 未验收 |
| P09-R7 单一接入路径 | 既有 visual fixture 扩展为两城×两年×两榜单，经原 catalog/parser/boarding/releaseBuild；dry-run、原值透传、失败保留输出；runbook/接入指南/开发指南/技能入口已更新 | 未验收 |
| P09-R8 离线与发布一致性 | 八类离线图形/价格及安全文本已通过；现有 release-rollout 加入 A/B 不同主分类/价格，保留整包、缓存、延迟模块和回滚断言；最终门禁结果见下方 | 未验收 |
| P09-R9 交接与数据边界 | 初始工作区快照、正式 42 文件 SHA-256 与 671 条逐记录字段清单；未写正式数据，未导出预览试分，未推送/部署；本文件只登记开发者自测 | 未验收 |

正式 dining_category 补标由后续数据 Agent 按 runbook 执行。设计时 671 条记录均无新字段；若交付时仍如此，应如实说明“框架可用，正式图标仍为通用表现”，不能把框架验收写成全项目数据升级完成。

## 本轮开发记录（2026-09-15，Asia/Shanghai）

### 代码及接入支持

- 字段权威仍是 `src/data/contract.ts`；八类/价格/颜色/诊断由 `src/config/restaurantPresentation.ts` 共享，未增加分类服务或第二份 taxonomy。图形只从已确认预览提取 SVG，许可放 `public/icons/`，预览 JSON 的餐厅试分没有作为输入。
- `src/data/display.ts` 为两端详情提供同一分类状态、价格等级和原文。`useFilters` 将主打体验和菜系作 AND，其他料理包含未标注；旧字段仅保留数据合同/诊断，不驱动新图标。
- 36px 圆底、21px 图形、44px 目标；价格右上、NEW 下方、外圈不影响颜色。扩展同坐标测试发现原 1.6 倍间距不足，调整 spiderfy 为 2.4；桌面弹窗自动避开搜索/控件，移动地图失败提示置于地图上缘。源坐标及定位规则没有改写。
- 现有 `validate:data` 同时输出文本/JSON 的分榜单分布。boarding 代码不需变更，仍仅映射 cuisine_group。接入指南、来源 runbook、开发指南和仓库技能入口已反映实际支持；P08 历史文档和源材料保留。

### 实际执行与证据

运行环境 Node `v24.21.0`、npm `11.19.0`，Python 标准库。实际 npm/node 命令前缀为 `rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH`；未使用系统 Node 26。浏览器服务在沙箱内遇到 `listen EPERM 127.0.0.1` 后获本地测试提权运行，不涉及发布。

| 命令（接上述 RTK/Node 环境前缀） | 本轮结果 | 本地证据 |
|---|---|---|
| `npm test -- tests/unit/restaurantPresentation.test.ts tests/unit/useFilters.test.ts tests/unit/dataTools.test.ts tests/unit/dataConsumers.test.tsx tests/unit/guideExperience.test.tsx tests/unit/mapLocation.test.tsx` | 6 文件 / 136 项通过 | 后续完整快速集也覆盖这些断言 |
| `npm test` | 15 文件 / 248 项通过 | [quick.log](../../../test-results/p09/quick.log) |
| `npm run check:types`、`npm run check:lint` | 类型通过；初次 lint 误扫了本轮保存的 .mjs 基线副本，副本改用 .snapshot 后通过 | [最终 check.log](../../../test-results/p09/release/check.log) |
| `node scripts/data-contract.ts --json` | 13 榜单、671 收录、652 可定位；0 error，14 既有位置维护 warning；正式新字段缺失 671 | [production-validation.json](../../../test-results/p09/production-validation.json) |
| `npm run readme`、`npm run check:coverage` | 来源 runbook 内容变化使派生输入摘要过期；重生成后表内全部范围/数字/状态保持不变，仅摘要更新 | 接入指南 coverage 区块及最终门禁日志 |
| `E2E_ARTIFACT_DIR=test-results/p09/browser node --test tests/e2e/visual-encoding.test.mjs` | 定向 11/11 通过；最终完整集还覆盖全未标注版次和价格角标实测对比 | [视觉记录](../../../test-results/p09/release/browser/p09-visual-encoding.json)、[catalog 校验](../../../test-results/p09/release/browser/p09-catalog-validation.json)、[boarding 对账](../../../test-results/p09/release/browser/p09-boarding-reconciliation.json) |
| `npx puppeteer browsers install chrome` | 安装锁定 Chrome for Testing 147.0.7727.57 到项目依赖缓存；manifest/lock 未改 | [chrome-install.log](../../../test-results/p09/chrome-install.log) |
| `E2E_ARTIFACT_DIR=test-results/p09/zoom node tests/e2e/page-zoom.mjs --dining` | 原生 tabs.setZoom/getZoom=2，四符号不截断，NEW/焦点/图形可见，44px 目标，九个按钮无横向溢出 | [原生缩放 JSON](../../../test-results/p09/zoom/p09-native-zoom.json)、[窄视口焦点截图](../../../test-results/p09/zoom/p09-native-200-768-focused-new-price.png) |
| `npm run release:check -- --output test-results/p09/release` | 通过：check、248 项快速测试、coverage、build、68 项浏览器测试、performance 六阶段均 exit 0 | [release.log](../../../test-results/p09/release.log) |
| `npm run release:verify -- --output test-results/p09/release` | exit 0：源码/锁文件/全部产物字节与凭据一致 | [verified.json](../../../test-results/p09/release/verified.json)、[verify 日志](../../../test-results/p09/release-verify.log) |

首轮完整门禁未通过：P06 的“甜品 1”、P07 的“餐食 1”仍指向旧形式控件（各影响两引擎）。已分别更新为夹具真实的“甜饮 1”“鱼鲜主打 1”，筛选结果、离线、错误态和恢复断言完整保留；没有跳过/放宽测试。首次结果保留在 [release-attempt1.log](../../../test-results/p09/release-attempt1.log)。定向过程还保留了原展开间距与控件遮挡的失败截图；这些失败不计作通过。

最终原生缩放采样请求为 1280×800 与 768×1024；本机窗口实际均被限制到 735px 高，缩放后分别为 640×367 和 384×367，DPR 从 2 到 4、visualViewport.scale=1。它证明实际原生 200% 的窄视口重排与标记组合，不声称完成完整 768×1024 的原生缩放、Safari 真机或独立人工验收。

### 正式字段保护与剩余数据任务

开工前保存 [初始状态](../../../test-results/p09/initial-status.txt)、[42 文件 SHA-256](../../../test-results/p09/baseline-data-sha256.json) 和已有修改副本。当前 [逐文件/逐记录对账](../../../test-results/p09/field-reconciliation.json) 确认全部 public/data 字节一致，因此身份集合、名称、原始 cuisine/cuisine_group、serving_form/venue_type、评级、新晋、价格/币种、坐标/定位来源及 catalog coverage/provenance/revision 均保留；东京年度文件和固定旧地址副本也逐字节一致。既有东京来源 session 文件及 P08 文档未改。补充到已有未提交文档的内容仅为支持状态、命令与本轮证据，不把此前东京改动记成本轮开发成果。

正式八类显式计数均为 0，unclassified=671；界面“其他料理”组为 671，最大图标组占比 100%。价格 1/2/3/4 档分别为 108/213/177/172，missing=1（KIBUN），unrecognized=0。源等级中的港澳 $ 和全角符号按统一等级展示，未改变源价或币种。价格组合更分散不代表主图标真实分布已改善。

| 年度/地区 | 星级待补 | 必比登待补 | 合计 | 覆盖声明 |
|---|---:|---:|---:|---|
| 2026 香港 | 77 | 70 | 147 | unverified |
| 2026 北京 | 32 | 26 | 58 | unverified |
| 2026 广州·深圳 | 20 | 44 | 64 | unverified |
| 2026 上海 | 51 | 35 | 86 | unverified |
| 2026 成都 | 13 | 未收集该榜单 | 13 | 已有星级 unverified |
| 2026 澳门 | 21 | 13 | 34 | unverified |
| 2026 东京 | 158 | 111 | 269 | partial（年度身份仍有 2/3 缺口） |
| 合计 | 372 | 299 | 671 | 不因框架通过而升级 |

每榜单价格计数、最大同图标同价位组及正确 listed 分母完整保存在 production-validation.json，未以城市合并遮蔽榜单差异。后续数据 Agent 须按同一 runbook 核实主打、保留来源和字段对账；不能把预览 413 条试分、东京旧 serving_form 或复合标签关键词直接转换。框架完成、正式补标完成、独立验收与部署分别判定；本轮未提交、未推送、未部署。

### 最终产物与门禁结论

- `release:check` 六阶段全通过，快速测试 15 文件 / 248 项，浏览器 68/68（0 skipped）。P09 专项在最终完整集中 11/11，Chromium 147.0.7727.57、WebKit 26.6；八类离线、全未标注版次、两城/两年度/两榜单及真实 Worker 路径均执行。
- 已对同一 `dist/` 运行 `release:verify`，退出 0；未在浏览器验证后重新构建或拼接产物。源码、锁文件及全部产物哈希由 [verified.json](../../../test-results/p09/release/verified.json) 保存。
- 价格文字实测对比 11.9368:1；三通道、NEW 和焦点/选择组合的几何及截图见最终视觉记录。性能 [performance.json](../../../test-results/p09/release/performance.json)：实际最大名单/1000 条夹具 LCP 中位数 692/684ms、CLS 均 0、最大 JS gzip 163912/159208 字节、20 次交互 p95=78ms，预算全部通过。该结果是受控实验室测量，不是用户 INP 或真实底图精度结论。
- `npm run check:repository` 和 `git diff --check` 通过。文档链接检查通过。临时证据均在被忽略的 test-results/p09/；没有新建本包 evidence/ 或平行发布流程。

构建 ID：`0008277264b93350c0abdc60bd7888b71d9852e1bda3b0b4f8d896b3fc6b270d`。产物 SHA-256：`49f73565ff1997d99f7b572a81339800e11117073220644fd8b841f95e329bb8`。

交接判定：**框架完成并通过本轮开发者自测；正式数据补标 0/671；P09-R1–R9 独立验收均未执行。** 4.5 留给接收方。既有名单完整性、完整窗口/真机人工范围、发布授权不因本轮本地通过自动完成。
