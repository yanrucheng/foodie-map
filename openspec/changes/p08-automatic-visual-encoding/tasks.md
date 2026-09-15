# 开发交接

本地框架实现已完成，开发验证与接收方独立验收分开记录。2026-09-15 首次选中同步问题已由接收方确认消除；本轮因桌面鼠标重复激活同一记录的 P2 边界退回。新修复及证据见末节，尚待接收方复验。先读 [design](design.md)，再按 [spec](specs/restaurant-visual-encoding/spec.md) 的 P08-R1–R7 验证；图形参考见 [preview](preview.html)。执行命令沿用仓库 Node/npm 环境、RTK 和既有发布入口。

## 1. 合同与共享展示

- [x] 1.1 保存工作树状态及正式餐厅/taxonomy/mappings 字节清单，核对上游 P02–P07 当前实现；不清理他人工作。（R7）
- [x] 1.2 增加可选 serving_form schema/type，保留旧 venue_type 原义；未知与非法分开；扩展统计并验证 boarding 透传。（R1、R6）
- [x] 1.3 用共享纯函数替换手写菜系颜色表，实现固定 key 哈希、OTHER、前景对比度和全色相验证。（R2、R6）
- [x] 1.4 接入四份 Tabler 静态 SVG 和许可，统一类型名称、图标及未知解析；React/Leaflet 共源，不引入远程图标。（R3）

## 2. 界面整合

- [x] 2.1 地图标记应用图标＋自动颜色，保持坐标锚点、选中/焦点/NEW、集群数字和离线素材。（R3、R5）
- [x] 2.2 替换旧类型控件，接通形式/类别组合过滤、未标注计数、全未知状态、搜索揭示与切换清理。（R4）
- [x] 2.3 更新两端详情、图例及标签说明，所有消费者共享语义；验证必要文字、键盘和触摸操作。（R3、R5）
- [x] 2.4 在密集/重合点验证 32px 可见标记、约 44px 操作目标及现有聚合/spiderfy；需要调整参数时记录实际理由。（R5）

## 3. 接入与验证

- [x] 3.1 将新字段与展示完整性接入现有 validate:data/check；保持缺失汇总、原 warning 和错误定位，加入必要的隔离故障测试。（R6）
- [x] 3.2 在隔离 catalog/原始数据中演练新城、新 key、四类、缺失、同类别不同形式与错误记录；业务源码无需为新城修改。（R1–R6）
- [x] 3.3 核对当前全部正式名单可加载、东京自动颜色，以及输入数据字节未被开发任务改变；记录未标注覆盖率但不补标。（R2、R7）
- [x] 3.4 在现有来源 runbook、接入指南和 cuisine-boarding skill 中启用/链接新规则，撤下本包“字段待实现”提示；命令仍只有既有入口。（R7）
- [x] 3.5 执行适用快速集、现有 check/release:check/release:verify 与受影响浏览器/缓存升级回滚演练，记录版本、视口、构建身份、命令和限制。（R7）

## 4. 交付与独立验收

- [x] 4.1 开发 Agent 在下表补充逐要求证据、改动归属、测试结果、数据未改对账；框架可完成，实际补标不得冒称完成。
- [ ] 4.2 由接收方/验收 Agent 复核 P08-R1–R7，给出通过或具体退回项。
- [ ] 4.3 实现与验收完成后再沉淀规格/归档；不把设计定稿、开发者自测或用户看过预览当作工程验收。

