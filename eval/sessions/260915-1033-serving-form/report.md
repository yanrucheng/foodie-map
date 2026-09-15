---
title: "东京 2026 serving_form 全量核实与阶段交接"
service_version: "0.3.0 / P08"
date: 2026-09-15
environment: "local"
model_id: "GPT-6"
dataset_version: "tokyo/2026：星级 158 条、必比登 111 条"
purpose: "先完成东京全部标签核实和本地更新，然后按用户要求暂停"
baseline_ref: "27e41b6ed25a1c52190726562d064e59883d5d89"
---

东京 269 条已逐条处理：补齐 266 条餐食和 1 条甜品，2 条因主要消费目的仍不清楚而保持字段省略。按用户中途明确的优先级，本阶段到东京结束；其他地区只做过证据采集，402 条餐厅记录及其年度/旧地址文件均未修改。

## 数量与年度边界

下表按「餐食 / 小食 / 甜品 / 饮品 / 未标注」列出前后数量。所有名单为 catalog 实际登记的 2026 年版。

| 地区 | 榜单 | 记录数 | 补标前 | 补标后 |
|---|---|---:|---|---|
| 东京 | 星级 | 158 | 0 / 0 / 0 / 0 / 158 | 157 / 0 / 1 / 0 / 0 |
| 东京 | 必比登 | 111 | 0 / 0 / 0 / 0 / 111 | 109 / 0 / 0 / 0 / 2 |
| **东京合计** | | **269** | **0 / 0 / 0 / 0 / 269** | **266 / 0 / 1 / 0 / 2** |

东京未标注由 269 条降至 2 条，267 条完成补标，覆盖率为 99.26%。小食和饮品为零只描述本轮已确定的结果，不意味着东京不存在这些消费形式。开始前没有任何已有 `serving_form` 值需要纠正。

星级/必比登的 coverage 仍是 `partial`，收录仍为 158/111，官方总数仍为 160/114，`verifiedAt=null`；本轮不核验或补回缺少的年度身份。全仓库仍为 671 条；其中 404 条未标注由东京 2 条和其他地区待继续的 402 条组成。

## 来源与判断

