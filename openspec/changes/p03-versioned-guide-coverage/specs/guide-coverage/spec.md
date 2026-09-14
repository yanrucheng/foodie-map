## ADDED Requirements

### Requirement: P03-R1 Authoritative dataset catalog

系统 SHALL 用同一机器可读登记发现城市、榜单、版次、数据路径及 taxonomy；每个地域范围/榜单/版次身份唯一，声明版次与记录版次一致。空名单的身份 MUST 不依赖第一条餐厅记录。

#### Scenario: P03-R1-S1 Catalog consumers agree

- **WHEN** 前端、全量校验和覆盖表读取同一登记
- **THEN** 数据集身份、路径和可用性一致，记录条数来自实际文件
- **AND** 删除或改变登记时不需要再修改另一份城市/榜单表

#### Scenario: P03-R1-S2 Invalid catalog relationships

- **WHEN** 存在重复身份、缺失路径、无效 taxonomy 引用或文件内混合版次
- **THEN** validate:data 非零退出并定位登记或记录错误

### Requirement: P03-R2 Independently readable editions

系统 SHALL 为同城同榜单的不同年度保留可独立读取的数据；版次、采集时间及同版修订含义 MUST 分开。更新新年度不得覆盖旧年度事实。

#### Scenario: P03-R2-S1 Two editions coexist

- **GIVEN** 隔离 fixture 含同城同榜单的 2026 和 2027 数据，且身份集合不同
- **WHEN** 依次读取两版及更新 2027 文件
- **THEN** 每版返回自己的记录，2026 内容不因 2027 更新而变化

#### Scenario: P03-R2-S2 Historical edition and current status

- **WHEN** 当前餐厅停业、搬迁或同版数据被修订
- **THEN** 不静默删除其历史入选事实；修订原因和提交/修订标识可追溯

### Requirement: P03-R3 Evidence-based coverage states

覆盖状态 SHALL 区分未采集、部分、未核验和已核验等不同事实，说明真实地域范围；名单完整度与可定位数量 MUST 分别表达。已核验完整必须对账官方身份集合，不能仅比较条数。

#### Scenario: P03-R3-S1 Same count with a missing member

- **GIVEN** 官方集合为 A/B/C，本地集合为 A/B/D，条数相同
- **WHEN** 判断完整覆盖
- **THEN** 报告缺少 C、额外 D，不能标记 verified complete

#### Scenario: P03-R3-S2 Complete list with unresolved coordinates

- **GIVEN** 官方名单身份完全对账，但其中部分餐厅缺少可信坐标
- **WHEN** 生成覆盖信息
- **THEN** 分别展示名单完整和可定位数量，不将缺坐标解释为名单缺失

#### Scenario: P03-R3-S3 Empty and composite scopes

- **WHEN** 数据为空、尚未采集，或“广州·深圳”登记只有广州已核验
- **THEN** 空文件/缺文件不被当作官方零收录；组合名称不被当作两个城市已完整覆盖的证据
- **AND** 有官方空名单依据时可以明确记录经核验的零条结果

### Requirement: P03-R4 Traceable publication evidence

数据集 SHALL 保存或引用能够说明官方版次、地域、名单和采集/核验时间的证据；异常字段或人工匹配有可追溯理由。未知时间或来源 MUST 如实保留未知。

#### Scenario: P03-R4-S1 Another maintainer can inspect evidence

- **WHEN** 新维护者检查某数据集为什么被认定属于某年度和范围
- **THEN** 能从登记直接找到年度名单/公告或保存的来源证据及对账结果，无需重建原采集者的推断

#### Scenario: P03-R4-S2 Missing legacy provenance

- **WHEN** 现有文件缺少可证实的历史采集时间或完整性依据
- **THEN** 迁移记录该缺口，不能填入迁移日期冒充采集日期，也不能凭当前详情页断言旧年名单已核验

### Requirement: P03-R5 Explainable annual reconciliation

更新流程 SHALL 依据官方稳定身份或有证据的别名关系对账新增、退出、评级变化及身份歧义；当前营业变化与年度入选变化 MUST 分开解释。

#### Scenario: P03-R5-S1 Stable identity across changes

- **WHEN** 同一官方身份发生改名或升降级，或 URL 变化有对应证据
- **THEN** 对账为同一对象的变化，不因文件内 ID 重排而误报全部新增/退出

#### Scenario: P03-R5-S2 Missing capture and ambiguous branches

- **WHEN** 本次采集缺失条目或同名分店无法确认对应关系
- **THEN** 标为待核实/采集缺口，不自动认定退出榜单、停业或合并分店

### Requirement: P03-R6 Configuration-only routine expansion

在已支持的榜单类型、语言和坐标域内，新增城市、第二年度或菜系映射 SHALL 只涉及数据、登记、taxonomy/mappings 和必要来源材料；选择器、地图和卡片业务代码 MUST 无需新增城市分支。

#### Scenario: P03-R6-S1 New city rehearsal

- **WHEN** 在隔离 fixture 加入新城市、相应 taxonomy 和一个合法榜单
- **THEN** 登记、校验及前端可发现该城市，没有额外手写 import 或城市 if/else

#### Scenario: P03-R6-S2 New edition rehearsal

- **WHEN** 为已有城市增加第二年度和一个部分覆盖数据集
- **THEN** 年度及覆盖状态可发现，原年度保持可用，模拟数据不会进入正式 public 数据发布清单

### Requirement: P03-R7 Replayable onboarding and generated coverage docs

现有接入指南与来源 runbook SHALL 共同定义输入、权威来源、产物、校验、对账、发布前检查和回滚；覆盖表 MUST 从登记/文件生成并可检查是否过期。采集工具与调查方法可以替换。

#### Scenario: P03-R7-S1 Independent onboarding replay

- **GIVEN** 未参与实现的 Agent、隔离 fixture 和指定年度/城市任务
- **WHEN** 仅按接入指南及其链接执行新增与更新演练
- **THEN** 得到通过校验的数据/登记、来源和差异记录，能解释部分完成并完成回滚，无需口头补充关键步骤

#### Scenario: P03-R7-S2 Documentation drift is detected

- **WHEN** 数据或登记变化而覆盖表未刷新
- **THEN** 检查模式报告过期且非零退出；重新生成后内容与登记一致
- **AND** 指南不再固定要求 edition_year=2026、0,0 占位或与实际 mappings 不符的格式