| 要求 | 开发证据 | 接收方判定 |
|---|---|---|
| P08-R1 数据语义 | contract.ts 的独立 nullish enum；restaurantPresentation/useFilters/dataConsumers 快速测试验证四类、缺省/null、所有旧 venue 值、非法数据错误态；P08 catalog/boarding 演练透传。 | 未验收 |
| P08-R2 自动配色 | restaurantPresentation.ts 的 FNV-1a/HSL；快速集覆盖 360 色相，浏览器实算最低白色对比度 4.933534:1；隔离双城/双年度/双榜单及异名异序同色；data-audit.json 记录东京缺色 56+76 家归零。 | 未验收 |
| P08-R3 图标与共享展示 | 单一静态 SVG 定义与 Tabler 3.46.0 MIT 许可；restaurantFacts 共享语义；Chromium/WebKit 两端图标/详情一致、离线饮品 SVG 路径可绘制、无远程图标请求；混合集群数字 6；本轮选中记录统一驱动详情/外圈，见末节。 | 首次同步问题已复核消除；重复激活修复待复验 |
| P08-R4 过滤与状态 | useFilters 交集、未标注 sentinel、搜索恢复和切版重置；全未标注快速测试；P08 浏览器检查 7 收录/6 定位、筛选 1/1 与 2/1、热力点数及区域统计，计数口径仍为整版收录。 | 未验收 |
| P08-R5 可读与可操作 | Chromium 147.0.7727.57 / WebKit 26.6，1280×844 与 390×844；axe、真实键盘/触摸逐选六个重合/邻近点，32px 标记/20px SVG/44px 不重叠目标；截图与 bounds 保存。 | 未验收 |
| P08-R6 自动化 | validate:data/check 检查全部引用 taxonomy（含未用组），输出四类及未标注统计；test:gates 的非法形式、缺图标、坏 SVG、失效颜色均在构建前失败并撤销旧凭据；boarding/dry-run 输入不变。 | 未验收 |
| P08-R7 接入与交付 | runbook、原接入/开发指南和 cuisine-boarding skill 已启用；42 文件字节基线及对账在 test-results/p08；完整发布和实际旧/新产物回滚结果见下方命令记录。 | 未验收 |

数据 Agent 独立负责：门店 serving_form 来源标注、既有同义 key 规范化、原映射语义修订及每次年度数据变更的对账。不得把这些任务通过 UI 兜底或 boarding 自动猜测完成。

## 本地开发记录（2026-09-14，开发者自测完成）

起始 HEAD 为 `c09341f89c7615ea0e8f36e78bf8b8b407a04403`，工作树为空；无其他任务改动需要合并。Node `24.21.0`、npm `11.19.0`；未新增运行时依赖，未修改 package-lock、VERSION 或正式数据。

### 实现归属与局部取舍

- `src/data/contract.ts`：可选 serving_form 的唯一字段合同，原 venue_type 独立保留；禁止记录用 color/icon/svg 覆盖展示。
- `src/config/restaurantPresentation.ts`：取代 cuisineRegistry 的唯一配色与形式图形定义；无 DOM/React/Vite raw 依赖，可供 Node 校验调用。图形采用定稿允许的静态路径字符串，共享给 React 和 Leaflet；许可在 `public/icons/tabler-LICENSE.txt`。
- `src/data/display.ts`、`src/hooks/useFilters.ts` 与原组件：共享两端事实、形式/类别交集、未知计数、搜索恢复、图例解释及触摸/键盘标记。四类的显示顺序固定，按钮只出现于整版实际存在的形式。
- `src/data/validation.ts`、`scripts/catalog.ts`、`scripts/data-contract.ts`：复用既有数据检查/汇总，保留完整 raw、引用、OTHER、位置等原规则。
- 地图保留最大缩放聚合，`spiderfyDistanceMultiplier=1.6` 使六个邻近/重合夹具的 44px 操作目标不重叠；来源坐标及投影不变。新增标签使原桌面 popup 太窄、关闭按钮被搜索框遮挡，故在桌面恢复 240px 最小内容宽度；实测关闭及逐点键盘操作通过。
- 既有 P04/P06/P07 测试 fixture 显式增加模拟 serving_form；性能夹具按新字段筛选，保留原 1000 条及预算。未从正式旧类型生成任何新标注。

### 数据边界与对账

[起始逐文件清单](../../../test-results/p08/baseline-data.json)保存 `public/data` 全部 42 文件的字节数/SHA-256，覆盖 13 年度名单、旧地址副本、14 份 taxonomy/mappings 与 catalog。清单自身 SHA-256：`cf014337cdf82669ddbd67b1b374772d47d34a0b107259e09dd601f2e9699e84`。

[正式数据复核](../../../test-results/p08/data-audit.json)：42/42 文件相同，difference=[]；13 名单、671 收录、652 可定位、0 missing cuisine、0 unmapped、13 explicit OTHER，14 条既有重复坐标 warning。四类分别 0、0、0、0，未标注 671（100%）；不是框架失败，也不代表真实标注完成。东京星级 157、Bib 111 条可定位数据中，旧手写表分别造成 56、76 条非 OTHER 灰色；当前两份均为 0。20 个东京分组均有样式。

