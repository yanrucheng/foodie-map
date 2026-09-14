## ADDED Requirements

### Requirement: P01-R1 Reproducible project environment

项目 SHALL 声明受支持的 Node、包管理器及数据工具所需 Python 条件，使用锁文件安装，并给出从干净 checkout 到运行、快速测试和生产构建的完整命令。

#### Scenario: P01-R1-S1 Clean setup

- **GIVEN** 未安装项目依赖的干净 checkout 和声明支持的运行环境
- **WHEN** 开发者逐条执行运行说明
- **THEN** 安装、检查、快速测试及构建成功，锁文件不产生未解释的差异
- **AND** 不依赖开发者个人目录中的模块或预先运行的服务

#### Scenario: P01-R1-S2 Unsupported runtime

- **WHEN** 运行环境不满足声明条件或锁文件与 manifest 不一致
- **THEN** 安装或检查明确失败并指出环境/锁文件原因，而非生成被当作有效的产物

### Requirement: P01-R2 Build-owned application dependencies

应用 SHALL 将 Leaflet、markercluster、heat 的运行代码和必要样式纳入锁定依赖与生产构建；字体与瓦片服务故障 MUST 不使应用壳或地图控件代码无法启动。

#### Scenario: P01-R2-S1 CDN blocked

- **GIVEN** 已安装并构建的应用和本地餐厅 fixture
- **WHEN** 浏览器禁止 unpkg 等运行时代码 CDN 请求并加载生产预览
- **THEN** 应用、地图引擎、聚合与热力图功能可以初始化，不出现 L 或插件未定义错误

#### Scenario: P01-R2-S2 Optional network resources fail

- **WHEN** 外部字体或瓦片请求失败
- **THEN** 页面文字和核心控件仍可操作，应用没有未处理异常
- **AND** 地图服务状态的完整用户反馈按 P05 补齐

### Requirement: P01-R3 Checks expose failures

项目 SHALL 提供 npm run check、npm test、npm run build 的明确职责与非零失败结果；类型或规范错误、失败测试和空测试集合 MUST 不被吞掉。

#### Scenario: P01-R3-S1 Negative checks

- **WHEN** 在隔离验证中引入类型错误或使一条行为断言失败
- **THEN** 对应入口返回非零，并可从输出定位文件或测试
- **AND** 移除故障后同一入口恢复成功

#### Scenario: P01-R3-S2 Missing tests cannot pass

- **WHEN** 测试配置错误导致声明的快速测试集合为空
- **THEN** 快速测试失败或显式报告为不可验收，不能依赖 passWithNoTests 报绿

### Requirement: P01-R4 Maintainable command and dependency boundaries

项目 SHALL 为每种检查职责提供一个权威入口；Makefile、文档和后续 CI SHALL 调用该入口。新增类型绕过、规范例外或全局库适配 MUST 有局部范围、原因和接收责任。

#### Scenario: P01-R4-S1 Equivalent entry points

- **WHEN** 分别通过 npm 和 Makefile 执行同一检查或构建
- **THEN** 它们使用相同配置和检查集，失败结果一致
- **AND** P02/P07 可扩展该入口而无需复制配置

#### Scenario: P01-R4-S2 Explicit temporary exception

- **WHEN** 既有问题暂时由下游 Packet 修复
- **THEN** 例外指出具体位置、原因、对应要求和移除 Packet
- **AND** 不新增全局 any、全局规则关闭或跳过整个测试目录来掩盖问题

### Requirement: P01-R5 Deterministic fast feedback

快速测试 SHALL 验证公开行为或真实风险边界，并独立运行；它们 MUST 不依赖真实网络、真实等待、固定端口、固定临时路径、未固定随机性或执行顺序。

#### Scenario: P01-R5-S1 Isolated execution

- **WHEN** 受影响测试单独运行、与全套运行及以不同顺序运行
- **THEN** 结果一致，结束后无遗留服务或打开句柄导致进程不退出

#### Scenario: P01-R5-S2 Tiered evidence

- **WHEN** 提交本包交接
- **THEN** 提供快速集时长和测试分类；需要浏览器/外部服务的验证有独立入口及原因
- **AND** 不以新增行覆盖率指标代替上述行为证据

