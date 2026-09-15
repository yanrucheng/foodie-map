---
title: "东京 2026 P09 主打体验核实与本地交接"
service_version: "P09 / foodie-map"
date: 2026-09-15
environment: "local / Node 24.21.0"
model_id: "GPT-6"
dataset_version: "tokyo/2026: starred 158, Bib 111"
purpose: "按当前工作区逐店补充 dining_category，交用户验证后再继续其他城市"
baseline_ref: "27e41b6ed25a1c52190726562d064e59883d5d89"
---

东京 269 条均已逐店审核，新增 258 个 `dining_category`；星级 147/158、必比登 111/111。11 家星级餐厅的套餐结构仍缺足够依据，保持字段省略。没有新增价格：268 条既有等级全部保留，氣分／KIBUN 的 1 条缺价继续缺失。其他 6 个地区的 402 条只盘点、未补标；按用户最新顺序，东京交验后暂停。

实际年度数据：[星级](../../../public/data/tokyo/2026/michelin-starred.json)、[必比登](../../../public/data/tokyo/2026/michelin-bib-gourmand.json)。[逐店证据](source-evidence.json)包含身份、原值存在状态、标签、理由、原始菜系、官方摘录、URL、适用年度、采集时间与哈希；[分布 JSON](distribution.json)使用生产 `diningDistribution`；[对账结果](reconciliation.json)保护开工时已有的未提交修改。