本包更新 runbook 的本地支持说明，使 catalog 所引用的该文档字节变化；按原 `npm run readme` 刷新接入指南中的覆盖摘要。名单条数/状态和 public/data 字节均未因此改变。

### 命令与证据

执行入口均带 RTK。产物/日志在被忽略的 `test-results/p08/` 或 `/tmp`，不将它们加入正式数据或 Git；接收方可在当前工作区直接读取。

| 命令 | 开发者结果 / 证据 |
|---|---|
| `rtk npm run check` | 类型、Lint、13 份正式数据通过；最终完整门禁已重复通过。 |
| `rtk npm test` | 210/210 通过（15 文件）；包括 360 色相、合法/非法字段、全未标注、展示共源、boarding 及真实 Leaflet teardown 回归。 |
| `rtk npm run validate:data` | 通过，数据汇总见上方 data-audit.json；无数据写入。 |
| `rtk npm run readme` / `rtk npm run check:coverage` | 更新文档引用导致的摘要后通过，未修改任何名单。 |
| `rtk proxy env E2E_ARTIFACT_DIR=test-results/p08/browser node --test tests/e2e/visual-encoding.test.mjs` | 5/5 通过。原始 catalog→正式 parser→releaseBuild；JSON 命令输出、board/dry-run、源码前后清单、双引擎/双视口截图和 360 色相浏览器值见 [P08 浏览器记录](../../../test-results/p08/browser/p08-visual-encoding.json)。 |
| `rtk npm run test:gates -- --output test-results/p08/gates` | 9/9 预期故障通过；四项 P08 故障加原有数据、覆盖、类型、行为、首个浏览器失败证据。见 [故障摘要](../../../test-results/p08/gates/summary.json)。 |
| `rtk npm run release:check -- --output test-results/p08/release` | 六阶段全部 exit 0：check、test、check:coverage、build、test:e2e、test:performance；浏览器 61/61 通过、0 skip。见 [verified.json](../../../test-results/p08/selection-fix/previous-release/verified.json)。 |
| `rtk npm run release:verify -- --output test-results/p08/release` | exit 0，确认源码及完整产物字节未改变；见 [verify 日志](../../../test-results/p08/release-verify.log)。 |
| `rtk proxy node tests/e2e/release-candidate-replay.mjs --before /tmp/foodie-p08-baseline-dist-260914 --after dist --output test-results/p08/candidate-rollout` | 1/1 通过；旧页继续读取 A 的延迟模块，关闭旧页后 B 接管，B 离线可用，回滚恢复同一 A，未清缓存或重编 A；两份产物前后字节均一致。见 [回滚摘要](../../../test-results/p08/candidate-rollout/summary.json)。 |

2026-09-14 初次提交的历史门禁构建身份（已由本轮修复候选替代）：

- A（起始 HEAD，VERSION 0.3.0）：`bb9e0c76d1baa6a5e55bf88643a909f50f3fa6a2d0c6a3d03fa8a752d1589631`，完整产物保留于 `/tmp/foodie-p08-baseline-dist-260914`。
- B（初次提交，VERSION 0.3.0）：`2a443b2eca4c95eff220404718b89b83c92152a8a897f6946a79b820528e94c0`，完整产物已保留于 `/tmp/foodie-p08-before-selection-dist-260915`。
- 两者 dataRevision 同为 `2924a3b035f30679b5135737b32a11e1f81eecfcd156cb22953d082c5fb37022`。B 的源码摘要 `040702d958a933886e49ebdeddec5ebafe4420efc83f0748f42155114efabcf7`，完整产物摘要 `f3c01c93c0ee5623f7665c57d0e6ac8076ad1019733becb651f7248f2cfa3a53`。
- [性能记录](../../../test-results/p08/selection-fix/previous-release/performance.json)：正式最大名单/1000 条夹具各 5 次；LCP 中位数 688ms / 684ms，CLS 均 0，JS gzip 最大 161845 / 157281 bytes，20 次交互 P95 74.3ms，预算通过。Vite 的 >500kB 原始 chunk 提示仍存在，未抬高预算或关闭告警。
- 最终 P08 双引擎/明暗底板/选中态证据亦在 [完整门禁 P08 记录](../../../test-results/p08/selection-fix/previous-release/browser/p08-visual-encoding.json)；最终数据文件集合对账见 [final-data-reconciliation.json](../../../test-results/p08/final-data-reconciliation.json)。`check:repository` 与 `git diff --check` 通过。

