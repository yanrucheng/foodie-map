## 当前状态与执行门槛

**精简设计已完成开发与本地验证，待主线程最终验收。** 用户明确回复“没问题，开始开发吧”后，本轮在当前工作区独立实现，未应用已撤回候选。以下仅引用 implementation-* 的本轮证据，旧“90 条测试”不作为完成依据。

- [x] 设计准备：核对实际字段/消费者、确认 P02 范围、定下最小合同和迁移边界，补齐验收场景。
- [x] 用户审定本轮设计并授权进入开发。

目的、字段和接口以 [design](design.md) 为设计入口；验收正文只以 [P02-R1–R7](specs/guide-data-contract/spec.md) 为准。其余实现方法由开发者选择，不再逐项向用户询问常规工程选项。

## 1. 建立合同和输入基线

- [x] 1.1 核对 P01 当前交接与工作区，冻结真实文件/身份/关键字段基线；不覆盖他人未提交内容。交付上游标识及紧凑输入清单。对应 P02-R7-S1/S2。
- [x] 1.2 以 Zod 的共享定义实现六个必填字段和可选内容，src/types/restaurant.ts 导出推导类型；额外字段保留，退休价格字段只在原始输入允许。交付合同及合法缺失/错误语义样例。对应 P02-R1-S1–S3。
- [x] 1.3 实现价格文本/币种规则与共用位置函数；不新增来源认证、逐行坐标系或价格数值模型。交付 typed API 和边界样例。对应 P02-R4-S1/S2、P02-R5-S1/S2。

## 2. 接入工具和只读校验

- [x] 2.1 统一映射合同、精确派生、四种 resolution 报告，未映射只 warning；错误规则与存储冲突失败。交付六城数据和 compound/OTHER/缺失测试。对应 P02-R3-S1–S3。
- [x] 2.2 修复 Python boarding，以批量 Node 调用共用派生规则；保持非 cuisine_group 字段不变，实现 dry-run/失败保护/原子写入及输出路径防护。交付真实子进程/临时目录测试。对应 P02-R2-S1–S3。
- [x] 2.3 提供 validate:data 和 --root，使用现有城市登记发现所有餐厅文件及 taxonomy/mappings，检查漏文件/未登记文件；接入 P01 check。交付退出码及文件/记录/字段诊断，无网络无写入。对应 P02-R6-S1/S2。

## 3. 显式迁移和必要消费适配

- [x] 3.1 先完成正负样例，再迁移价格表示、上海 mappings、空 raw 规则、四个零点及选定分类冲突。保留全部身份、raw、定位状态和营业状态；一次性脚本/报告足够，不建设迁移服务。对应 P02-R4-S3、P02-R5-S1/S2、P02-R7-S1/S2。
- [x] 3.2 按 design 允许范围适配类型/运行时字段解析、nullable 名称搜索、卡片价格/缺失行，以及空间调用点。交付编译/现有组件回归；不扩展完整详情 UI、选择模型或投影。对应 P02-R5-S3、P02-R6-S3。
- [x] 3.3 更新 boarding SKILL 与现有接入指南的字段、映射、命令段，链接合同；覆盖登记/年度运维的历史冲突交 P03，P02 不重写 runbook 流程或覆盖表。对应 P02-R2、P02-R6、P02-R7-S3。

## 4. 验证与交接

- [x] 4.1 对全部真实迁移结果做身份/关键字段对账，不能只比较条数；报告变化原因、保留未知和实际未执行项。对应 P02-R7-S1/S2。
- [x] 4.2 运行必要合同/工具测试、全量 validate:data、P01 check/test/build；消费调用点有变化时运行相关既有浏览器回归。无来源网络查询或新城市实采作为前置。对应 P02-R1–R7。
- [x] 4.3 给 P03/P04/P05 交付具体字段/API、迁移对账和后续责任；在下表填写实际命令结果，不修改下游 specs、不声明其功能已通过。对应 P02-R6-S3、P02-R7-S3。
- [ ] 4.4 主线程逐项审定；只完成开发与本地验证不能勾选最终验收。

## 验收记录