唯一餐厅维护源是 [东京星级年度文件](../../../public/data/tokyo/2026/michelin-starred.json)及[必比登年度文件](../../../public/data/tokyo/2026/michelin-bib-gourmand.json)。本轮使用 [P08 来源规则](../../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md#p08-labeling)。[汇总证据](source-evidence.json)为每条记录保存 dataset/id、原值状态、处理结果、判定规则、官方原文、URL、时间和材料哈希；它解释修订，不成为第二份餐厅维护源。

- 复用原东京采集中的 268 份官方详情。与原 [record-evidence.json](../260914-1037-tokyo-michelin/record-evidence.json) 的 268 个哈希全部吻合，canonical URL 及分店地址与年度记录逐条一致，均声明 2026 版；原采集日为 2026-09-14。
- KIBUN 使用 2025-09-25 发布的[东京 2026 新星公告](https://guide.michelin.com/jp/ja/article/michelin-guide-ceremony/michelin-guide-tokyo-2026-stars-reveal)。其小节直接链接相同 listing，并明确前半日式、后半法式的完整套餐。原公告缓存未登记哈希，本轮计算哈希，不将缺哈希误报为材料损坏。
- 边界案例补读同门店官方英文详情，以及 Michelin 链接的官网/菜单，采集日为 2026-09-15。官网用于补强 2026 官方介绍中的主营判断，证据中单列观察时间；不以当前页面的存在证明历史年度名单完整。
- 批量规则只应用于已阅读且可追溯的集合：整体供给为套餐/会席/咸食菜单，或以饭、面、寿司、主菜满足一餐的专门店，归餐食。没有将 `venue_type`、价格、店面大小、星级、菜系或一道招牌菜转换为标签。

典型案例：

| 门店（榜单内 id） | 结论 | 依据与容易混淆之处 |
|---|---|---|
| 山 / Yama（星级 146） | dessert | 2026 官方介绍整套体验围绕季节水果和甜味变化；[同址官网](https://yama-dessert.com/)自称「お菓子なレストラン」。星级和 Creative 菜系不决定其消费形式。 |
| 氣分 / KIBUN（星级 158） | meal | 年度公告明确完整日法套餐。详情已下架、缺地址和坐标都不妨碍依据历史材料补形式，也不据此改营业状态。 |
| おにぎり 浅草 宿六（必比登 7） | meal | [官方菜单](http://onigiriyadoroku.com/)列出两/三个饭团＋豆腐味噌汤＋沢庵午餐，同地址、同电话。单个可外带不等于主营小食。 |
| 焼鳥 山香（必比登 83） | meal | [官网](https://www.yakitori-sanka.jp/)明确烧鸟和一品料理以套餐提供，酒的选择是为了配合烧鸟。 |
| 立食い鮨 鮨川（必比登 89） | meal | 2026 介绍明确握寿司为唯一供给、没有酒肴；[官网](https://www.sushikawa.jp/)同店信息另有 15 贯套餐、午晚餐营业。站立或单贯起点是服务方式。 |
| 酒亭 田中（必比登 100） | meal | 官方明确点单为套餐，季节料理与烧鸟交替，亲子丼等收尾；店名含“酒”不代表以酒为主。 |
| シリーズ（星级 35）、宮坂（星级 16） | meal | 前者的“少量多皿”属于完整套餐；后者菓子和抹茶是茶怀石的收尾，都不改变餐食主营。 |

## 两条保留未标注

两条均保持原来的字段缺省，没有填入 null、unknown 或其他替代值。

| 门店 | 分店身份 | 已确认及不足 | 需要的信息 |
|---|---|---|---|
| [ヤマト / Yamato](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/yamato-1194199)，必比登 45 | 中央区日本桥富泽町 16-3 | 英日官方介绍同时强调围炉炭烤海鲜蔬菜与饮酒，没有食/酒主次、主食或套餐说明。官方链接 `www.8010tokyo.com` 本轮 HTTPS/HTTP 仅返回 `OK`，未取得菜单。 | 同一门店、适用于 2026 的全菜单/套餐，或明确的店家主营定位，以确定餐食、小食、饮品的主次。 |
| [鳥茂 / Torishige](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/torishige)，必比登 85 | 渋谷区代代木 2-6-5 | 英日官方介绍主要是沿革和串烧品种，没有套餐、主食或消费目的说明；listing 未提供官网。摊位出身、肉串本身、入选必比登都不足以决定分类。 | 同一门店、适用于 2026 的官方套餐/全菜单或店家用餐定位，以区分完整用餐、少量小吃及饮酒主导。 |

## 修改与对账

开始时工作树干净，基线提交为 `27e41b6ed25a1c52190726562d064e59883d5d89`。[baseline.json](baseline.json)保存初始工作树状态、时间及 29 个相关文件的 SHA-256；完整副本位于本地忽略目录 `outputs/baseline/`。

本阶段正式文件变更为两份东京年度数据、两份由 `data:aliases` 生成的旧地址副本、catalog 内东京两个 revision，以及接入指南自动覆盖摘要的输入哈希。另保留本任务证据、核实脚本和交接报告。前端、图标、颜色、枚举及 taxonomy 均未修改。

[audit.py](audit.py)逐条检查全仓库 671 条记录，确认顺序及 id 集合不变、没有增删餐厅、去除 `serving_form` 后对象完全相等；东京的全部 269 个处理结果与汇总证据一致。其他 11 份年度文件及 11 份旧地址副本与基线字节相同。catalog 只允许东京两个 revision 改动，coverage 和所有采集/核验日期保持原值。逐记录结果保存在本地 `outputs/reconciliation.json`，紧凑结果见 [verification.json](verification.json)。

复跑命令（仓库根目录，Node 24.21.0 / npm 11，按 `.nvmrc` 配置 PATH）：

```sh
rtk proxy python3 eval/sessions/260915-1033-serving-form/audit.py
rtk npm run data:aliases
rtk npm run readme
rtk npm run release:check
rtk npm run release:verify
rtk npm run check:repository
rtk git diff --check
```

`release:check` 包含 `check`（类型、lint、validate:data）、`npm test`、`check:coverage`、构建、生产产物浏览器集及性能预算。原始日志/抓取、基线快照和产物均为 local-only：本目录 `outputs/`、`test-results/` 和 `dist/`。官方端点为 `guide.michelin.com` 及汇总证据列出的门店官网；没有调用写入式外部 API。

校验结果：上述所有检查通过。`validate:data`、类型检查、lint、`check:coverage`、仓库大小/输出策略及 `git diff --check` 均通过；快速测试 15 个文件 / 213 项，浏览器测试 67 项全部通过。性能检查的当前最大数据集 LCP 中位数为 700 ms、1000 条夹具为 692 ms，CLS 中位数 0，交互 p95 为 89.9 ms，均在预算内。`release:check` 于 2026-09-15 10:58（Asia/Shanghai）完成，随后单独运行 `release:verify` 再次确认源及产物字节不变。构建 id：`7751cef4d8703ab57b5f53376f02cf2ab0dd7c8ba60d09a2ab54df1f74a03a6d`。校验中的既有位置维护提示和构建块大小提示没有触发门禁，本轮未修改位置或前端。

## 另列问题与后续边界

- 东京必比登 26「とんかつ 七井戸」的已有 2026 官方介绍写有秋季迁址休业信息，本轮没有改地址、坐标或营业状态；后续可作为独立事实修订核实。
- KIBUN 详情失效、地址和坐标未知及年度名单缺少的 2/3 个身份均是既有缺口，本轮未扩展其结论。
- 其他地区已经抓到的官方材料仅保留在本地 `outputs/`，还没有完成最终分类或落地。应在用户继续后处理；本阶段完成东京后暂停。

东京阶段已完成并暂停。没有推送、没有部署；其他地区等待继续指令。
