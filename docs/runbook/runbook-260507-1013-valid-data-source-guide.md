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
  - "plan-260914-2209-restaurant-visual-encoding"
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

## 当前名单来源边界

旧 11 份名单保留文件自报的 2026 年版；历史采集时间、官方年度范围和完整身份集合仍未知，保持 unverified。广州·深圳分别说明成员范围，当前详情 URL 不能证明历史名单完整；不把迁移日期当作采集日期。

东京的年度公告、在线身份和字段来源见 catalog 直接引用的[采集说明](../../eval/sessions/260914-1037-tokyo-michelin/report.md)及 edition/list/record 材料。2025-09-25 官方公告支持 2026 年版和 160 星级、114 Bib 总数；现存星级 157 个在线身份加年度 KIBUN 共 158，Bib 111，缺少 2/3 个年度身份，保持 partial、verifiedAt=null。观察到 19 个特别区不证明仅限 23 区。

年度文件是餐厅事实的维护源，catalog 负责发现与来源声明。JPY、KIBUN 缺坐标及其他已登记字段继续保留；当前营业状态不决定历史入选。旧无年路径是固定年度的派生副本，同版修订仍需填写 revision.id/reason/evidence。历史开发过程的迁移日志与候选压缩包已清理，接入和校验使用当前数据及本 runbook。

## 按字段找权威来源

| 事实 | 首选依据 | 限制 |
|---|---|---|
| 年度入选、星级、Bib、新晋 | 对应年度 Michelin 公告/名单；该版明确标识的详情/结构化数据 | 当前 NEW 标记、当前详情存在不证明历史名单；promoted 不自动等于新晋。 |
| 原名、原始 cuisine、地址、价格等级 | Michelin 对应 listing | 不按翻译猜身份，不把等级换算金额。 |
| 金额、电话、官网、当前营业变化 | 餐厅官网/菜单或明确官方来源 | 保留原价条件与币种；当前停业/搬迁独立于历史入选。 |
| 坐标 | 同一餐厅 Michelin JSON-LD；否则合适地图来源并核对名称与地址 | 统一输入 WGS84 约定；高德等提供的其他坐标系须按 P05 规则确认转换，不能原样冒充。 |
| cuisine_group | 本地 taxonomy/mappings 确定性派生 | 完整 raw 精确匹配；未知 OTHER，不造来源菜系。 |

中文/英文名、地址、价格、官网均允许按合同缺失，不为凑齐模板制造值。保留 listing URL 但记录其失效事实；KIBUN 当前下架不能推断停业，也不能删除其历史入选。

<a id="p08-labeling"></a>

## P08 消费形式与细分类别标注（本地实现已支持）

本节落实用户已确认的“四类图标＋自动颜色”。完整合同归 [P08 design](../../openspec/changes/p08-automatic-visual-encoding/design.md)，本节负责来源判断与标注操作。**当前 schema、boarding 透传、校验汇总和界面已支持 serving_form；正式数据补标仍是独立任务。** 命令继续使用[原接入入口](../../readme/data-onboarding-guide.md)，开发证据和独立验收状态见 [P08 tasks](../../openspec/changes/p08-automatic-visual-encoding/tasks.md)。

### 先判断主营消费形式

目标字段是可选的 `serving_form`，只有一个主值。查阅对应门店的官方介绍、菜单或有清楚语境的榜单说明，判断主营供给与主要消费目的：

| 值 | 选择依据 | 容易误判的情况 |
|---|---|---|
| meal（餐食） | 主要满足吃一顿饭 | 面馆、饺子馆、汉堡店也可能是餐食；不是高档或正式服务的代称。 |
| snack（小食） | 主要提供少量、随手吃或解馋的小吃 | 不能仅按旧 street_food、低价格、摊位、小份单品或某一道招牌菜推定。 |
| dessert（甜品） | 主营甜食，如冰激凌、蛋糕、糖水 | 餐厅供应餐后甜点不使整家店成为甜品；兼售咖啡仍要看主营。 |
| drink（饮品） | 主营咖啡、茶饮、奶茶、酒饮等 | 咖啡店兼售蛋糕不自动归为甜品；酒吧有小食不自动归为 snack。 |

有多种供给且来源不能确定主次，或来源不足时省略字段或填 null。空串、数组和非法业务值由正式校验拒绝；`unclassified` 只用于界面/统计，不能写入数据。不要填 unknown/other/mixed，不强行在四类中选一个。图标只是展示结果，不根据饺子/蛋糕图形反推门店类型。原 venue_type 按原义保留，不与 serving_form 批量复制、改名或双写。