浏览器安装的 Node 下载器在多个官方 URL 超时；curl 从同一锁定官方 URL 下载 WebKit 2359（26.6）并解压到文档规定的项目缓存，实际 WebKit 已运行通过，不以安装占位代替浏览器测试。最初沙箱不允许绑定 127.0.0.1，经环境批准后使用本地动态端口。旧源码/构建最初放在 test-results 中被 ESLint 扫到，已移至 `/tmp`，未修改门禁规则。其余首次失败与修复：测试读取 SVG 换行空白、未等待 spiderfy 动画完成、桌面 popup 关闭按钮遮挡；前两项修正观察方法，最后一项修复产品布局并复测。完整门禁追加的选中态断言还发现 Leaflet click 内部 popupclose 会擦掉新外圈，已改为 popupopen 后设置外圈，保留断言复核。另一次快速切版出现 `_leaflet_pos` 错误，已用真实 Leaflet `_animateZoom` 的 250ms 完成回调在快速测试中确定性复现：remove() 未清除 `_animatingZoom`，旧回调访问已删除 pane。MapShell teardown 在 remove 前撤销该状态，20 项 mapLocation 回归通过；不修改依赖库或缩放行为。

### 接收方复核与剩余边界

1. 先读本文件、design、spec，核对实现归属、正式数据字节清单和 `git diff -- public/data`；不补写数据来制造四类覆盖。
2. 运行上表快速入口、P08 浏览器、完整 release:check / release:verify；`tests/fixtures/p08Catalog.ts` 与输出 p08-fixture.json 可复现新城、异名同 key、未用类别、四类/未知及有/无坐标。
3. 对照 P08 浏览器记录中的 filters/dense/offline 和明暗底板截图，复核图形、文字、NEW、坐标锚点、触摸命中、键盘焦点和混合集群数字；再重放保留的 A/B 产物。
4. 接收方独立判断 P08-R1–R7，填写上表，完成 4.2 后再考虑 4.3；本地自动通过不替代独立验收。

正式数据补标、同义 key 清理和来源事实复核未执行，均属独立数据任务。允许不同 key 撞色/近色，未做碰撞消解。触摸使用真实浏览器输入 API，未测试物理手机、完整 Safari 或实地 GPS；浏览器瓦片由测试隔离，未重新认证 P05 底图与坐标精度。远端 CI、推送、部署、独立验收和规格归档未执行；本任务仅交付本地实现与证据。


## 2026-09-15 P2 选中状态退回修复（上一轮，原问题已复核消除）

接收方结论为暂不通过：点击 A、移动关闭详情、搜索 B 和桌面直接 map popup 分属不同事件路径，旧外圈没有跟随当前查看餐厅。接收方同时确认正式数据 42 文件原字节、东京自动配色和初次发布凭据一致；本次不将这些复核扩写为 P08 全项验收通过，4.2 / 4.3 继续留空。

本轮由 App 的 `detail` 记录统一决定选中对象，经 `selectedRestaurant` 交给 MapShell。两端标记激活和搜索均更新同一记录；移动详情和桌面 popup 都消费它。关闭回调按记录身份清理，替换旧 popup 时先撤下其显示引用，避免关闭 A 的事件误清掉 B。`flyToRestaurant` 只负责地图移动，不再另开详情；RestaurantMarker 不再监听 popup 事件改外圈。

MapShell 根据当前选中记录更新外圈，在 cluster 重新添加 marker 元素时重新应用同一状态；无坐标、筛选撤下和版次切换均不保留旧高亮。显式保留 Enter/空格激活，继续使用原两种详情布局和既有聚合/投影。没有新增选择注册表、数据迁移或发布入口。受控桌面 popup 保留原向上偏移，浏览器断言其边界不遮挡选中图标。

