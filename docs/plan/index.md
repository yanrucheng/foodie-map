---
id: "index-plan"
title: "Development Plans"
type: index
status: active
created: 2026-09-13
updated: 2026-09-25
timezone: "Asia/Shanghai"
parent: "index-docs"
depends-on: []
superseded-by: ""
author: "Codex"
tags: ["plan", "index"]
---

# Development Plans

| Document | Status | Created | Summary |
|---|---|---|---|
| [餐厅中文正式名称纠正：北京小样与独立验收](plan-260925-0915-chinese-restaurant-names.md) | active | 2026-09-25 | 北京8家小样已验收；用户已确认国内402条（含港澳、排除东京），进入全量实施 |
| [主打体验图标与价格角标：P09 设计定稿和开发交接](plan-260915-1504-dining-experience-markers.md) | active | 2026-09-15 | 八类融合图标、¥ 价格角标、字段/缺失/诊断、单一 runbook 与开发提示词；本地框架已实现；数据补标与独立验收另行记录 |
| [餐厅自动配色与四类图标：设计定稿与开发交接](plan-260914-2209-restaurant-visual-encoding.md) | superseded | 2026-09-14 | P08 本地实现背景；后续主图标与接入目标由 P09 接替，自动配色与历史事实保留 |
| [专业前端建设：目标、Packet 与验收基线](plan-260913-0040-frontend-professionalization.md) | review | 2026-09-13 | OpenSpec 开发包、依赖、分层验收和 Agent 交接入口 |
| [Test Optimization](plan-260505-2100-test-optimization.md) | active | 2026-05-05 | Existing test runner and tiered test execution plan |
| [Cuisine Taxonomy](tech-dev-plan-260504-cuisine-taxonomy.md) | active | 2026-05-04 | Existing taxonomy implementation plan |
| [Dynamic Title Switcher](tech-dev-plan-260504-foodie-map-dynamic-title.md) | draft | 2026-05-04 | Existing city/year/guide title implementation plan |
| [Live Location](tech-dev-plan-260504-foodie-map-live-location.md) | legacy: status unspecified | 2026-05-04 | Existing location and orientation implementation plan |
| [React + Vite Migration](tech-dev-plan-260504-foodie-map-migration.md) | legacy: status unspecified | 2026-05-04 | Initial migration from the standalone HTML prototype |
| [Responsive Web + Mobile](tech-dev-plan-260504-foodie-map-responsive.md) | legacy: status unspecified | 2026-05-04 | Existing responsive and mobile implementation plan |

Legacy metadata is preserved as historical context. Current initiative status and acceptance are tracked by the linked professionalization plan and OpenSpec changes.

餐厅主打体验图标和价格角标以 P09 为当前实现基线，沿用 P08 自动颜色能力。旧 Cuisine Taxonomy 计划及 P04 灰色兜底描述保留为历史实现背景，不继续指导新增手写颜色。
