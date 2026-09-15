---
title: "六地区 2026 P09 主打体验核实与本地交接"
service_version: "P09 / foodie-map"
date: 2026-09-15
environment: "local / Node 24.21.0"
model_id: "GPT-6"
dataset_version: "6 regions / 11 guides / 402 records; full catalog 671"
purpose: "东京验收后完成剩余地区的逐店主打体验核实与本地更新"
baseline_ref: "27e41b6ed25a1c52190726562d064e59883d5d89"
---

本阶段逐店审核其余 6 个地区、11 份榜单共 402 条，新增 **398** 个 `dining_category`，4 条因官方 listing 失效且未恢复可靠正文而保留字段省略。与已验收的东京合并，全库 **656/671** 条已标注，15 条未标注。全库餐厅数仍为 671、可定位仍为 652，已有价格全部原样保留；没有新增价格等级。

东京两份年度数据、两份旧地址副本与已验收的筛选界面均未改动。筛选区仍只显示类别名和数量，不重新加入“其中未标注”括号或提示。没有推送、没有部署。

[来源总览](source-evidence.json)链接各城市的逐店原文、身份、标签、理由及时间；[分布 JSON](distribution.json)来自生产 `diningDistribution`；[保护对账](reconciliation.json)核对本阶段实际未提交工作区；[其他事实疑点](followups.json)单独记录，未据此改写受保护字段。东京的来源与剩余 11 家见[前一阶段报告](../260915-1826-tokyo-dining/report.md)。

## 本地验收与城市进度

本地预览沿用 `http://127.0.0.1:4173/`；该服务现提供本轮完整门禁通过的新构建。可在以下入口切换榜单检查。

