## ADDED Requirements

### Requirement: P05-R1 Evidence-backed coordinate systems

系统 SHALL 明确源坐标系、规范化 WGS84 与瓦片要求，保存选择转换规则的证据；未知源坐标系 MUST 不作为可靠位置直接入图。

#### Scenario: P05-R1-S1 Current coordinate domains

- **WHEN** 验证大陆、香港、澳门的坐标规则
- **THEN** 每域提供至少 3 个空间分散、有来源和核验日期的锚点
- **AND** 有来源的数值转换对误差不超过 10m，底图端到端位置误差不超过 200m

#### Scenario: P05-R1-S2 Unproven domain or source

- **WHEN** 来源坐标系或新坐标域的瓦片规则无法确认
- **THEN** 记录未核验，不通过猜测转换或修改注释将其当作校准通过

### Requirement: P05-R2 Consistent spatial presentation

标记、热力图、搜索定位、城市中心和实时位置 SHALL 采用同一空间解释；单个坐标 MUST 不被漏转或重复转换。

#### Scenario: P05-R2-S1 Same reference across layers

- **WHEN** 同一已核验参考坐标分别用于标记、热力图、飞行定位和用户位置
- **THEN** 各入口投影结果一致，符合 P05-R1 的坐标误差标准

#### Scenario: P05-R2-S2 Mainland and non-mainland switching

- **WHEN** 在不同已支持坐标域间切换城市
- **THEN** 城市中心与餐厅点遵循该瓦片合同，不沿用上一域的错误偏移或重复转换

### Requirement: P05-R3 Honest map eligibility

地图与热力图 SHALL 复用 P02 位置有效性判断，仅绘制可靠位置；不具备可靠位置的名单记录仍可按 P04 搜索和查看，计数 SHALL 清晰区分。

#### Scenario: P05-R3-S1 Invalid-coordinate fixtures

- **WHEN** 数据含零点占位、null、非法范围或未核验坐标
- **THEN** 不产生对应标记/热力点，也不允许飞往这些位置
- **AND** 合规未知记录仍计入名单，不被偷偷删除

#### Scenario: P05-R3-S2 Filtered map and heat agree

- **WHEN** 同一筛选下切换标记和热力图
- **THEN** 两种模式使用相同的可靠餐厅身份集合，显示的可定位数量一致

### Requirement: P05-R4 Correct resource lifecycle

地图、控件、事件、定位 watch 与计时器 SHALL 由明确生命周期管理；每个活动容器只有一套有效地图资源，卸载后无活动订阅或迟到动作影响其他数据集。

#### Scenario: P05-R4-S1 Repeated switching and remounting

- **WHEN** 连续切换城市/模式并执行至少 10 次挂载/卸载或等价生命周期压力场景
- **THEN** 没有地图容器重复初始化错误、重复控件或无界增加的订阅
- **AND** 卸载后活动定位 watch、相关计时器和监听资源归零

#### Scenario: P05-R4-S2 Late callback after context change

- **WHEN** 已排队的 popup、飞行或位置回调在数据集变化或卸载后触发
- **THEN** 不重新打开旧餐厅详情、不操作已销毁地图、不恢复过期定位状态

### Requirement: P05-R5 User-controlled location tracking

定位 SHALL 只由用户主动开启；拒绝、超时、不支持有明确反馈且不影响浏览。停用、卸载和自动停止 MUST 释放资源；前后台恢复不能违背用户已经停用的选择。

#### Scenario: P05-R5-S1 Permission and service failures

- **WHEN** 用户未开启定位，或主动开启后被拒绝、超时、不支持
- **THEN** 未开启时没有定位请求；失败时地图浏览/搜索仍可用，并能理解状态和可行的重试方式
- **AND** 不循环请求权限

#### Scenario: P05-R5-S2 Stop and background lifecycle

- **WHEN** 用户停用、组件卸载、触发既有自动停止条件，或经历前后台切换
- **THEN** watch/方向订阅和计时器按规则释放，仅仍处于用户开启状态时允许恢复
- **AND** 快速测试以假时钟验证，不真实等待数分钟

### Requirement: P05-R6 Map-service failure isolation

系统 SHALL 区分餐厅数据失败与瓦片服务失败；瓦片不可用时仍可搜索并查看已加载餐厅事实，恢复后地图继续可用。

#### Scenario: P05-R6-S1 Tile outage with valid data

- **WHEN** 餐厅数据已加载而瓦片持续失败
- **THEN** 明确呈现地图服务不可用状态，名称/筛选/详情仍可使用，无未处理异常

#### Scenario: P05-R6-S2 Tile recovery

- **WHEN** 瓦片服务恢复并触发受支持的重试/刷新
- **THEN** 地图恢复，数据集与筛选保持正确，不需要改写餐厅数据或重新授权定位

