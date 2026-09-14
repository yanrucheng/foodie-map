## ADDED Requirements

### Requirement: P04-R1 Valid catalog-derived selection

系统 SHALL 从 catalog 推导年份、城市、榜单选择与默认值；合法 URL 恢复对应身份，非法组合有确定回退，空/无效登记有明确不可用状态。选项数量 MUST 不固定为当前 2026 的情况。

#### Scenario: P04-R1-S1 Two years and asymmetric coverage

- **GIVEN** 一城两版、一城只有旧版、一城只有一个榜单的 fixture
- **WHEN** 初始化合法链接及依次切换各维度
- **THEN** 只显示有效组合，尽可能保留仍有效的选择；失效选择回退到确定的有效项

#### Scenario: P04-R1-S2 Invalid and empty selection

- **WHEN** URL 包含未知城市/年份/榜单，或登记为空
- **THEN** 无效 URL 确定回退并反映最终选择；空登记显示不可用状态，不访问 undefined 属性而崩溃

### Requirement: P04-R2 Dataset-bound asynchronous state

系统 SHALL 将标题、地图输入、统计和详情绑定到同一数据集身份；新请求期间和失败后 MUST 不显示旧数据作为新版本。迟到响应不能覆盖新选择，错误可恢复。

#### Scenario: P04-R2-S1 Out-of-order switching

- **WHEN** 快速选择 A、B、C，响应按 C、A、B 顺序到达
- **THEN** 最终且之后持续显示 C 的身份和内容，A/B 不恢复过期卡片、标记或统计

#### Scenario: P04-R2-S2 Failed new edition

- **GIVEN** 同城旧版已成功显示
- **WHEN** 切换新版得到 404、网络错误或不合法 JSON
- **THEN** 新版显示明确错误态，旧版餐厅不作为新版内容保留
- **AND** 重试成功或切回旧版可恢复正常状态

#### Scenario: P04-R2-S3 Empty successful response

- **WHEN** 合法数据集成功返回空数组
- **THEN** 呈现与错误不同的空名单状态，记录所属版次，不借用其他版次填充

### Requirement: P04-R3 Consistent filtering search and counts

筛选、搜索、详情与统计 SHALL 消费同一活动数据集。新数据集默认全部菜系/venue；地图子集由共同位置规则派生。各计数 SHALL 清楚区分收录、筛选与可定位数量。

#### Scenario: P04-R3-S1 Search reveals its selected restaurant

- **GIVEN** 当前筛选隐藏了一个有可信坐标的餐厅
- **WHEN** 用户搜索并选择它进行定位
- **THEN** 必要的筛选状态同步使该餐厅可见，详情和地图定位指向同一记录

#### Scenario: P04-R3-S2 Unknown coordinates remain discoverable

- **WHEN** 搜索并查看一条合规但无可靠坐标的记录
- **THEN** 名称和详情可访问，明确不可定位，不飞往 0,0 或其他餐厅
- **AND** 名单数与可定位数分别正确表达

#### Scenario: P04-R3-S3 Context change resets stale UI

- **WHEN** 数据集变化时旧筛选或旧移动详情仍处于活动状态
- **THEN** 新数据集采用约定初始筛选，旧详情撤下，统计和地图输入没有跨版残留

### Requirement: P04-R4 City-scoped taxonomy presentation

菜系标签与顺序 SHALL 来自当前城市 taxonomy，样式可以共享。有效新组 MUST 能显示可读标签并参与筛选，不能因未手写 import 而缺失。

#### Scenario: P04-R4-S1 Same key with city-specific labels

- **GIVEN** 香港与北京对 CANTONESE 有各自标签/顺序
- **WHEN** 切换城市
- **THEN** 各自显示本城定义，不受另一个 taxonomy 的导入顺序影响

#### Scenario: P04-R4-S2 Newly registered group

- **WHEN** 新城市 taxonomy 含一个合法新组
- **THEN** 筛选和详情显示其标签；即使没有专属颜色也有可用样式，不把组静默丢弃

### Requirement: P04-R5 Shared display semantics across layouts

桌面与移动详情 SHALL 对同一记录使用一致的年度、新晋、名称、价格/币种、未知值和来源语义；展示 MUST 不固定年份或默认所有金额为某一币种。

#### Scenario: P04-R5-S1 New-year and multicurrency display

- **WHEN** 两端展示 2027 新晋记录以及 HKD/CNY/MOP 价格 fixture
- **THEN** 年份随对应版次，币种和区间保留，两个布局表达相同事实

#### Scenario: P04-R5-S2 Incomplete multilingual fields

- **WHEN** 可选译名、招牌菜或价格为合规未知值
- **THEN** 两端有清楚的缺失表达，不显示 undefined/null 字样、不因字符串方法报错、不编造译名或金额

### Requirement: P04-R6 Safe external data rendering

应用 SHALL 将外部名称/地址/说明作为文本呈现，对来源链接执行共同安全规则；运行时合同失败 MUST 进入可恢复错误态，而不是渲染任意对象。

#### Scenario: P04-R6-S1 Markup and unsafe links

- **WHEN** 文本包含 HTML 样式字符，或链接使用不允许的协议
- **THEN** 文本不被执行为标记/脚本，危险链接不可激活；桌面 popup 与移动卡片行为一致

#### Scenario: P04-R6-S2 Unexpected payload shape

- **WHEN** 请求返回对象、字符串、错误字段类型或其他不符合 P02 的载荷
- **THEN** 明确报告数据不可用，组件不因 map/filter/toLowerCase 等操作崩溃

