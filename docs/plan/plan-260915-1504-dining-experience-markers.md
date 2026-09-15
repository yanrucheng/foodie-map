---
id: "plan-260915-1504-dining-experience-markers"
title: "主打体验图标与价格角标：P09 设计定稿和开发交接"
type: plan
status: active
created: 2026-09-15
updated: 2026-09-15
timezone: "Asia/Shanghai"
parent: "index-plan"
depends-on:
  - "plan-260913-0040-frontend-professionalization"
  - "plan-260914-2209-restaurant-visual-encoding"
superseded-by: ""
author: "Codex"
tags: ["design", "visualization", "taxonomy", "onboarding", "handoff"]
source: "用户已确认八类融合标准、¥ 价格符号和缺价无角标，并授权完成代码与 runbook 设计；实际开发由另一 Agent 负责。"
---

# 主打体验图标与价格角标

设计已定稿，P09 本地框架已实现；开发证据与独立验收状态见 tasks。本页保留原开发交接提示词，实际支持状态由接入指南维护。正式餐厅事实、数据补标、提交与部署不属于本次框架完成结论。

## 权威入口

| 内容 | 唯一维护入口 |
|---|---|
| 工程设计、字段、价格解析、固定图标与衔接 | [P09 design](../../openspec/changes/p09-dining-experience-markers/design.md) |
| 可验证的 P09-R1–R9 合同 | [dining-experience-markers spec](../../openspec/changes/p09-dining-experience-markers/specs/dining-experience-markers/spec.md) |
| 实施任务、开发证据与独立验收 | [P09 tasks](../../openspec/changes/p09-dining-experience-markers/tasks.md) |
| 用户确认的视觉样例 | [自包含预览](../../openspec/changes/p09-dining-experience-markers/preview.html) |
| Agent 的标签、来源、缺失与价格判断 | [既有来源 runbook 的 P09 节](../runbook/runbook-260507-1013-valid-data-source-guide.md#p09-labeling) |
| 安装、命令、catalog、对账、aliases、覆盖与回滚 | [接入指南](../../readme/data-onboarding-guide.md)、[开发指南](../../readme/development.md) |

## 已锁定的两部分设计

项目代码增加可选 `dining_category`，固定八项主打体验映射，替代当前四类图标/形式筛选；保留旧 serving_form、venue_type 原义。颜色沿用 cuisine_group 的稳定自动配色；价格从现有 price_range 解析，仅显示 ¥ 至 ¥¥¥¥，缺价或无法识别时无角标。各端共用定义，价格/NEW/选中状态互不遮挡，缺失与显式 other 分开诊断。

runbook 固定食品主打优先、综合料理承接、宽口径多道和食的证据要求，以及原始菜系/价格保留、other/未标注区别、分榜单分布报告和逐字段对账。明确来源标签足够时可以直接判断；复合“面食/点心”不能只凭包含某个词抢占分类。方法由 Agent 选择，不新增每店证明系统或平行接入工具。

图形与语义不再等待逐项确认。现有 BC-01 只影响旧接口退役与真实迁移发布；本包采用可选增量字段、保留现有接口，设计和本地实现无此阻塞。

## 与当前工作区及后续数据任务的关系

- P08 的颜色能力及已有字段事实继续使用；P09 取代它的主图标、问号与四类筛选目标。P08 的历史实现/验收记录不被改写。
- 当前正式记录没有 dining_category。东京已完成的旧 serving_form 补标可作为来源背景；它不会自动变成新分类，也不会因这份设计被删除。
- 框架开发用隔离数据验收；真实数据补标另由数据 Agent 按本 runbook 完成。正式字段未补时，点位仍使用通用图标，不能声称真实分布已经改善。
- 源 runbook、接入指南与仓库 cuisine-boarding 入口已更新为 P09 本地框架支持；开发者自测与独立验收分别登记在 tasks。
- 预览内嵌的 413 条记录只是设计试分，尤其东京多道和食和复合面点案例仍含待核实判断。预览内部键不作为正式 schema 或批量迁移来源。

## 可复制给开发 Agent 的提示词

```text
你负责在 /Users/chengyanru/repos/personal/foodie-map 实现已经定稿的 P09“主打体验图标与价格角标”。本轮做项目代码及接入流程的工程化，产品枚举、图标选择和价格表现已经确认，请直接按设计实现，不重新发起方案选择。

先读取仓库 AGENTS/RTK 约定和以下文件：
1. docs/plan/plan-260915-1504-dining-experience-markers.md
2. openspec/changes/p09-dining-experience-markers/design.md
3. openspec/changes/p09-dining-experience-markers/specs/dining-experience-markers/spec.md
4. openspec/changes/p09-dining-experience-markers/tasks.md
5. docs/runbook/runbook-260507-1013-valid-data-source-guide.md 的 P09 节
6. readme/data-onboarding-guide.md、readme/development.md
视觉参考为本包 preview.html；规范有冲突时以 P09 design/spec 为准，预览记录不是已核实的正式标签。

确定的实现范围：
- 在现有 schema 中增加可选 dining_category：staple、meat、seafood、dessert_drink、french、chinese、japanese_course、other。保留 serving_form/venue_type 原义与原值，不自动转换或双写。
- 复用共享展示模块贯通八类图标、未标注通用刀叉、筛选、图例、React/Leaflet 详情和统计；颜色算法保持 P08 现状。
- 从 price_range 的有效等级生成 ¥/¥¥/¥¥¥/¥¥¥¥；支持现有港澳 $ 和全角 ￥，保留源文/币种。缺价和不可识别等级不创建角标，不从实际金额估档。处理价格、NEW、选中/焦点同时存在的布局。
- 扩展现有 validate:data 及分榜单分布诊断。显式 other 与未标注分开，不设置凑齐或均分阈值。boarding 仅映射 cuisine_group，其余事实原值透传。
- 完成正式 catalog 下的隔离新城市/年度演练；更新同一来源 runbook、readme 接入/开发说明和 skills/cuisine-boarding/SKILL.md 的实际支持状态。不要建立第二套分类表或接入流程。

工作边界：
当前工作区已有东京补标、catalog/旧地址派生文件、覆盖指南与来源材料的未提交修改。先核对并保留，以当前文件为基线；不得从旧 HEAD 覆盖、回滚或把别人的变更混入自己的结论。
本轮不批量重标正式餐厅，不把 preview.html 中的试分导出覆盖 public/data。主打判断由后续数据 Agent 按 runbook 完成；开发使用隔离夹具，保护正式身份、旧标签、价格、坐标与覆盖声明。
使用项目 Node 24 与既有工具链，所有 shell 命令遵循 RTK。内部代码组织和像素微调可自主决定，须满足已定验收合同；不用为例行实现选择再询问产品方案。

验证与交付：
按 tasks.md 实现并逐项提供真实证据。先验证受影响路径，最终复用 release:check/release:verify 对同一产物覆盖合同、覆盖摘要、浏览器、性能、安全、离线和升级/回滚；不要弱化旧测试或以历史通过次数代替本轮结果。
交付修改说明、关键文件、实际运行命令与结果、正式字段保护对账和新标签尚未补齐的数量；框架完成、正式数据补标和独立验收必须分别说明。更新 tasks 的开发证据，独立验收留给接收方。
默认只完成本地开发和验证，不推送、不部署。
```

## 完成含义

本页“设计完成”表示字段/界面/价格/自动化/语义/职责和可观察验收均已明确；本地开发任务及证据以 tasks 当前状态为准。开发完成不代表真实餐厅补标完成，补标完成也不替代独立验收、年度名单核实或发布授权。
