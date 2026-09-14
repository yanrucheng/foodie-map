## Why

现有 boarding 会删除 venue_type、把香港价格字段改成人民币字段，上海 mappings 又与其他城市格式不同。餐厅类型与实际 JSON 分离，缺值、价格和坐标含义不一致，变换还可能静默损失信息。

P02 的目标是让已有信息可以稳定接入和消费：缺少某项内容只影响该项展示或操作；明确错误能够被发现；数据变换不丢事实。逐字段认证和强制补齐信息不属于这个目标。

## What Changes

- 建立一份可执行的餐厅合同，确定核心身份、可选内容、价格文本/币种、原始/派生菜系和可定位规则；TS、Python 与校验共用规则。
- 保留已有坐标、定位状态和营业状态；不因缺少新增凭证或日期批量降级。修正零点占位等明确的表示错误。
- 统一 mappings；boarding 只派生 cuisine_group，缺失/未映射允许 fallback 并提示，规则冲突失败；dry-run 无写入、失败不破坏正式输出。
- 提供只读 validate:data 及逐文件身份/关键字段迁移对账，接入 P01 的现有检查入口。
- 完成合同变化所必需的字段消费适配；P03/P04/P05 的版本登记、完整界面流程和地图投影分别由原 Packet 负责。
- **BREAKING（本地内部表示）**：价格字段统一为文本 price 加独立 currency；上海 mappings 统一为数组。旧公共 JSON 地址的发布兼容仍由 BC-01 决定，本包不退役地址或建立兼容层。

## Capabilities

### New Capabilities

- `guide-data-contract`: 最小餐厅合同、非破坏性派生、质量检查和现有数据迁移。

### Modified Capabilities

无。

## Impact

主要涉及 src/types/restaurant.ts、一个共享合同模块、skills/cuisine-boarding、public/data、现有 scripts/测试和 package.json 检查入口。必要的消费者适配限于类型、缺值防护、价格字段和共享位置判断；不重构选择/加载状态，不新增独立详情交互，不修改坐标投影、定位权限、Leaflet 生命周期或发布工作流。

P02 无需修改上层目标或其他 Packet specs。P03 的官方名单完整性、P05 的坐标域/瓦片校准仍是各自验收职责，不作为逐条餐厅内容的新增展示门槛。

## Packet Contract

- 交付结果：已有信息不被转换损坏；合法缺失可被消费；明确错误可定位；迁移身份集合无静默增删。
- 前置：P01 的 Node、检查与测试入口；设计审定后才允许开始开发。
- 验收正文：[P02-R1–R7](specs/guide-data-contract/spec.md)；具体设计与接口：[design](design.md)；执行与验收：[tasks](tasks.md)。
- 总体边界与 BC-01：[总计划](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。
- 当前状态：精简设计已完成开发与本地验证，主线程待验收；证据见 tasks.md 的 implementation-*。旧候选已撤回，不沿用其完成结论。