在已有采集/任务材料中保留门店身份、参考来源和支持主营判断的简短说明。已有材料足够时直接引用，不要求新增逐店凭证文件、独立证明服务或重新抓取全部来源。更新历史年度要说明证据适用时间，不能用今天的菜单默默改写过去。

### 再确定用于颜色的细分类别

继续使用完整 `cuisine` 原文、taxonomy 和 mappings 派生的单值 `cuisine_group`。颜色维度允许风格和产品类别，显示为“菜系与品类”；不需要为本包新增纯风格字段、产品字段或层级分类树。

1. 查找现有各地区 taxonomy/mappings。相同含义复用稳定 key，展示名称可按城市使用不同语言或文字；不要因来源翻译差异新建同义 key。
2. 用来源支持的精度标注：法国菜可以归 FRENCH，寿司可以归 SUSHI；只有中国料理就保留已定义的 CHINESE，不根据所在城市、店名或菜单中的一个词猜地方菜。
3. 完整复合标签只登记一条确定映射。存在明确主体可选其代表类别；没有主体且无适用既有类别时用 OTHER，保留完整原文和判断说明。禁止运行时拆首词、翻译兜底或在记录里覆盖 mappings 结果。
4. 现有值无法诚实表达有依据的分类时，可增加 taxonomy key、中文/英文名称、sortOrder 和完整 raw mapping。新 key 采用既有大写 ASCII 格式；尽量命名为可跨城市复用的语义，不用城市/年份/颜色名充当类别。
5. 新增或修订 mappings 的依据使用已有 sources 或任务材料保存。旧 key 的合并需要全量检查其引用，不在单个地区悄悄改变同 key 的含义。

框架对任意合法非 OTHER key 自动配色；接入 Agent 不选择色值、不新增图标、不维护每城样式表。新 key 可能撞色是正常情况，不能为换颜色而改 key。语义分类尚未知导致的 OTHER 与“忘配颜色”是不同问题，前者按原合同汇总，后者由 P08 自动化消除。

### 生成、检查和交接

按原接入指南运行 boarding 和校验。boarding 只改变 cuisine_group，serving_form 和其他原始事实原样透传；修订形式由数据任务显式执行。

交接说明四类/未标注数量、未映射 raw、来源不足和修改字段范围。未标注比例不作为通过阈值，不为了通过把全部未知填成 meal。新地区只需更新真实数据、catalog、taxonomy/mappings 和必要来源材料，业务组件不增加城市分支。

当前正式旧数据没有 serving_form；P08 开发不会顺手补标。新的四类图标行为用隔离夹具验收，真实标注覆盖由数据 Agent 后续报告。规范化现有 SICHUAN / SICHUANESE 等同义 key 是单独数据修订，也不混入样式开发。

## 分店、改名、迁址与年度对账

采用官方稳定 ID 或归一化 listing URL。跨语种只移除 URL locale；地域及分店 slug 保留。同名不能合并。改名/URL 变化的人工例外写 aliases.from/to/evidence/reason，需明确一对一证据；有冲突先保留歧义，不猜匹配。

运行指南中的 data:diff，检查官方输入和所有匹配依据。报告明确区分年度退出、采集漏项和待核实，当前 status/address/website 变化单独列出。同版修订必须有 revision.id/reason/evidence，结合任务/Git 及发布内容摘要追溯。若需要保存搬迁前地址事实，在证据记录旧值与修订理由，不能静默覆盖历史含义。

## 位置与缺口

地图候选需对名称、城市、区街、建筑/分店上下文。来自搜索摘要、模糊同名、区中心、邻店/酒店默认点均不足以确认。多个餐厅同点只触发复核，确实共享建筑可能合法；不因重复自动删店或清空 flag。

缺可信坐标用省略或 null/null；候选可按 P02 标 geocode_success=false。0,0 不合法。geo_source 写实际来源，不伪造成功。名单完整度与可定位数量分别计算；合同可定位不代表 P05 的真实道路/建筑精度验收。

## 交接与异常恢复

维护当前数据需要的输入名单、年度范围依据、采集/核验时间、来源材料和人工例外；本轮变更运行身份对账与校验。报告证据缺口与它影响的结论，不以“校验通过”代替官方完整性。发布前运行指南规定的校验/覆盖/浏览器/性能门禁；任何门禁失败先保留日志并定位原因，不用空检查器或弱化断言绕过。

回滚恢复同一已检查候选的 catalog、年度文件、分类和构建；旧公开 JSON 由固定年度派生，不双写。网页合法 year/city/guide 链接保留；BC-01 的退役决定独立待定。新增覆盖直接按[数据接入指南](../../readme/data-onboarding-guide.md)执行，不依赖历史开发证据。日志、截图和候选快照写入被忽略的 test-results/ 或临时目录，完成本轮排障后即可清理。