本地预览：[东京星级](http://127.0.0.1:4173/?city=tokyo&year=2026&guide=michelin-starred)、[东京必比登](http://127.0.0.1:4173/?city=tokyo&year=2026&guide=michelin-bib-gourmand)。这是本地构建预览，未推送、未部署。

## 城市 × 年度 × 榜单分类与价格

类别列依次对应：面饭面点、肉食、鱼鲜、甜饮、法式、中餐、日式会席、显式 other、未标注。其合法键分别是 `staple / meat / seafood / dessert_drink / french / chinese / japanese_course / other`；未标注保持缺省。东京之外的行仅为本阶段结尾的实际库存，全部维持开工值。

| 地区 | 年度 | 榜单 | 收录 | 面饭 | 肉 | 鱼鲜 | 甜饮 | 法式 | 中餐 | 会席 | other | 未标注 |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 香港 | 2026 | 必比登 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 70 |
| 香港 | 2026 | 星级 | 77 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 77 |
| 北京 | 2026 | 必比登 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 26 |
| 北京 | 2026 | 星级 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 32 |
| 广州·深圳 | 2026 | 星级 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20 |
| 广州·深圳 | 2026 | 必比登 | 44 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 44 |
| 上海 | 2026 | 星级 | 51 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 51 |
| 上海 | 2026 | 必比登 | 35 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 35 |
| 成都 | 2026 | 星级 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 |
| 澳门 | 2026 | 星级 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 21 |
| 澳门 | 2026 | 必比登 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 |
| 东京 | 2026 | 星级 | 158 | 1 | 5 | 29 | 1 | 43 | 6 | 38 | 24 | 11 |
| 东京 | 2026 | 必比登 | 111 | 31 | 14 | 14 | 0 | 17 | 5 | 4 | 26 | 0 |

全库仍收录 671 条，可定位 652 条；未标注为 413 条（东京 11＋其他地区 402）。本阶段没有增加/删除餐厅。

价格列为解析后的官方等级数量；原始 `price_range` 未重写，港澳 `$` 保持原样。缺价点位不显示角标；没有把实际金额转成价格等级。

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

## 集中度与变化来源

分母均为该榜单 `listed`。图标组里的 other 包含显式 other 与未标注，分类统计则分开；未补标时的通用图形不表示已判为 other。无价/不可识别价格在同图标同价位统计中合并为 no-badge。

| 地区 / 年度 / 榜单 | 最大图标组：原 → 现 | 最大同图标同价位组：原 → 现 |
|---|---|---|
| 香港 / 2026 / 必比登 | other 70（100.00%） → other 70（100.00%） | other:2 36（51.43%） → other:2 36（51.43%） |
| 香港 / 2026 / 星级 | other 77（100.00%） → other 77（100.00%） | other:3 33（42.86%） → other:3 33（42.86%） |
| 北京 / 2026 / 必比登 | other 26（100.00%） → other 26（100.00%） | other:2 18（69.23%） → other:2 18（69.23%） |
| 北京 / 2026 / 星级 | other 32（100.00%） → other 32（100.00%） | other:3 17（53.12%） → other:3 17（53.12%） |
| 广州·深圳 / 2026 / 星级 | other 20（100.00%） → other 20（100.00%） | other:3 10（50.00%） → other:3 10（50.00%） |
| 广州·深圳 / 2026 / 必比登 | other 44（100.00%） → other 44（100.00%） | other:1 23（52.27%） → other:1 23（52.27%） |
| 上海 / 2026 / 星级 | other 51（100.00%） → other 51（100.00%） | other:4 24（47.06%） → other:4 24（47.06%） |
| 上海 / 2026 / 必比登 | other 35（100.00%） → other 35（100.00%） | other:2 22（62.86%） → other:2 22（62.86%） |
| 成都 / 2026 / 星级 | other 13（100.00%） → other 13（100.00%） | other:3 5（38.46%） → other:3 5（38.46%） |
| 澳门 / 2026 / 星级 | other 21（100.00%） → other 21（100.00%） | other:3 10（47.62%） → other:3 10（47.62%） |
| 澳门 / 2026 / 必比登 | other 13（100.00%） → other 13（100.00%） | other:2 11（84.62%） → other:2 11（84.62%） |
| 东京 / 2026 / 星级 | other 158（100.00%） → french 43（27.22%） | other:4 88（55.70%） → french:3 24（15.19%） |
| 东京 / 2026 / 必比登 | other 111（100.00%） → staple 31（27.93%） | other:2 71（63.96%） → staple:1 25（22.52%） |

东京星级最大图标组由 158/158 降至法式 43/158；最大同图标同价位组从通用图标＋四级的 88/158 降至法式＋三级的 24/158。必比登最大图标组由 111/111 降至面饭 31/111；最大同图标同价位组从通用图标＋二级的 71/111 降至面饭＋一级的 25/111。全部改善来自主打体验核实，价格、原菜系、地图坐标和餐厅身份均未改动；没有分配比例配额。

建议在真实地图抽查以下边界。每条的完整依据在逐店证据中，可以按榜单和 id 查找。

| 门店 | 榜单 / id | 标签 | 关键依据 |
|---|---|---|---|
| アビス／Abysse、ネモ／NéMo | 星级 6、107 | seafood | 法餐原标签下明确以海产/鱼介传达四季。 |
| 一平飯店 | 星级 122 | seafood | 官方直接称鱼介为主，点心只是一部分。 |
| プリモ パッソ／Primo Passo | 星级 132 | staple | 全套餐以多种意面展开，区别于综合意餐。 |
| ボッテガ／BOTTEGA | 星级 75 | other | 官网菜单并列前菜、意面、肉主菜；不能因手打面著名就认定面食专门店。 |
| 天 よこた | 星级 105 | seafood | 明确“以虾为轴”，区别于混合食材的天妇罗。 |
| 天雅 | 星级 57 | japanese_course | 官方说明天妇罗与会席比重相当，且列先付、椀物、造里。 |
| 醍醐 | 星级 48 | japanese_course | 官网直接称“怀石形式的精进料理”，有完整菜序；不是由素食标签转换。 |
| 龍吟 | 星级 82 | japanese_course | 河豚尽食仅限 1–3 月；官网全年样例同时有鱼、肉、蔬菜、饭与甜点。 |
| 山／Yama | 星级 146 | dessert_drink | 水果甜味变化是整个套餐主轴。 |
| 氣分／KIBUN | 星级 158 | other | 2026 官方公告明确前半日式、后半法式；价格等级未获依据。 |
| アロセリア两店 | 必比登 2、3 | staple | 官方直接称西班牙米料理专门店。 |
| マ・キュイジーヌ、ローブリュー | 必比登 38、55 | meat | 官方说明完整系列猪料理/前菜主菜均以猪肉为主。 |
| 鳥茂 | 必比登 85 | meat | 官方明确烤内脏及猪牛串烧；不需要由旧 serving_form 推导。 |
| 酒亭 田中 | 必比登 100 | japanese_course | 季节和食与烧鸟在套餐中交替、饭物收尾；未仅按原烧鸟标签套肉类。 |
| 久原 | 必比登 73 | japanese_course | 鸭是名菜，但官网七/九道套餐含多种鱼、肉、蔬菜，整体为和食。 |
| ぽん多 本家、洋食 エドヤ | 必比登 37、107 | other | 官方为传统洋食，单一肉排/汉堡肉招牌不足以改判全店肉食主打。 |

## 来源与时间边界

主证据复用 [上次东京汇总](../260915-1033-serving-form/source-evidence.json)中的官方原文，逐一重新阅读后按 [P09 runbook](../../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md#p09-labeling)独立判断。268 份 2026 listing 的保存 JSON 哈希、canonical URL、分店地址、完整料理标签和版次全部核对相符；KIBUN 的 2025-09-25 东京 2026 官方公告保存哈希也核对相符。没有读取或导出视觉预览中的试分，也没有使用旧 serving_form 决定新标签。

38 条记录附有补强来源（含 Yama 的可复用官网材料）。新增采集为 2026-09-15 的实际观察：优先同一 listing 的其他语言正文，再读取它直接链接的官网、菜单或官方英文入口。伯雲的英文材料来自其官网直接标注的 TABLEALL 入口，证据中明确 URL；不是第三方搜索摘要。龙吟官网菜单从保存 HTML 正文读取；分とく山、空花、マノワ同时使用官网嵌入的同址 Restaurant 元数据，证据注明摘录与哈希。

六雁的同一 Michelin listing 正文明确标为 “Featured in: Where to Find the Best Omakase in Tokyo”，结合其多种和食组成支持套餐判断；专题全文本轮获取失败，没有把失败的专题页面当作已读来源。英文页面部分 JSON-LD 简介有省略号，实际采用页面中的完整正文。

资料适用年度、采集时间与本次判断时间在证据中单列。新增官网观察只补强相同门店的 2026 描述，不宣称恢复了历史完整菜单或年度完整身份集合。东京两榜 coverage 仍为 partial，officialCount 仍为 160/114，verifiedAt 仍为 null，年度身份仍缺 2/3 家。

## 11 家保留未标注

以下均为东京 2026 星级榜。每家已读日/英官方简介；需要同店套餐、完整菜单或明确供餐菜序才能继续补标。保留原字段省略状态，不写 null 占位或 other。

| id | 门店 | 本轮缺口 |
|---:|---|---|
| 17 | [神楽坂 石かわ](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/kagurazaka-ishikawa) | 官方及官网仍主要描述料理理念；官方预约入口返回访问阻断。 |
| 18 | [かんだ](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/kanda) | 官网证书错误；官方预约入口返回访问阻断，简介未给出套餐结构。 |
| 22 | [銀座 小十](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/ginza-koju) | 官网 TLS 错误；官方预约入口返回访问阻断，不能凭日料和评级判会席。 |
| 24 | [銀座 福樹](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/ginza-fukuju) | 无官网链接；官方预约入口安全验证页，现有菜品例子不足以确定整餐结构。 |
| 25 | [久丹](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/kutan) | 无官网链接；官方预约入口返回访问阻断，简介偏理念与空间。 |
| 27 | [虎白](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/kohaku) | 官网讲技法和理念；官方预约入口返回访问阻断，未取得菜序。 |
| 37 | [新ばし 笹田](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/shimbashi-sasada) | listing 无官网/预约直链；英文只补到开场酒肴，仍缺整餐依据。 |
| 47 | [青草窠](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/seisoka) | 官网正文为空；季节山海菜与精进料理的整体供餐结构尚不明确。 |
| 69 | [神宮前 樋口](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/jingumae-higuchi) | listing 无官网；官方预约入口返回访问阻断，简介为经历和理念。 |
| 87 | [蓮 三四七](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/ren-mishina) | 官网只有技法介绍；官方预约入口返回访问阻断，未取得套餐。 |
| 117 | [寅黒](https://guide.michelin.com/jp/ja/tokyo-region/tokyo/restaurant/torakuro) | 酒店及合作方网页未提供可用套餐/菜序；不因酒店和星级补会席。 |

KIBUN 的价格等级另缺：listing 已下架，年度公告未列等级；金额、评级和地区都不作为推算依据。已有的坐标维护警告、KIBUN 缺地址/坐标，以及「とんかつ 七井戸」原简介中的迁址休业提示，全部留待另行事实修订，没有在本轮改写身份或营业信息。

## 修订与保护对账

开工基线是 2026-09-15 18:26（Asia/Shanghai）的实际工作区，包含大量未提交的 P09 框架修改及东京 serving_form 修改，不能用 HEAD 作为这些字段的对账值。[baseline.json](baseline.json)记录 285 个已有文件的 SHA-256、原工作区状态及旧 revision；完整副本在被忽略的 outputs/baseline/。

本轮已有文件只变更 6 个：东京两份年度 JSON、两份由 data:aliases 生成的固定年度旧地址副本、catalog 中东京两个 provenance 的新来源与 revision、接入指南生成覆盖区块的输入哈希。旧 P08 revision 保存在新证据的 previous_revisions 中，并链接旧证据。

[audit.py](audit.py)逐条恢复 dining_category 原状态并校验原对象哈希，另核对记录顺序、身份集合、别名文件字节、catalog 除授权 provenance 外的全部字段和接入指南覆盖区块外的文本。结果：269 条东京记录的所有非授权字段保持不变；其他 11 份年度数据和 11 份旧地址文件字节未变；279 个其他已有文件字节未变，包括用户尚未提交的业务代码、框架测试与文档。

## 实际命令与验证

所有 Node/npm 命令均使用项目前缀：`rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH`。Python 为标准库，命令同样通过 RTK；没有安装依赖、修改锁文件或修改业务代码来通过校验。

| 命令（从仓库根运行） | 结果 / 证据 |
|---|---|
| `rtk proxy python3 eval/sessions/260915-1826-tokyo-dining/apply.py` | 按已审核证据应用：258 条新增，11 条保留缺省。 |
| `npm run data:aliases` | 成功；所有旧地址与固定年度源字节一致。 |
| `npm run readme` | 成功；收录、定位、coverage 状态未变，仅生成输入摘要更新。 |
| `node scripts/data-contract.ts --json` | valid=true；0 error，14 条既有 DUPLICATE_COORDINATES warning；[原始 JSON](outputs/validation.json)。 |
| `node eval/sessions/260915-1826-tokyo-dining/summarize.mjs` | 生产模块计算 13 份分布，见 distribution.json。 |
| `rtk proxy python3 eval/sessions/260915-1826-tokyo-dining/audit.py` | passed；见 reconciliation.json。 |
| `npm run check:repository` | 通过：单文件大小与运行产物策略。 |
| `rtk git diff --check` | 通过。 |
| `npm run release:check -- --output test-results/p09-tokyo-data/release` | 通过：六个阶段全部 exit 0，使用本轮最终数据。 |
| `npm run release:verify -- --output test-results/p09-tokyo-data/release` | 通过：源码及产物与本轮凭据一致，exit 0。 |

完整门禁包含 check（类型、lint、validate:data）、npm test、check:coverage、一次 build、消费同一产物的生产浏览器集和性能检查。本轮使用新的输出目录；之前 P09 或 serving_form 的发布凭据没有作为本次数据通过的证据。

公开只读端点是 `guide.michelin.com` 及逐店证据所列官网/官网直链；基线提交为 `27e41b6ed25a1c52190726562d064e59883d5d89`。HTTP 下载脚本 [fetch.py](fetch.py)、浏览器采集脚本 [capture.mjs](capture.mjs)接收明确 URL 列表，只读取资料，不自动分类。复核/重放入口是 apply.py、audit.py、summarize.mjs。原始 HTML、请求清单、完整日志和快照位于本 session 的 outputs/ 与 test-results/p09-tokyo-data/，均为 local-only；紧凑来源、判断与对账结果保留在 session 根目录。

## 最终门禁结果

本次门禁于 **2026-09-15 19:05–19:08（Asia/Shanghai）**运行并通过。check（类型、lint、validate:data）、快速测试、覆盖检查、构建、浏览器和性能六阶段全部 exit 0；快速测试 **15 文件 / 248 项通过**，浏览器 **68 项通过、0 失败、0 跳过**。随后独立运行 release:verify，退出 0，确认源码、锁文件、数据证据与最终产物一致。

性能为受控实验室结果：真实最大名单（东京星级 158 条）的 LCP 中位数 **688ms**，1000 条夹具 **684ms**；CLS 均为 **0**；20 次交互 p95 **72.8ms**。不把该结果称为线上用户指标或真实底图精度验收。

生产预览另在 1440×1000 桌面视口实际打开东京两榜：页面收录数、各类筛选计数与分布 JSON 一致，星级明确显示“未标注 11”；两页真实 GSI 底图各加载 24 张瓦片，当前视口可见 7/20 个独立标记（其余为聚合点），均有价格角标，均可见 4 种不同图形。该抽看确认本地最终数据确已驱动地图，不代替用户对标签语义的判断。[星级截图](outputs/michelin-starred-preview.png)、[必比登截图](outputs/michelin-bib-gourmand-preview.png)、[页面读数](outputs/preview-inspection.json)。

构建 ID：`41fab3c66b7fba9a709db198a20e2fd1c2c7d3ca42fd18f7b33e8349d9cf91f2`。

产物 SHA-256：`a960691a394852e1543ca65dc18a79284aad3ba60052f2f7f91f4219bdb61036`。

[紧凑验证记录](verification.json)保存命令阶段、测试数量、性能、构建身份及本次来源文件哈希；[本轮发布凭据](../../../test-results/p09-tokyo-data/release/verified.json)与[完整门禁日志](outputs/release-check.log)为本地原始证据。最终字段对账、仓库策略、diff 空白检查和报告链接检查均通过。全部验证只针对本轮本地修改，不代签独立人工验收。

东京阶段结束后等待用户验证；其他地区不自动开工。

## 东京验收反馈：筛选标签简化（2026-09-15）

用户检查东京后要求移除筛选标签里的“其中未标注 N”括号说明，以及筛选区的未标注提示。本节为数据交接后的界面调整；上文的数据阶段记录及截图保留为当时证据。其他城市须等本次调整验收后再继续。

FilterPanel 的桌面与手机共用展示已改为仅显示类别名及合计，例如“其他料理 35”。已移除上方“主打体验未标注 11 家（计入其他料理）”提示。筛选集合、各类数量、餐厅记录以及诊断中的 other/unclassified 区分保持不变。同步更新了 P09 design/spec 的筛选文案要求与现有回归断言；单店详情不属于本次筛选标签调整。

初始单元回归 19 项通过；首轮完整门禁的类型检查发现测试误用了另一测试库的 exact 参数，改为精确正则匹配后重新执行。失败日志保存在 test-results/p09-tokyo-label-ui/release-attempt1.log，不计作通过。

本次最终 release:check 的六个阶段全部通过：248 项快速测试、68 项浏览器测试，类型、lint、数据、覆盖及性能检查通过；随后 release:verify 退出 0。41 份正式数据 JSON 与本次 UI 修改前的字节完全一致。桌面 1440px 与手机 390px 的真实东京预览均显示“其他料理 35”，筛选区无未标注提示。

构建 ID：`b78a93cf28357f4dc2d5fd0f62b99e5a43bc7b1d6d29bcaa353777512e96b237`。最新 [UI 验证记录](ui-verification.json)、[桌面截图](../../../test-results/p09-tokyo-label-ui/tokyo-1440.png)、[手机截图](../../../test-results/p09-tokyo-label-ui/tokyo-390.png)、[最终发布凭据](../../../test-results/p09-tokyo-label-ui/release/verified.json)。此前数据阶段的发布凭据仅证明当时的构建；当前 UI 以本节凭据为准。

本地预览地址不变，等待用户验收后再继续其他城市；未推送、未部署。