- `tests/unit/mapLocation.test.tsx`：新增两种布局的真实 Leaflet 回归，验证 A→B、替换 popup 不误关闭新记录、关闭清理、marker remove/add 后状态同步及激活等待 App 状态。
- `tests/e2e/visual-encoding.test.mjs`：新增 Chromium/WebKit × 1280/390 四条“点击 A → 关闭 → 搜索 B”场景；检查详情身份、唯一外圈、关闭按钮和 Escape 清理、桌面直接 A→B、无坐标及切版。原密集点场景的每次关闭也新增无残留外圈断言。
- 复用 P08 的第二个隔离城市放置可单独显示的餐厅，第一城市仍保留六个密集/重合点。正式数据和分类文件未改变；前置对账在 `test-results/p08/selection-fix/before-data.json`。
- 定向检查：`rtk npm run check`、`rtk npm test` 已通过（212 测试）；P08 浏览器专项 9/9 通过。首次浏览器回归发现 callback 模式缺少原 bindPopup 提供的键盘处理，已修复并通过真实键盘输入验证，没有弱化断言。

本轮完整发布验证已重新生成，六阶段全部 exit 0；初次提交凭据保留于 `test-results/p08/selection-fix/previous-release/`，修复前完整产物保留于 `/tmp/foodie-p08-before-selection-dist-260915`。本轮不推送、不部署，复验结论仍由接收方填写。

| 本轮命令 | 结果与证据 |
|---|---|
| `rtk npm run release:check -- --output test-results/p08/release` | 212/212 快速测试、65/65 浏览器测试（含 9 条 P08 专项，0 skip），覆盖、构建与性能均通过；[当前凭据](../../../test-results/p08/repeated-activation/previous-release/verified.json)、[完整日志](../../../test-results/p08/selection-fix/release-check.log)。 |
| `rtk npm run release:verify -- --output test-results/p08/release` | exit 0，当前源码及完整产物一致；[日志](../../../test-results/p08/selection-fix/release-verify.log)。 |
| `rtk proxy node tests/e2e/release-candidate-replay.mjs --before /tmp/foodie-p08-before-selection-dist-260915 --after dist --output test-results/p08/selection-fix/candidate-rollout` | 1/1 通过，修复前 A→修复后 B→原 A，未清缓存、未重编 A、两份产物未改变；[回滚摘要](../../../test-results/p08/selection-fix/candidate-rollout/summary.json)。 |

上一轮修复构建为 `cea0c48c5198ad2ad8e835b6c0fb514e175508c33e6a984da87e54d5556b0ac2`；源码摘要 `325950bd3148687e802b1f53a241e7b0a5434dc9f70bb8dcfa4592f39e81fcd2`，完整产物摘要 `64d33057bbae6000a1859c697f76608c443153b608e421e2b9a81f8931698361`。性能：正式最大名单 / 1000 条夹具 LCP 中位数 692ms / 680ms，CLS 均 0，交互 P95 77.7ms；既有预算通过。

[本轮正式数据对账](../../../test-results/p08/selection-fix/data-reconciliation.json)：42/42 文件与最初字节基线一致，671 条记录仍未标注新形式。`check:repository` 与 `git diff --check` 通过。

接收方可先运行上表 verify，再定向执行 `rtk proxy env E2E_ARTIFACT_DIR=test-results/p08/recheck node --test --test-name-pattern='P08 selection' tests/e2e/visual-encoding.test.mjs` 复核四条两端场景。最终截图和浏览器记录位于 [P08 完整门禁证据](../../../test-results/p08/repeated-activation/previous-release/browser/p08-visual-encoding.json)，对应 `p08-selection-*-clicked-A.png` 与 `p08-selection-*-searched-B.png`。独立复验和归档仍未执行。


## 2026-09-15 P2 鼠标重复激活同一记录

接收方确认上次“点击 A → 关闭 → 搜索 B”的同步问题已消除，但本轮暂不通过：桌面真实鼠标第二次点击 A 时，Leaflet preclick 先关闭弹窗，随后点击再次选择 A。React 合并更新后餐厅引用仍是 A，旧 MapShell effect 未重新执行，造成外圈保留但详情消失，搜索同一 A 也不能恢复。上一轮键盘 Enter 回归没有覆盖这条鼠标事件链。

