---
title: "Tokyo 2026 米其林采集与接入交接"
service_version: "foodie-map working tree"
date: 2026-09-14
timezone: "Asia/Shanghai"
environment: "macOS arm64 / local production preview"
model_id: "not-applicable"
dataset_version: "tokyo-michelin-2026-partial"
purpose: "交付真实东京名单、最小接入、身份对账和验证证据，供主 Agent 验收"
baseline_ref: "fb7c22e50ea543a6d362092a2332aef9c78aebbe plus starting working tree"
---

本次交付 **269 家实际餐厅，年度名单仍为 partial，未勾选最终验收**。现行官网两个榜单已逐页、逐身份枚举并逐店采集；年度公告另外证明 KIBUN 入选，虽详情已下架仍保留。年度总名单还有 5 家身份未恢复。真实高德东京瓦片虽返回成功，但目前显示空白底图，空间精度不能验收。

## 文件与实现边界

- 正式餐厅：[星级](../../../public/data/tokyo/michelin-starred.json)、[Bib](../../../public/data/tokyo/michelin-bib-gourmand.json)。
- 分类：[taxonomy](../../../public/data/taxonomy/tokyo.json)、[mappings 数组](../../../public/data/taxonomy/tokyo-mappings.json)，37 个完整原始标签、20 个组（含 OTHER）。复合菜系不拆词，所有分组由现有 boarding 派生。
- 登记：`src/config/cities.ts` 末尾追加 Tokyo / 东京；保留既有城市顺序、路径、年度和默认城市。不建设 P03 catalog。
- **JPY 最小支持**：`src/data/contract.ts` 的同一 currencySchema 增加 JPY；`tests/unit/dataContract.test.ts` 验证原价/币种/日文搜索语义；`tests/unit/dataConsumers.test.tsx` 验证两端价格原文；接入指南增加使用说明。没有改价服务、地图投影或业务组件。
- 覆盖表：`scripts/render-coverage-table.py` 增加东京展示名，`npm run readme` 更新现有表格；接入指南另写明东京 partial，不修改其他城市的历史核验状态。
- 本目录保留采集脚本、身份证据与结果；`outputs/` 的网页、JSON-LD、日志和截图是本机材料，已由本目录 `.gitignore` 排除，**不在 public/data**。没有提交、推送或部署。

## 版次、地域与时间

采用 **2026 年版（东京第 19 版）**，并非根据采集年份推断。