| 要求 | 开发证据与实际结果 | 主线程判定 |
|---|---|---|
| P02-R1 | `src/data/contract.ts` 定义六个必填字段与可选内容，类型由 schema 推导。dataContract/dataConsumers 验证最小输入、缺失、额外字段、错误字段/评级/URL、closed/active 保留、运行时拒绝坏载荷。[快速集](evidence/implementation-tests.log)：107/107。 | 待验收 |
| P02-R2 | Python 批量调用同一 Node 派生；dataTools 通过香港 venue_type/avg_price_hkd/嵌套来源保留、dry-run、同路径/硬链接拒绝、非法规则和真实替换失败保护。全部 11 个真实文件 dry-run 退出 0，无目录/输入变动：[工具记录](evidence/implementation-tools.log)。 | 待验收 |
| P02-R3 | 六城统一数组；精确匹配，missing/unmapped/explicit-other 分开，未知 fallback 只 warning。重复规则/不存在目标/错城市/存储分组冲突均失败；原始 cuisine 保留。[全量结果](evidence/implementation-validation.json)：0 未映射、13 显式 OTHER。 | 待验收 |
| P02-R4 | `getMapPosition` 复用数值和空间规则；无状态的合法坐标可用，false/缺失不可定位，零点/单边/非有限/越界假成功失败。13 对 false 候选保留；4 零点变 null；全部定位 flags 不变。前后均 384 可定位。[对账](evidence/implementation-reconciliation.json)。 | 待验收 |
| P02-R5 | `price` 为原文加独立 currency；173 条原价逐字保留，229 条无金额，澳门 MOP 保留。guideMigration 测试冲突币种/多值拒绝、零金额与未知，dataConsumers 验证两端省略缺失、原价/币种与转义。[浏览器](evidence/implementation-browser.log)亦覆盖 HKD 区间。 | 待验收 |
| P02-R6 | validate:data 进入 check，默认/--root 共用 cities 登记；dataTools 通过坏 JSON/非数组/ID/组/位置/类型/缺文件/未登记文件负例。重复验证 JSON 一致，23 个输入 JSON 哈希不变。[检查](evidence/implementation-checks.log)：0；类型/规范/全量数据均通过。 | 待验收 |
| P02-R7 | 独立 Python 读取冻结基线与当前文件逐记录比较，不调用迁移转换函数得出预期。11 名单/402 记录，无身份/URL/raw/地址/状态/非零坐标变化；全部价格、四个零点和六个分组值有去向；无目录/采集时间变化。[紧凑对账](evidence/implementation-reconciliation.json)。 | 待验收 |

## 开发完成的判定

上述 R1–R7 有实际证据，全部登记数据受同一合同约束，合法缺失可通过，boarding 不丢事实，原有可定位状态不因新流程消失，迁移无静默身份变化，消费者能读取新字段且原入口可运行。完整 P04 无位置详情通路、P05 底图校准、P03 官方名单/版本目录、P07 发布缓存均不作为本包已完成的声称，也不让本包自行实现它们。

BC-01 的外部旧地址策略仍待主线程决定。本地开发和可审阅迁移在获本轮开发确认后可进行，发布/退役/兼容实现不在授权范围；不为该待决项创建新审批流或永久双写。

## 旧候选（不可应用）

[evidence/p02-superseded.patch.disabled](evidence/p02-superseded.patch.disabled) 是已撤回方案。它要求逐记录证明、复杂价格分支、批量降级坐标和营业状态，并越过必要字段适配做了额外 UI，不能直接恢复使用。

该目录旧 migration/verification/patch-replay/快速与浏览器日志仅为历史记录，不纳入本方案验收。新证据在实际开发后按对应要求填写，不以历史测试数代替重验。

## 实现与验证交接