本次复用 App 已有的选择对象 `{requestKey, record}`，通过 `selection` 交给 MapShell；每次点击和搜索本来都会生成新的选择对象，现在该变化完整进入同步 effect，即使 record 仍为同一个 A。餐厅对象没有复制或改写，没有增加计数器、时间戳或另一套选中状态。同步时同时检查 Leaflet popup 的 `isOpen()`，不将显示引用存在当作弹窗已经打开。

新增回归：

- `tests/unit/mapLocation.test.tsx` 使用 React state 与真实 Leaflet DOM 鼠标事件，固定其他 props 引用，重放三次点击 A、搜索 A、关闭和重新打开。修改前 23 项中该项失败、修改后 23/23 通过；[修改前日志](../../../test-results/p08/repeated-activation/regression-before.log)、[修改后日志](../../../test-results/p08/repeated-activation/regression-after.log)。
- `tests/e2e/visual-encoding.test.mjs` 新增 Chromium/WebKit 两条 `P08 mouse reactivation`，全部使用真实 `locator.click()`，不是 Enter 或合成 marker.fire。每次鼠标激活均断言一个可见 A 弹窗和唯一 A 外圈，再验证搜索 A、关闭、鼠标重新打开、再次关闭后搜索打开。定向 2/2 通过；[日志](../../../test-results/p08/repeated-activation/browser.log)。上轮键盘、触摸、A→B 和关闭回归全部保留。完整门禁还发现旧 WebKit 键盘场景在首次 Worker 接管前开始操作；controllerchange 会按既有协议重载数据并撤下旧选择。已补齐 `controlled`、对应数据 `cached`、`ready` 前置条件后再操作，没有添加任意等待或放宽操作后的断言。

本轮起始时 42 份正式数据仍与最初字节基线一致。上轮 `cea0c48c…` 完整产物保存于 `/tmp/foodie-p08-before-reactivation-dist-260915`，凭据与原浏览器证据保存在 `test-results/p08/repeated-activation/previous-release/`。本轮已完成原 release:check、单独 verify 和实际产物升级回滚；不推送、不部署，独立复验/归档项继续留给接收方。

| 本轮最终命令 | 结果与证据 |
|---|---|
| `rtk npm run release:check -- --output test-results/p08/release` | 六阶段全部 exit 0；213/213 快速测试、67/67 浏览器测试（含 11 条 P08 专项，0 skip），性能通过。[当前凭据](../../../test-results/p08/release/verified.json)、[完整日志](../../../test-results/p08/repeated-activation/release-check.log)。 |
| `rtk npm run release:verify -- --output test-results/p08/release` | exit 0，当前源码和已检查产物字节一致。[日志](../../../test-results/p08/repeated-activation/release-verify.log)。 |
| `rtk proxy node tests/e2e/release-candidate-replay.mjs --before /tmp/foodie-p08-before-reactivation-dist-260915 --after dist --output test-results/p08/repeated-activation/candidate-rollout` | 1/1 通过，cea0c48c…→新构建→原 cea0c48c…；未清缓存、未重编旧产物，两份目录字节不变。[回滚摘要](../../../test-results/p08/repeated-activation/candidate-rollout/summary.json)。 |

当前构建 `37ec0ce35986c6cff96fcaceca35bdd4c90e1290aa24305007f378a399e98138`；源码摘要 `b439a641e37fd6e74fb651d58df7d11b13c60347fc69079248838cc3282c079d`，完整产物摘要 `3551befbc47cb68113574f5218a6641772637ca82906d97d71e869971e848c7d`。性能：正式最大名单 / 1000 条夹具 LCP 中位数均 684ms、CLS 均 0，20 次交互 P95 72.9ms；原预算通过。Vite 原始 chunk 体积提示继续保留。

[最终数据对账](../../../test-results/p08/repeated-activation/data-reconciliation.json)：42/42 文件与最初基线一致。`check:repository`、`git diff --check` 通过。

接收方可运行 `rtk proxy env E2E_ARTIFACT_DIR=test-results/p08/recheck-mouse node --test --test-name-pattern='P08 mouse reactivation' tests/e2e/visual-encoding.test.mjs` 定向复验，再运行上表 verify。最终截图及记录见 [P08 浏览器证据](../../../test-results/p08/release/browser/p08-visual-encoding.json)，文件名 `p08-reactivation-*-repeated-mouse.png`、`p08-reactivation-*-search-same-A.png`。本次开发者验证通过，不代表独立复验已经通过。
