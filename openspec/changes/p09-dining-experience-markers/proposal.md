## Why

P08 已解决合法新菜系缺少手写颜色的问题，但四种消费形式不足以区分当前餐厅名单。东京最近的来源补标得到 266 个 meal、1 个 dessert、2 个未标注；这个结果可以忠于原来的定义，却使绝大多数点位仍使用同一图标。

用户已确认新的融合分类：先表达主打食品，综合料理再分为法式、中餐、日式会席；颜色继续表达菜系与品类，价格等级独立使用 ¥ 至 ¥¥¥¥ 角标，缺少价格不显示角标。现需把这份设计与同一套接入 runbook 交给开发 Agent。

## What Changes

- 增量增加可选 `dining_category`，表达八类主打体验；保留原 `serving_form`、`venue_type` 的含义和值，新界面使用主打体验筛选。
- 用共享展示模块统一八种图标、未标注的通用表现和价格等级角标；保留 P08 稳定配色。
- 在 Leaflet 标记、React/Leaflet 详情、筛选、图例与统计中贯通新维度，并处理价格、NEW 和选中状态同时出现的场景。
- 扩展现有校验和统计，分清显式 other 与未标注，按城市、年度、榜单汇报分布；均匀度不作为强制补标阈值。
- 更新既有来源 runbook、接入指南与仓库内 cuisine-boarding 入口。正式数据补标仍由独立数据任务完成。

## Capabilities

### New Capabilities

- `dining-experience-markers`：八类主打体验的字段、固定图标、独立价格角标、统一消费端与接入验收。

### Modified Capabilities

不建立新的基础系统。本包承接 P02–P08；替代 P08 用四类 serving_form 驱动主图标、问号和形式筛选的界面行为，保留其配色、字段事实、空间资格、年度发现和发布边界。

## Impact

- 代码：既有 contract、restaurantPresentation、display、validation、data-contract CLI、useFilters 和地图/筛选/图例/两端详情消费者。
- 文档：既有来源 runbook、readme 接入/开发指南、skills/cuisine-boarding/SKILL.md，以及本包设计、验收合同和任务。
- 数据：新字段为可选；不删除旧字段、不批量转换旧类型、不将预览的试分结果复制到正式数据，不推断价格或改动坐标。
- 部署：沿用 P07 整包、摘要、离线缓存和回滚机制；本轮仅设计，不开发、提交、推送或部署。

## Handoff

- [技术设计](design.md)：字段、固定映射、价格解析、界面、自动化与迁移边界。
- [验收合同](specs/dining-experience-markers/spec.md)：P09-R1–R9。
- [开发任务与证据入口](tasks.md)：开发与独立验收均未开始。
- [已确认的离线视觉样例](preview.html)：样例是设计参考，内嵌试分记录不是正式补标事实。
- [来源与补标规则](../../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md#p09-labeling)：Agent 语义判断的唯一操作规范。
- [项目入口与可复制开发提示词](../../../docs/plan/plan-260915-1504-dining-experience-markers.md)。
