## Why

前端已有年份选择，但接入路径没有版次；城市配置、文件扫描和手写覆盖状态各自维护信息。新增城市或年度时无法可靠区分“文件存在”“名单完整”“坐标可用”，也缺少能交给另一 Agent 重放的年度更新过程。

## What Changes

- 将城市/榜单登记归一到机器可读 catalog，包含数据集身份、地域范围、版次、来源、采集时间与覆盖状态。
- 建立版次独立的数据路径和同版修订记录；旧版可继续读取。
- 用来源身份对账年度差异，区分名单变化、营业变化与采集缺口。
- 前端、校验和覆盖文档读取同一登记；扩城无需额外手写 taxonomy import。
- 更新现有接入指南和来源 runbook，提供发布前检查与回滚步骤。
- **BREAKING（旧无年份数据路径）**：是否保留旧地址由 BC-01 决定；本包不推定永久兼容。

## Capabilities

### New Capabilities

- `guide-coverage`: 版本化数据集、可核验覆盖登记和可重放的接入运维。

### Modified Capabilities

无。

## Impact

主要范围：public/data 的数据集登记与版次路径、src/config/cities.ts 的读取适配、taxonomy 发现、覆盖表生成器、readme/data-onboarding-guide.md 和现有来源 runbook。字段合同由 P02 拥有，界面状态由 P04 拥有。

## Packet Contract

- 大验收：旧版可独立读取，新城/新版只改数据与登记；完整性有证据；另一 Agent 能按 runbook 重放。
- 前置：P02 合同/校验；BC-01 的迁移结论。
- 细则：[spec](specs/guide-coverage/spec.md)；总计划：[目标与验收基线](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。
- 状态：实现与开发者验证已完成；最终验收由另一 Agent 负责。真实新增城市不在本包交付内。