- 实现位置：当前工作区 `/Users/chengyanru/repos/personal/foodie-map`，未创建提交，未推送/部署。上游为 `fb7c22e50ea543a6d362092a2332aef9c78aebbe` 加本轮开始已存在的 P01 工作树；完整初始备份在 `/private/tmp/foodie-map-p02-impl-e3g_8p5e/baseline`。对账文件的 before_sha256 可由 Git 原数据复现，不依赖临时目录才能审查。
- 命令环境：Node 24.21.0、npm 11.19.0、Python 3.14.0。沿用已安装 P01 模块，Zod 3.25.76 从既有间接依赖登记为直接运行依赖；相对本轮起点，锁文件只改变根依赖声明和 Zod 的 dev 标记，没有依赖版本升级。没有宣称本轮重放全新 npm ci；干净安装由 P01 已有证据及后续集成验证承担。
- 最终 `npm run check`：0；`npm test`：107/107；`npm run test:e2e`（含 build）：5/5。桌面 1280×800、移动 390×844，HeadlessChrome 147.0.7727.57。外部 HTTP 全部拦截，实际 Leaflet/聚合/heat、选择器和价格/可选内容适配正常，无 pageerror。具体命令/时间见[验证索引](evidence/implementation-verification.json)。
- 保存浏览器日志时默认沙箱拒绝 loopback listener，获得本地运行权限后重试。另一次移动端弹层关闭点击碰到动画，改为 Puppeteer locator 等待元素稳定，未添加固定延时/重试或更改业务交互。两次失败尝试与最终成功均保留在 implementation-browser*.log。
- `git diff --check` 通过，使用说明链接检查通过。全部 11 份数据 boarding dry-run 通过；重复 validate:data 输出一致，无输入文件变化。预期重复坐标仅作为维护 warning（含跨榜单同点），不构成自动删除或新增认证流程。

### 具体代码/API

- `src/data/contract.ts`：record/array 类型与解析、URL 策略、optional text、`getMapPosition`；没有 provenance/逐行 coordinate_system/数值价格模型。
- `src/data/taxonomy.ts`：taxonomy/mappings、`deriveCuisine` 和最小 boarding 输入。
- `src/data/validation.ts`：`validateDataset` 及字段诊断；`scripts/data-contract.ts` 只负责当前登记发现与 CLI。P03 后续将发现改接 catalog，无需改餐厅语义。
- `skills/cuisine-boarding/board.py`：原始对象保留，只有 cuisine_group 回填；Node 数据拒绝与运行环境错误分别返回 1/2。
- `scripts/migrate-guide-data.ts`：本次表示迁移的单一 dry-run/write 工具，含紧凑对账。没有另建迁移注册表、独立服务或第二套长期对账系统。
- `src/data/display.ts`：已有卡片的名字/价格/搜索字段共用最小格式函数。卡片布局和交互不重做；getMapPosition 只接在原 marker/heat/飞行/计数调用处。

### 数据迁移结果

| 项目 | 本轮结果 |
|---|---|
| 身份集合 | 11 文件/402 条保留；无新增、删除、URL/名称/raw cuisine 改写。 |
| 价格 | 173 条非空原文逐字保留；229 条仍无金额；currency 来自原字段后缀/已有声明；无均值/换汇/等级推算。 |
| 定位 | 384 可定位保持；18 个 false 全保留；397 对非零候选坐标与原值相同；4 个 0,0→null/null；原有 1 对 null 不变。 |
| 状态和来源 | 全部 status/geocode_success/geo_source 保留；未填采集或核验日期。 |
| 分类 | 海鮮映射→OTHER，香港必比登 #18 原值保持，星级 #42→OTHER；必比登 #65→OTHER；上海必比登 #20/#32→NINGBO、#22→FRENCH、#31→HUAIYANG。原六条冲突已解释，共六条存储分组值改变。 |
| mappings | 上海对象→数组且不补 sources；香港/广深各删除一个空 raw；其他来源标签与全部 taxonomy 组定义不变。 |

### 下游边界与限制

P01 单例地图依赖和临时 effect 例外、P03 cities/cuisineRegistry、P05 gcj02/定位生命周期、全部其他 Packet artifacts/上层计划/来源 runbook 与本轮起点逐字节一致。共享 Make/manifest/TS 配置仅增加本包入口与检查范围；P01 改动没有被覆盖。

P03 接收 records、validateDataset 和本次对账，负责 catalog、版次/官方覆盖/跨年别名。P04 接收可选字段/价格/位置语义；目前未知位置记录留在可搜索数组中，但没有新增无 marker 详情面板，完整详情通路、加载竞态、每城 taxonomy 和新晋年份显示仍由 P04 完成。P05 接收 getMapPosition，负责瓦片/坐标域校准与生命周期；本轮未重新验证真实坐标精度。

覆盖表保持原字节并标识历史状态，生成/版次运维留给 P03。BC-01 未决：本地字段迁移完成，旧公共地址未删除，未发布或添加兼容层。全部 P02 MUST 场景已提供本轮证据，最终 4.4 仍由主线程验收。
