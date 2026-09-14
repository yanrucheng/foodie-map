## ADDED Requirements

### Requirement: P07-R1 Required CI quality gates

PR 与发布 SHALL 运行同一权威入口的类型/规范、快速测试、全量数据、派生覆盖文档及必要浏览器检查。失败 MUST 阻止对应产物发布，门禁不得用空测试、吞错或全局 skip 报绿。

#### Scenario: P07-R1-S1 Corruption blocks release

- **WHEN** 隔离验证分别引入坏数据、过期覆盖表、类型错误和失败行为断言
- **THEN** 相应检查失败且部署步骤不能继续，输出定位失败对象

#### Scenario: P07-R1-S2 Verified artifact only

- **WHEN** 全部必需检查通过并生成发布候选
- **THEN** 发布候选对应已检查的提交、依赖锁文件和构建，不能部署另一次未经检查的重建结果

### Requirement: P07-R2 Reproducible browser acceptance

浏览器验收 SHALL 使用受控 fixture 与生产构建，覆盖两版/新城、竞态、失败、核心地图和 P06 操作场景；记录 Chromium/WebKit 的实际版本，服务与端口由测试管理。

#### Scenario: P07-R2-S1 Clean browser matrix

- **WHEN** 从干净环境执行 npm run test:e2e
- **THEN** 测试自行启动/结束服务，在约定桌面/移动配置完成核心场景，不要求提前打开 localhost:5173
- **AND** 测试内部组件真实协作，外部 HTTP/瓦片/定位边界可控

#### Scenario: P07-R2-S2 Browser-specific failure evidence

- **WHEN** 任一支持引擎或核心状态失败
- **THEN** 保留失败场景、浏览器版本、截图/错误和数据集上下文，不能只报告重试后总数通过
- **AND** Safari 实际操作抽检与未覆盖真实设备范围分别记录

### Requirement: P07-R3 Cache integrity across editions and revisions

缓存 SHALL 保持载荷、数据集身份、同版修订与构建元数据一致；失败或非法响应 MUST 不替换有效缓存；清理只影响本应用拥有的缓存。

#### Scenario: P07-R3-S1 New edition and same-edition revision

- **GIVEN** 浏览器已有旧年度或同年度旧修订缓存
- **WHEN** 在线升级后断网，或故意向新上下文注入旧载荷
- **THEN** 仅显示身份/修订匹配的数据或明确的不可用状态，不用新元数据标记旧内容

#### Scenario: P07-R3-S2 Cache poisoning and namespace isolation

- **WHEN** 请求返回 404/500、HTML 冒充 JSON、非法数据，或清理旧应用缓存
- **THEN** 有效缓存不被坏响应覆盖，其他应用命名空间的缓存不被删除

### Requirement: P07-R4 Honest offline availability

已缓存应用 SHALL 在离线时提供匹配的已访问数据集，并明确缓存/离线状态；未缓存的数据集 MUST 不以另一城市/年度的数据填充。

#### Scenario: P07-R4-S1 Previously visited dataset offline

- **GIVEN** 应用壳与某数据集已成功缓存
- **WHEN** 断网后重新打开该数据集
- **THEN** 可完成受离线范围支持的搜索、筛选和详情查看，明确数据所属身份与缓存状态

#### Scenario: P07-R4-S2 Uncached selection offline

- **WHEN** 离线选择尚未缓存的数据集
- **THEN** 明确显示该数据集暂不可用；恢复网络后可重试加载，不混用旧选择内容

### Requirement: P07-R5 Traceable upgrade and rollback

发布候选 SHALL 具有可追溯构建与数据修订标识，并具备可重放 A→B 升级、B→A 回滚步骤；应用壳、catalog 和餐厅内容 MUST 不形成无法解释的混合版本。

#### Scenario: P07-R5-S1 Production-preview rollout drill

- **WHEN** 在生产构建预览依次运行版本 A、B 并回滚到 A，包含已有 Service Worker 的客户端
- **THEN** 每阶段确认构建/数据标识与用户显示相符，没有因旧缓存造成的白屏或假新版本

#### Scenario: P07-R5-S2 Replayable release handoff

- **WHEN** 未参与实现的维护者按发布说明重放候选检查与回滚
- **THEN** 能确定使用哪份产物、如何验证结果以及何时回退，无需猜测缓存清理或数据兼容前提
- **AND** PWA 名称/描述符合当前应用范围，旧 JSON 地址按 BC-01 已选政策处理

### Requirement: P07-R6 Measured frontend performance budgets

项目 SHALL 按本包 design 的固定协议提交生产性能基线与结果：冷导航 5 次中位数 LCP≤2.5s、CLS≤0.1，首屏自有 JS gzip≤400KiB；1000 条 fixture 的至少 20 次交互 p95≤200ms。未测量 MUST 不标记达标。

#### Scenario: P07-R6-S1 Repeatable measurements

- **WHEN** 对当前最大数据集和 1000 条确定性 fixture 执行协议
- **THEN** 提交硬件/OS/浏览器/构建/网络/CPU 条件、原始样本和计算结果，可由验收负责人重放

#### Scenario: P07-R6-S2 Budget regression or incomparable environment

- **WHEN** 超过预算或测试环境变化使结果不可比较
- **THEN** 保留失败与基线，先定位原因或经验收负责人修订协议，不删除慢样本、改成总分或宣称线上用户指标已达标

### Requirement: P07-R7 Independent end-to-end acceptance

最终验收 SHALL 将 G1–G4 串联重放，逐要求提供证据并由验收负责人判定。未执行、未核验或外部依赖缺失 MUST 与失败/通过分开记录，未实现提案不能归档成已完成规格。

#### Scenario: P07-R7-S1 Full change journey

- **WHEN** 从干净 checkout 演练新城、同城两版、部分覆盖、错误注入、键盘/移动流程、离线与回滚
- **THEN** 所有环节符合各 Packet 的要求，业务源码零改的扩展证据与来源/身份对账可检查

#### Scenario: P07-R7-S2 Acceptance handoff

- **WHEN** 开发 Agent 请求完成验收
- **THEN** 每个要求有实际证据、提交/环境及未决事项，验收负责人独立填写判定
- **AND** OpenSpec 结构验证成功或开发勾选任务不被当作功能验收通过

