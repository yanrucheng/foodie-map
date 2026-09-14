---
id: "plan-260914-2209-restaurant-visual-encoding"
title: "餐厅自动配色与四类图标：设计定稿与开发交接"
type: plan
status: active
created: 2026-09-14
updated: 2026-09-14
timezone: "Asia/Shanghai"
parent: "index-plan"
depends-on:
  - "plan-260913-0040-frontend-professionalization"
superseded-by: ""
author: "Codex"
tags: ["design", "visualization", "taxonomy", "onboarding", "handoff"]
source: "2026-09-14 用户确认四类图标方案、自动配色与接入目的，并授权设计定稿；实际开发由另一 Agent 完成。"
---

# 餐厅自动配色与四类图标

本次设计已经定稿，业务实现尚未开始。目的：用户容易识别餐厅大类并进一步筛选，接入 Agent 按统一规则标注新地区，框架自动生成展示，不再逐个类别补颜色或业务代码。

## 阅读与执行入口

沿用现有 OpenSpec change 承载工程设计，不再建立第二套技术设计目录或标签注册表。

| 内容 | 唯一维护入口 |
|---|---|
| 技术设计、字段、颜色算法、图标和衔接决策 | [P08 design](../../openspec/changes/p08-automatic-visual-encoding/design.md) |
| P08-R1–R7 验收合同 | [restaurant-visual-encoding spec](../../openspec/changes/p08-automatic-visual-encoding/specs/restaurant-visual-encoding/spec.md) |
| 开发任务、证据和独立验收 | [P08 tasks](../../openspec/changes/p08-automatic-visual-encoding/tasks.md) |
| 用户确认的图形与组合参考 | [自包含预览](../../openspec/changes/p08-automatic-visual-encoding/preview.html) |
| 接入 Agent 的语义判断 | [既有来源 runbook 的 P08 节](../runbook/runbook-260507-1013-valid-data-source-guide.md#p08-labeling) |
| 安装、数据命令和发布 | [接入指南](../../readme/data-onboarding-guide.md)、[开发指南](../../readme/development.md) |

## 已定的目的与边界

- 图标只表示餐食、小食、甜品、饮品四种消费形式；未知表现不增加第五个业务值。
- 颜色承接细分菜系、风格和产品类别；沿用 cuisine_group，稳定 key 自动配色，允许碰撞，不按筛选或城市重新排色。
- Agent 标注有来源的含义；框架负责确定性派生、统一展示、完整性校验，缺失保持缺失。
- 新 serving_form 与旧 venue_type 含义不同，采用可选增量字段，不自动改名或复制旧值；历史事实/地址保留。
- 地图、筛选、图例、两端详情使用同一份展示规则，不建立独立配色服务、每城图标表或多套接入流程。

这一设计落实 yanru-guidelines：固定目的、语义和权威归属，保留算法/源码组织/采集方法的改进空间；仅为确有不同含义的新形式增加字段。此前“形式细分为每种菜品”“自动消解所有撞色”“新增地图列表重构”等讨论不进入本包。

## 交接顺序与完成含义

开发 Agent 从 design、spec、tasks 开始，在现有 P02–P07 的实际代码上开发并提交证据；不重新开发已经存在的 catalog、boarding、空间或发布框架。数据补标由独立任务负责，框架测试用隔离夹具。

来源 runbook 的 P08 规则已写入，但 serving_form 尚未进入当前可执行 schema。开发完成前不要按新字段覆盖正式数据，也不要把“设计已定稿”解释为工具已支持。

文档本身完成不等于业务测试通过；P08 tasks 的开发与验收项保持未勾选。后续是否部署继续由实际发布任务决定。