| 地区 | 本阶段审核 | 新增标签 | 未标注 | 来源 | 预览 |
|---|---:|---:|---:|---|---|
| 北京 | 58 | 57 | 1 | [beijing-evidence.json](beijing-evidence.json) | [星级](http://127.0.0.1:4173/?city=beijing&year=2026&guide=michelin-starred) |
| 广州·深圳 | 64 | 64 | 0 | [guangzhou-shenzhen-evidence.json](guangzhou-shenzhen-evidence.json) | [星级](http://127.0.0.1:4173/?city=guangzhou-shenzhen&year=2026&guide=michelin-starred) |
| 上海 | 86 | 84 | 2 | [shanghai-evidence.json](shanghai-evidence.json) | [星级](http://127.0.0.1:4173/?city=shanghai&year=2026&guide=michelin-starred) |
| 成都 | 13 | 13 | 0 | [chengdu-evidence.json](chengdu-evidence.json) | [星级](http://127.0.0.1:4173/?city=chengdu&year=2026&guide=michelin-starred) |
| 澳门 | 34 | 34 | 0 | [macau-evidence.json](macau-evidence.json) | [星级](http://127.0.0.1:4173/?city=macau&year=2026&guide=michelin-starred) |
| 香港 | 147 | 146 | 1 | [hong-kong-evidence.json](hong-kong-evidence.json) | [星级](http://127.0.0.1:4173/?city=hong-kong&year=2026&guide=michelin-starred) |

## 来源年份与经营观察

394 家复用了上次采集保存的对应 Michelin 正文。本轮重新逐店阅读，并核对保存 HTML 的 SHA-256、原文摘录及归一化后的地域/城市/门店身份。每个标签均独立判断主打体验，没有使用视觉预览的试分，也没有将 serving_form 或 cuisine_group 转换为新标签。

原有 395 份有正文的非东京材料中，澳门 Aji 的短链接实际跳到西班牙 Barcelona 同名店，本轮排除这份材料。澳门另有三条失效短 slug，补查得到带数字门店编号的正确 listing，均明确 2026 版，且名称与澳门分店地址相符：泓 `mizumi-1215974`、瑞兆 `zuicho-1214683`、當奥豐素 `don-alfonso-1890-1212351`。原数据的 guide_url 属于受保护字段，未修改；新链接和对应关系只登记到来源证据。

Aji 改用美高梅澳门官方门店页，并以 2024-09-25 的官方经营转型公告补强“亚洲料理酒馆”的持续定位。其他补强材料包括大鸽饭与 New Punjab Club 的品牌官网、北京旅游局对同址柴氏牛肉面的介绍，以及澳门酒店的门店说明。搜索结果只用于找入口，不用生成式搜索摘要或其他同名门店来定标签。

**成都的时间边界须单独保留：** catalog 登记 2026；当前 13 份 Michelin 页面颁奖版次为 2027，但经营介绍发布于 **2026-09-02**，采集于 **2026-09-15**。本轮标签是此次对同一门店的现行经营体验注记，依据该实际已发布的经营描述；不将它改写为 2026 版来源，不声称恢复了 2026 全年历史菜单、当年完整获奖集合或旧地址的有效性。每条成都证据均记录 `data_edition_year=2026`、`source.edition_year=2027` 及该限制。检索到的 2026 标题媒体报道只作版本线索，未据此提升 coverage 或修改评级。

其余地区采用的 Michelin listing 原文均明确 2026 版；新增官网材料按 2026-09-15 现状记录，有明确旧公告日期的另列发布日期。所有榜单的 coverage、officialCount、verifiedAt、collectedAt、scope 及成员核验状态均维持开工值。

## 城市 × 年度 × 榜单：八类与缺省

表中列依次为 staple、meat、seafood、dessert_drink、french、chinese、japanese_course、other、unclassified。显式 other 为已作出的未单列料理判断，与未标注分开；没有为了降低集中度分配配额。

| 地区 | 年度 | 榜单 | 收录 | 面饭面点 | 肉食 | 鱼鲜 | 甜饮 | 法式 | 中餐 | 会席 | other | 未标注 |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 香港 | 2026 | 必比登 | 70 | 25 | 8 | 3 | 3 | 0 | 22 | 0 | 8 | 1 |
| 香港 | 2026 | 星级 | 77 | 1 | 5 | 9 | 0 | 13 | 27 | 4 | 18 | 0 |
| 北京 | 2026 | 必比登 | 26 | 5 | 2 | 3 | 0 | 0 | 15 | 0 | 1 | 0 |
| 北京 | 2026 | 星级 | 32 | 0 | 2 | 6 | 0 | 3 | 15 | 0 | 5 | 1 |
| 广州·深圳 | 2026 | 星级 | 20 | 1 | 0 | 1 | 0 | 0 | 15 | 0 | 3 | 0 |
| 广州·深圳 | 2026 | 必比登 | 44 | 9 | 8 | 2 | 0 | 0 | 22 | 0 | 3 | 0 |
| 上海 | 2026 | 星级 | 51 | 1 | 3 | 7 | 0 | 2 | 29 | 0 | 8 | 1 |
| 上海 | 2026 | 必比登 | 35 | 14 | 0 | 4 | 0 | 1 | 12 | 0 | 3 | 1 |
| 成都 | 2026 | 星级 | 13 | 0 | 0 | 2 | 0 | 0 | 8 | 0 | 3 | 0 |
| 澳门 | 2026 | 星级 | 21 | 0 | 0 | 2 | 0 | 2 | 12 | 1 | 4 | 0 |
| 澳门 | 2026 | 必比登 | 13 | 3 | 0 | 1 | 0 | 0 | 3 | 0 | 6 | 0 |
| 东京 | 2026 | 星级 | 158 | 1 | 5 | 29 | 1 | 43 | 6 | 38 | 24 | 11 |
| 东京 | 2026 | 必比登 | 111 | 31 | 14 | 14 | 0 | 17 | 5 | 4 | 26 | 0 |
| 全库 | 2026 | 合计 | 671 | 91 | 47 | 83 | 4 | 81 | 191 | 47 | 112 | 15 |

## 价格等级

670 条既有有效等级及 KIBUN 的 1 条缺失保持原样。港澳 `$` 未改成 `¥`，前端仍在展示副本上统一角标。以下等级 1–4 是生产解析器的诊断计数，未写入餐厅数据；没有从实际金额、评级或地区推算等级。

| 地区 | 年度 | 榜单 | 等级 1 | 等级 2 | 等级 3 | 等级 4 | 缺失 | 无法识别 |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| 香港 | 2026 | 必比登 | 22 | 36 | 12 | 0 | 0 | 0 |
| 香港 | 2026 | 星级 | 0 | 15 | 33 | 29 | 0 | 0 |
| 北京 | 2026 | 必比登 | 8 | 18 | 0 | 0 | 0 | 0 |
| 北京 | 2026 | 星级 | 0 | 2 | 17 | 13 | 0 | 0 |
| 广州·深圳 | 2026 | 星级 | 0 | 6 | 10 | 4 | 0 | 0 |
| 广州·深圳 | 2026 | 必比登 | 23 | 21 | 0 | 0 | 0 | 0 |
| 上海 | 2026 | 星级 | 0 | 5 | 22 | 24 | 0 | 0 |
| 上海 | 2026 | 必比登 | 13 | 22 | 0 | 0 | 0 | 0 |
| 成都 | 2026 | 星级 | 0 | 3 | 5 | 5 | 0 | 0 |
| 澳门 | 2026 | 星级 | 0 | 2 | 10 | 9 | 0 | 0 |
| 澳门 | 2026 | 必比登 | 2 | 11 | 0 | 0 | 0 | 0 |
| 东京 | 2026 | 星级 | 0 | 1 | 68 | 88 | 1 | 0 |
| 东京 | 2026 | 必比登 | 40 | 71 | 0 | 0 | 0 | 0 |

## 集中度前后对比

“前”是本阶段开工时状态：东京已经补标，其他地区全部缺省。最大组的分母都是该榜单 listed；图标 other 合并显式 other 与缺省，分类表则分开；无价或无法识别价格合并为 no-badge。

| 地区 / 年度 / 榜单 | 最大图标组：前 → 后 | 最大同图标同价位组：前 → 后 |
|---|---|---|
| 香港 / 2026 / 必比登 | other 70（100.00%） → staple 25（35.71%） | other:2 36（51.43%） → staple:1 15（21.43%） |
| 香港 / 2026 / 星级 | other 77（100.00%） → chinese 27（35.06%） | other:3 33（42.86%） → chinese:3 18（23.38%） |
| 北京 / 2026 / 必比登 | other 26（100.00%） → chinese 15（57.69%） | other:2 18（69.23%） → chinese:2 14（53.85%） |
| 北京 / 2026 / 星级 | other 32（100.00%） → chinese 15（46.88%） | other:3 17（53.12%） → chinese:3 11（34.38%） |
| 广州·深圳 / 2026 / 星级 | other 20（100.00%） → chinese 15（75.00%） | other:3 10（50.00%） → chinese:3 8（40.00%） |
| 广州·深圳 / 2026 / 必比登 | other 44（100.00%） → chinese 22（50.00%） | other:1 23（52.27%） → chinese:2 15（34.09%） |
| 上海 / 2026 / 星级 | other 51（100.00%） → chinese 29（56.86%） | other:4 24（47.06%） → chinese:3 16（31.37%） |
| 上海 / 2026 / 必比登 | other 35（100.00%） → staple 14（40.00%） | other:2 22（62.86%） → chinese:2 10（28.57%） |
| 成都 / 2026 / 星级 | other 13（100.00%） → chinese 8（61.54%） | other:3 5（38.46%） → chinese:3 3（23.08%） |
| 澳门 / 2026 / 星级 | other 21（100.00%） → chinese 12（57.14%） | other:3 10（47.62%） → chinese:3 10（47.62%） |
| 澳门 / 2026 / 必比登 | other 13（100.00%） → other 6（46.15%） | other:2 11（84.62%） → other:2 6（46.15%） |
| 东京 / 2026 / 星级 | french 43（27.22%） → french 43（27.22%） | french:3 24（15.19%） → french:3 24（15.19%） |
| 东京 / 2026 / 必比登 | staple 31（27.93%） → staple 31（27.93%） | staple:1 25（22.52%） → staple:1 25（22.52%） |

11 份新处理榜单的最大图标组都由全未标注的 100% 降低，但没有要求每类均匀。广州·深圳星级仍有 15/20 家归中餐（75%）：这些是完整粤菜、潮州菜、川菜或福建菜菜单，只有一道鸡、蟹或面食招牌不代表整店食品主轴。澳门星级最大同图标同价位组仍是 10/21（47.62%），只是从通用图标＋三级变为中餐＋三级，该项数量**没有下降**。其他表中数值按实际结果报告。

改善全部来自已核实的标签，价格没有任何变化。主要区分来自以下门店经营定位：

| 案例 | 判定 | 依据与边界 |
|---|---|---|
| 北京爆肚金生隆、牛街满恒记 | meat | 十三种爆肚/涮羊肉为核心，不因原“火锅”字样直接推断。 |
| 北京晟永兴、大董；上海大董、晟永兴 | meat | 官方明确顾客主要为烤鸭而来，或品牌旗舰以烤鸭为核心。其他综合京菜店的一道鸭菜没有自动转成肉食。 |
| 北京静一、钱塘花园、鲁采；上海荣府宴、人和馆、甬府 | seafood | 正文直接说明菜单重河鱼、每日活鲜自选、seafood-forward 或 fish-focused 等主轴。 |
| 广州大鸽饭、容意发牛杂、文记壹心鸡、同记 | meat | 分别有官网乳鸽系列、牛羊杂与骨髓、key draw 鸡、顾客主要为白切鸡而来的明示依据。大鸽饭没有因店名的“饭”转成面饭。 |
| 广州香港庙街煲仔饭、上海绿波廊、何洪记、菰城宴 | staple | 近三十款煲仔饭、明确点心 key draw、明确 noodle shop、明确以羊肉汤面为重点；复合菜系逐店查证。 |
| 香港 Noi、Neighborhood、Plaisance、甬府 | seafood | 完整套餐/菜单分别明确 strong seafood slant、seafood-heavy、seafood-led、fish-centric。 |
| 香港 New Punjab Club | meat | 官网直接称 meat-centric menu 与 tandoor grillhouse，原印度/巴基斯坦菜系不变。 |
| 香港竹家 | meat | 虽原标签“日本菜”，官方直接称 yakitori shop。 |
| 香港 Godenya、割烹凜、長本、Ryota；澳门瑞兆 | japanese_course | 明确多道割烹、怀石或 omakase 菜序依据；不由“日本菜”或星级推定。 |
| 澳门泓 | other | 官方明确寿司、铁板烧、天妇罗三区及综合单点，不能仅凭日本菜和有套餐就认作会席。 |
| 香港暖心芝作、佳佳甜品、香蕉仔 | dessert_drink | 黑芝麻甜品系列、甜汤专门经营、香蕉甜薄饼为主；不由街头小吃标签统一分类。 |
| 成都许家菜、漾亚·雍雅合鲜 | seafood | 2026-09-02 更新的现行说明直接强调河海鱼为主、活鱼和自有鱼场；适用边界见成都时间说明。 |

## 未核实记录与其他事实疑点

本阶段以下 4 条保持原有字段省略状态。它们不是显式 other，也没有用原菜系或名称代替新一轮可靠来源核实。

| 地区 / 榜单 / id | 门店 | 剩余缺口 |
|---|---|---|
| 北京 / 星级 / 9 | [止观小馆 / Zhiguan Courtyard](https://guide.michelin.com/en/beijing-municipality/beijing/restaurant/zhiguan-courtyard) | 原 listing 404；未恢复同一分店可保存的官方经营正文或菜单。 |
| 香港 / 必比登 / 15 | [潮樂園 / Chiuchow Delicacies](https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurant/chiuchow-delicacies) | 原 listing 404；未恢复同一分店可保存的官方经营正文或菜单。 |
| 上海 / 星级 / 2 | [壹零贰小馆 / 102 House](https://guide.michelin.com/en/shanghai-municipality/shanghai/restaurant/102-house) | 原 listing 404；未恢复同一分店可保存的官方经营正文或菜单。 |
| 上海 / 必比登 / 2 | [阿娘面 / A Niang Mian](https://guide.michelin.com/us/en/shanghai-municipality/shanghai/restaurant/a-niang-mian-guan) | 原 listing 404；未恢复同一分店可保存的官方经营正文或菜单。 |

加上东京此前保留的 11 家，共 15 条未标注。东京 KIBUN 仍缺价格等级，未从其他信息估填。

完整的原地址/来源地址差异保存在 followups.json；其中包含格式、空格、拼写及邮编差异，不能把全部文本差异都称为迁址。以下事项需要另行核实，均未在本轮修改：

- 澳门 Aji 的原 URL 跳到西班牙同名店；泓、瑞兆、當奥豐素的短 slug 需要核实是否更新为新的带编号 URL。
- 上海逸采：原 cuisine/cuisine_group 为素食/VEGETARIAN，官方同一 listing 为江浙家常菜并明确有鱼；原中文地址也与其英文地址及来源地址不一致。本轮只填 chinese，原菜系、地址、坐标全部保留。
- 香港 Tate、Ying Jee Club、Zhejiang Heen，以及成都芳香景、许家菜的来源街址与原记录明显不同；L’Atelier、Ami、Roganic、广州愉粤轩、成都蔻等有铺号或楼层差异。需要独立核实后决定是否修订。
- 香港 8½ Otto e Mezzo 与上海成隆行的官方正文包含暂时关闭提示；原 status 保留，不抹去历史收录事实。
- 成都来源版次为 2027，catalog 仍为 2026；这仍是年度完整性与来源版本边界，不因经营标签补充而解决。

## 身份与非授权字段保护

开工基线是 2026-09-15 20:06（Asia/Shanghai）的实际工作区，包含前面东京标签和用户验收后的 UI 调整，以及原有全部未提交修改。[baseline.json](baseline.json)记录 299 个已有文件哈希与 Git 状态；完整数据快照在 local-only 的 outputs/baseline/，不是用 HEAD 代替当前文件。

本轮只改 11 份年度 JSON 的 dining_category、11 份由 data:aliases 派生的固定年度旧地址副本、catalog 中对应 11 个 provenance 的来源/revision，以及接入指南的自动覆盖摘要。新增 evidence 保存先前 revision，组成同版修订追溯链；年度源仍是唯一餐厅维护文件。

[data_ops.py](data_ops.py)逐条核对完整原对象哈希（只将 dining_category 恢复到开工状态）、记录顺序与身份集合，并核对 catalog 除授权 provenance 外的全部字段。实际对账通过：402 条本阶段记录的名称、评级、坐标、cuisine/cuisine_group、serving_form/venue_type、价格、营业状态、URL 及其他原字段未变；东京全部记录和 275 个其他已有文件字节未变，包含已经验收的业务代码、UI 测试和历史任务材料。旧地址与各自固定年度源字节一致。

## 实际验证命令

Node/npm 前缀为 `rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH`；Python 仅标准库并通过 RTK 调用。脚本从仓库根执行。

| 命令 | 结果 / 证据 |
|---|---|
| `rtk proxy python3 eval/sessions/260915-2006-regional-dining/data_ops.py apply --city <city>` | 按北京、广州·深圳、上海、成都、澳门、香港分批应用，累计新增 398 条。 |
| `npm run data:aliases` | 通过，更新固定年度旧地址副本。 |
| `npm run readme` | 通过，仅更新覆盖输入摘要；条数与名单状态不变。 |
| `node scripts/data-contract.ts --json` | valid=true；详细 [validation.json](outputs/validation.json)。 |
| `node eval/sessions/260915-2006-regional-dining/summarize.mjs` | 使用生产模块生成 distribution.json。 |
| `rtk proxy python3 eval/sessions/260915-2006-regional-dining/data_ops.py audit` | passed，见 reconciliation.json。 |
| `npm run check:repository` | 文件大小及运行输出策略通过。 |
| `rtk git diff --check` | 通过。 |
| `npm run release:check -- --output test-results/p09-regional-data/release` | 通过：六个阶段全部 exit 0；使用本轮最终数据。 |
| `npm run release:verify -- --output test-results/p09-regional-data/release` | 通过：本轮源码与产物一致，exit 0。 |

首轮门禁在 lint 阶段发现上一阶段留下的 local-only 截图脚本被当成源码扫描。已将该运行产物改为 `.mjs.snapshot` 扩展名，并重新执行完整门禁；未改业务代码或弱化 lint 规则。[首次失败日志](outputs/release-attempt1.log)保留，不计为通过。

门禁包含类型、lint、数据校验、快速测试、check:coverage、一次正式构建、消费该产物的浏览器测试及性能测量。旧东京发布凭据不能证明本轮数据已通过，当前使用独立的输出目录。

代码基线提交：`27e41b6ed25a1c52190726562d064e59883d5d89`。外部只读端点为 guide.michelin.com、各门店/酒店官网及证据中列出的旅游机构页面；未提交预约、消息或其他外部写操作。捕获工具 [capture.mjs](capture.mjs) 与 [fetch.py](fetch.py)只读取明确 URL，不自动分类。原始 HTML、请求清单、临时判断草稿与日志位于本 session 的 outputs/；完整门禁产物位于 test-results/p09-regional-data/ 和 dist/，均为 local-only。最终逐店来源、理由、汇总和核对保留在 session 根目录。

## 最终门禁与真实地图抽查

最终门禁于 **2026-09-15 21:27–21:31（Asia/Shanghai）**运行并通过：check（类型、lint、validate:data）、快速测试、覆盖检查、一次构建、生产浏览器及性能六阶段全部退出 0。快速测试 **15 文件 / 248 项通过**，浏览器 **68 项通过、0 失败、0 跳过**。数据校验为 valid=true、0 error，14 条既有重复坐标维护 warning 保留，未通过改坐标或弱化规则消除提示。

随后独立运行 `release:verify`，退出 0，确认源代码、锁文件、数据/本地来源证据以及全部构建产物与本轮凭据一致；再次核对最终字段，身份、价格、其他受保护字段与东京已验收部分均未变。

性能为受控实验室结果：当前最大名单 LCP 中位数 **696ms**，1000 条夹具 **684ms**；CLS 均为 **0**；20 次交互 p95 **79.3ms**。预算全部通过，不把它当成线上用户指标或真实底图精度证明。

另在本地生产预览中打开了全部 **11 份**新处理榜单：每份的类别按钮顺序、合计与八类分布均匹配正式数据，筛选区没有“未标注”括号或提示。页面读取的 buildId 与本轮构建一致。所有页面均观察到真实底图瓦片加载；截图只是当前视口抽样，不代表新的 P05 精度/全域覆盖认证。另操作了香港、广州·深圳和北京的聚合/缩放控件并保留截图；标记和图形数量只作为 DOM 读数，截图中仍可见聚合点，因此不将这些读数称为屏幕独立图标数量或遮挡率验收。

[全部榜单页面读数](../../../test-results/p09-regional-data/preview.json)、[香港放大截图](../../../test-results/p09-regional-data/hong-kong-zoom.png)、[广州·深圳放大截图](../../../test-results/p09-regional-data/guangzhou-shenzhen-zoom.png)、[北京放大截图](../../../test-results/p09-regional-data/beijing-zoom.png)。

构建 ID：`35a0fde16682cd1c9687af5417b2060f0fa1a424b60ec7b69d7e6d36da88cf27`。

产物 SHA-256：`aec8c3ca8dfc08c8d2148b599dcd55d2a7669772d9308ad26ea7a8ca243a1ade`。

[紧凑验证记录](verification.json)、[最终发布凭据](../../../test-results/p09-regional-data/release/verified.json)、[完整门禁日志](outputs/release-check.log)保存实际结果及本次来源文件哈希。来源与覆盖摘要已更新，原名单 coverage 没有提升。此处报告本地执行结果，不代签用户对标签语义的人工验收；未推送、未部署。
