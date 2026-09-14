---
id: "runbook-260507-1013-valid-data-source-guide"
title: "Operational Guide - Finding Valid Restaurant Data Sources"
type: runbook
status: active
created: 2026-05-07
updated: 2026-09-14
timezone: "Asia/Shanghai"
parent: "index-runbook"
depends-on:
  - "prd-foodie-map-frontend"
  - "prd-260504-cuisine-taxonomy"
superseded-by: ""
author: "gpt-5.4"
tags: ["data", "source-validation", "geocoding", "michelin", "runbook"]
source: "readme/data-onboarding-guide.md; eval/data-quality-audit-260506.md"
---

# 餐厅名单与字段来源核验

执行入口、文件格式、catalog 字段、命令和回滚只在[数据接入指南](../../readme/data-onboarding-guide.md)维护。本 runbook 负责判断证据支持什么；字段合法性归 [P02](../../src/data/contract.ts)，版本与覆盖归 [P03](../../openspec/changes/p03-versioned-guide-coverage/design.md)。采集可用浏览器、HTTP、书籍或人工读取，不绑定特定工具或 Agent。

## 先确认年度与真实地域

1. 找该年度官方发布公告或对应书籍/电子名录，保存原始链接、发布年/版次、地域说明、实际采集时间及原文摘要/材料哈希。edition_year 不等于抓取年份；当前详情页只能支持其明确写出的年份及字段。
2. 枚举官方年度名单身份集合，分页须去重并排除推荐栏，保存稳定 ID/listing URL/分店地址及每页依据。官方总数仅用于辅助检查，A/B/C 与 A/B/D 数量相同仍不完整。
3. scope.description 写实际范围与未知边界；scope.members 的每个成员分别核验。组合名称、现有坐标包围盒或观测到的地址不证明完整地域边界。
4. 把年度、范围、名单来源登记到 provenance.sources；完整身份对账指向 coverage.reconciliationPath。记录采集/核验的真实时间，历史未知填 null；迁移时间写任务记录，不冒充采集时间。

官方零收录必须有适用于该年、该榜单、该范围的明确证据和空官方身份集合。没有文件是 not-collected；空 JSON 是未核验空名单，除非另有官方零证据。已发布缺文件是错误。未恢复完整官方集可保留 partial/unverified 并提供受限浏览。

东京现有材料支持 2026 公告总数、当前在线身份、KIBUN 年度入选及 partial；不支持完整年度身份集或排他性 23 区范围。catalog 已直接引用原材料，不能因为现行分页对齐把年度升级为 verified。

## 按字段找权威来源

| 事实 | 首选依据 | 限制 |
|---|---|---|
| 年度入选、星级、Bib、新晋 | 对应年度 Michelin 公告/名单；该版明确标识的详情/结构化数据 | 当前 NEW 标记、当前详情存在不证明历史名单；promoted 不自动等于新晋。 |
| 原名、原始 cuisine、地址、价格等级 | Michelin 对应 listing | 不按翻译猜身份，不把等级换算金额。 |
| 金额、电话、官网、当前营业变化 | 餐厅官网/菜单或明确官方来源 | 保留原价条件与币种；当前停业/搬迁独立于历史入选。 |
| 坐标 | 同一餐厅 Michelin JSON-LD；否则合适地图来源并核对名称与地址 | 统一输入 WGS84 约定；高德等提供的其他坐标系须按 P05 规则确认转换，不能原样冒充。 |
| cuisine_group | 本地 taxonomy/mappings 确定性派生 | 完整 raw 精确匹配；未知 OTHER，不造来源菜系。 |

中文/英文名、地址、价格、官网均允许按合同缺失，不为凑齐模板制造值。保留 listing URL 但记录其失效事实；KIBUN 当前下架不能推断停业，也不能删除其历史入选。

## 分店、改名、迁址与年度对账

采用官方稳定 ID 或归一化 listing URL。跨语种只移除 URL locale；地域及分店 slug 保留。同名不能合并。改名/URL 变化的人工例外写 aliases.from/to/evidence/reason，需明确一对一证据；有冲突先保留歧义，不猜匹配。

运行指南中的 data:diff，检查官方输入和所有匹配依据。报告明确区分年度退出、采集漏项和待核实，当前 status/address/website 变化单独列出。同版修订必须有 revision.id/reason/evidence，结合任务/Git 及发布内容摘要追溯。若需要保存搬迁前地址事实，在证据记录旧值与修订理由，不能静默覆盖历史含义。

## 位置与缺口

地图候选需对名称、城市、区街、建筑/分店上下文。来自搜索摘要、模糊同名、区中心、邻店/酒店默认点均不足以确认。多个餐厅同点只触发复核，确实共享建筑可能合法；不因重复自动删店或清空 flag。

缺可信坐标用省略或 null/null；候选可按 P02 标 geocode_success=false。0,0 不合法。geo_source 写实际来源，不伪造成功。名单完整度与可定位数量分别计算；合同可定位不代表 P05 的真实道路/建筑精度验收。

## 交接与异常恢复

保存输入名单、年度范围依据、采集/核验时间、来源材料、人工例外、全字段/身份迁移对账及命令退出码。报告证据缺口与它影响的结论，不以“校验通过”代替官方完整性。发布前运行指南规定的校验/覆盖/浏览器/性能门禁；任何门禁失败先保留日志并定位原因，不用空检查器或弱化断言绕过。

回滚恢复同一已检查候选的 catalog、年度文件、分类和构建；旧公开 JSON 由固定年度派生，不双写。网页合法 year/city/guide 链接保留；BC-01 的退役决定独立待定。独立维护者重放入口和开发证据见 [P03 tasks](../../openspec/changes/p03-versioned-guide-coverage/tasks.md)，最终验收不由实现者自签。