1. [日本米其林正式发布](https://news.michelin.co.jp/articles/20250925-michelin-guide-tokyo-2026-selection-release)：2025-09-25 发布，官网/应用当天 **14:30 JST** 上线；书籍 2025-09-30 发售。
2. [米其林日文年度说明](https://guide.michelin.com/jp/ja/article/michelin-guide-ceremony/michelin-guide-tokyo-2026-stars-reveal)与[集团英文发布](https://www.michelin.com/en/publications/products-and-services/the-michelin-guide-tokyo-2026)：三星 12、二星 26、一星 122、Bib 114。
3. [下一版官方时间表](https://guide.michelin.com/en/article/news-and-views/michelin-guide-ceremony-tokyo-kyoto-osaka-nara-2027-selection-save-the-date)：Tokyo 2027 将于 **2027-02-16** 发布。因此采集时正式最新版是 2026，两个榜单同版。

实际采集于 **2026-09-14（Asia/Shanghai）**。逐页、逐店开始/完成时间保存在原始 capture JSON；紧凑时间、引用、SHA-256 见 [edition-evidence.json](edition-evidence.json)、[record-evidence.json](record-evidence.json)。英文杂志页部分显示 9 月 24 日，正文及日本正式发布明确 9 月 25 日；版次依据以日本正式发布时间为准。

地域按官方 `tokyo-region` 的 Tokyo 榜单，不使用半径搜索扩城。268 家取得地址的餐厅全部位于东京 23 特别区中的 19 区；没有横滨、千叶、埼玉或东京西部其他市町村。**已打开的 2026 官方发布未给出“仅限 23 区”的排他性范围文字，年度是否严格限 23 区仍待补官方依据**；不能把观测到的地址集合当成完整年度边界。KIBUN 尚无恢复的地址。没有采集 Michelin Selected、酒店或其他榜单。

## 身份对账与完整性

| 项目 | 官方年度 | 本次收录 | 合同可定位 | 年度缺口 |
|---|---:|---:|---:|---:|
| 三星 | 12 | 11 | 11 | 1 |
| 二星 | 26 | 26 | 26 | 0 |
| 一星 | 122 | 121 | 120 | 1 |
| 星级合计 | 160 | 158 | 157 | 2 |
| Bib | 114 | 111 | 111 | 3 |
| 合计 | 274 | 269 | 268 | 5 |

**现行在线身份集合已对齐，完整年度身份集合未恢复。** [list-identities.json](list-identities.json) 保存分页身份集合、官方餐厅 ID、详情 URL、分区和原文；[record-evidence.json](record-evidence.json) 对应生产文件内 ID、canonical、分店地址、详情获奖年份及原始文件。不会仅凭条数宣称年度完整。

- 星级确定性复查：三/二/一星分别 1/1/3 页，逐页为 11、26、48、48、24 家，合并 **157 个不同官方 ID**，无重复。详情 JSON-LD 均写 `award.dateAwarded=2026`，评级与列表一致。
- Bib 日文距离排序 3 页为 48、48、15 家，**111 个不同官方 ID**，无重复；逐店同样有 2026 获奖元数据。
- 默认排序与初次加载后的排序会变化，初次星级/Bib 页出现跨页重复；这些尝试没有当作完整集合，原始材料仍保留。抽取仅限主结果 `.js-restaurant__list_items`，排除推荐卡片（其中甚至有成都餐厅）。身份相同而 canonical slug 冲突会报错；不同分店不按店名合并。
- KIBUN / 氣分：2026 年度公告明确一星、现代料理、promoted，并链接真实详情 URL；当前访问返回“お店は見つかりませんでした”。保留年度事实和这个实际来源链接，地址、价格、币种、坐标不填，`geocode_success:false`。不把详情下架推断成停业。
- SÉZANNE 是缺失三星的**待查候选**，只恢复到官方 2025 文章和已下架详情，未找到 2026 身份依据，故没有以推断补入。另 1 家一星、3 家 Bib 的年度身份未知。要完成年度对账，需取得完整的官方 2026 书籍/电子书名录或该版官方保存名单，再逐 canonical/地址对照本次集合。

## 字段与分类

| 字段/状态 | 星级 158 家 | Bib 111 家 |
|---|---:|---:|
| 官方原名 / 官方英文 | 158 / 158 | 111 / 111 |
| 中文名 | 0 | 0 |
| 原始菜系 | 158 | 111 |
| 地址 / 币种 / 价格等级 | 157 / 157 / 157 | 111 / 111 / 111 |
| 实际金额原文 | 1 | 0 |
| 官方详情链接 | 158（KIBUN 已下架） | 111 |
| 电话 / 官网 | 154 / 114 | 100 / 54 |
| 该版明确 New=true | 11 | 16 |

日文详情标题的日文部分保存在 `name`，官方英文在 `name_en`；没有伪造中文名或新增 name_ja。地址使用日文原文。菜系采用详情可见的完整标签，例如 `フランス料理, 現代風料理`，不把结构化数据中的较短单标签覆盖它。

`is_new=true` 仅使用年度文章明确标为 **New** 的 11 家星级和 16 家 Bib；其余保持缺省，**promoted 不擅自等同首次收录**。这是保守的 New 标签口径，具体集合见 [annual-new-identities.json](annual-new-identities.json)。没有使用当前页面按月的 NEW 标记。

268 家的 `currency:JPY` 来自 Michelin JSON-LD 的 `currenciesAccepted`；`price_range` 保留 ¥ 等级，不推算金额。est 的价格是[其官网菜单](https://www.est-tokyo.com/menus/)明确的 **Dinner / TERROIR – EIGHT COURSES / JPY 27,000 / 包含 15% 服务费和适用税费**，保留英文原文条件，是 2026-09-14 现行特定晚餐菜单，非人均、非年度发布日菜单，也非均值。其他店没有制造金额；未使用任何 avg_price 字段。

boarding 两个榜单均执行 dry-run 后执行候选输出写入；逐对象比较确认仅增加 cuisine_group。星级 mapped=158，Bib mapped=111；两者 explicit-other=0、missing=0、unmapped=0。[候选合同验证](candidate-validation.json)调用现有 validateDataset 和 Tokyo DatasetContext，没有复制校验规则，没有运行 P02 migrate 工具。

## 坐标与真实预览

268 对坐标直接来自同一 Michelin 餐厅 JSON-LD 的 latitude/longitude，按项目 WGS84 约定存储，`geo_source:michelin_exact`；未预转 GCJ02，未批量添加 geocode_success=true。可定位数量是合同统计，不代表空间精度已验收。

两个相同坐标对均有独立餐厅身份和一致建筑地址，保留 warning：

- 星级 #133 広尾 石阪（2F）与 #135 飄香：渋谷区広尾 5-19-1。
- 星级 #44 スリオラ与 Bib #98 ぎんざ かつかみ弐：中央区銀座 6-8-7 交詢ビル 4F。

正式 Vite 构建、实际 Tokyo 文件、外部请求允许、全新浏览器上下文；没有拦截餐厅数据或替换瓦片。SW 绕过用于隔离内容预览。桌面 1280×800、移动 390×844 的过程与观测保存在 [preview-results.json](preview-results.json) 和 `outputs/preview/`。当前脚本修正记录也保留，最终结果须以最终结果文件为准，不把首次失败当作产品通过。

最终两端均完成：2026/tokyo 链接、星级→Bib 真实选择器切换、三个锚点的日文/英文精确搜索、est 的 JPY 原文和税费、KIBUN 无坐标详情且无飞行、菜系筛选（星级日本料理 48 家）、157 个标记与热力点的同集比较。两端 pageerror/console error 均为 0，未发现横向溢出。最终摘要汇合已通过的移动核心流程、桌面完整复跑和移动筛选补验，共 27 条观察记录；完整点集/网络结果在 `outputs/preview-final-full.json`。

视觉限制：桌面 est 较长的价格/地址卡片顶部会被现有搜索栏部分遮挡，移动端完整可读。当前 popup 布局/autoPan 属于既有 P04/P05/P06 行为，本次没有扩改业务组件；这项真实数据布局问题一并交主 Agent 处理，不能把 DOM 断言通过当作所有视觉细节均已验收。

三个空间分散的官方来源锚点：est（35.688162,139.763396）、HOMMAGE（35.718485,139.79699）、Yakumo Uezu（35.618768,139.67426）。标记、搜索飞行与热力图数值可分别检查；**真实 style=8 高德底图返回空白，不能核验道路/建筑相对位置或 ≤200m 误差**。没有修改原始坐标迁就瓦片，也没有把数值一致当成真实底图校准通过。

## 验证、基线与复跑

启动读取用户指定 RTK、README、开发/接入/来源文档、字段/分类/校验/展示/投影代码、boarding，以及 P02/P03/P04/P05 design/tasks。P03 仍无 catalog；P04/P05 按工作树承接，未更改 Packet 验收栏。启动 [git status](outputs/baseline-status.txt) 保存了大量已有未提交改动；没有 reset、clean、旧 HEAD 副本或改写既有数据。

实际环境：本机 Node 路径最初均报告 v26.7.0，故在本任务独立临时目录安装 Node **v24.21.0**；npm **11.19.0**，Python **3.14.0**。复跑按 `readme/development.md` 选择自己的 Node 24，勿依赖本机临时路径。使用仓库已安装的浏览器缓存，完整 E2E 覆盖 Chromium/WebKit。

已执行 `rtk npm run validate:data -- --json`、`rtk npm run check`、`rtk npm test`、`rtk npm run build`、`rtk npm run readme`、`rtk npm run test:e2e`。完整命令结果在本目录的日志与最终验证摘要中；构建存在 >500kB chunk 提示，数据重复坐标为 warning。首次 check 因任务脚本多余 global 注释失败，移除后复跑通过，未放宽 lint 规则。

| 命令 | 实际结果 |
|---|---|
| `rtk npm run validate:data -- --json` | exit 0；13 数据集，671 收录、652 合同可定位；0 error |
| `rtk npm run check` | exit 0；types/lint/data 通过 |
| `rtk npm test` | 最终 exit 0；12 文件、166 项通过（任务期间上游增加了 release 测试） |
| `rtk npm run build` | exit 0；Tokyo 原始路径与 release 内容哈希资产均存在 |
| `rtk npm run readme` | exit 0；13 数据集、671 条；历史状态未改为 verified |
| `rtk npm run test:e2e` | exit 0；50 项通过，包含既有 Chromium/WebKit 与 release 场景；fixture 测试不替代真实东京预览 |
| `rtk git diff --check` | exit 0 |
| 实际东京生产预览 | 两端交互/数据断言通过；真实地图精度与上述桌面遮挡保留缺口 |

一次浏览器重跑因自动审批服务 `429 Too Many Requests` 被拒绝，按用户 continue 指示重试同一命令后获准并完成；没有绕过审批。失败尝试按序保存在 `outputs/preview-*-attempt.*`，最后的正确脚本采用真实键盘输入、精确匹配 est（避免误选 ESTERRE），并在移动下一次搜索前关闭详情对话框。

[data-summary.json](data-summary.json)与[baseline-data-sha256.json](baseline-data-sha256.json)显示启动时 **24 个 public/data 既有文件逐字节未变**；其他城市/年度未改写。整体工作树仍包含其他开发任务变化，不能把整个 git diff 都算作本任务。

复跑采集使用 `fetch.mjs`（请求数组 `{key,url}`）、`enumerate.mjs`、`details.mjs`、`prepare.py`。请求入口、分页、原始路径在上述身份/版次证据中；`details.mjs` 跳过已成功保存的详情，可继续失败/缺失条目。`prepare.py` 只提取来源事实，boarding 和生产验证仍由仓库既有工具执行。缺失的年度身份需要先取得权威名录，不能靠脚本自动填补。

验收责任仍归主 Agent。本次未完成项：5 家年度身份、KIBUN 地址/位置、年度排他性 23 区范围依据、真实底图空间精度、桌面较长详情顶部遮挡；可选字段缺少不视作伪造填满的理由。
