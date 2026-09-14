## Status

设计已获用户确认并完成本地实现，等待主线程最终验收。用户在设计准备完成后明确回复“没问题，开始开发吧”。实现遵循本文边界，旧候选补丁已撤回；本轮证据见 tasks.md，未发布。

## Purpose and scope

P02 交付“信息含义一致、缺失可接受、变换不丢事实”的静态数据合同。合法缺失只影响对应内容或操作，明确错误仍需被检查；不要求为每条已存信息补签来源凭证或核验日期。

本设计在总计划对 P02 的责任内收敛，无需改变上层目标。P03 仍负责版次/完整性/来源登记，P04 仍负责完整状态与展示流程，P05 仍负责坐标转换、瓦片和定位生命周期。若开发发现必须修改这些合同，停在该边界向主线程提出，不把修改悄悄并入 P02。

## Evidence baseline

本轮只读核对：6 个地区、11 个餐厅文件、402 条记录；全部声明 2026 版，文件内 ID 唯一。384 条满足已有 geocode_success=true 和合法非零坐标，18 条原本 false（4 个 0,0、1 对 null、13 对候选数值）。这表示符合现有数据约定，不证明本轮重新核验了真实精度。

全部 402 个 raw cuisine 能精确命中现有映射；上海的文件表示需先统一。有六条存储分组与映射冲突。金额信息为 147 条香港原文和 26 条北京约数，其余 229 条无金额。现有消费者只展示价格，不做排序、预算过滤或汇率计算。旧状态均为 active；缺少新加的日期不足以把它们全部改成 unknown。

这些数量只用于本次迁移对账，不硬编码为未来的验证上限；实施前重新冻结实际输入。

## Record contract

继续采用餐厅 JSON 数组。必填字段仅六个：id、name、city、guide_type、edition_year、cuisine_group。前五个提供可识别的名单记录，最后一个是现有筛选依赖的派生值，由 boarding 生成，不要求采集者猜分类。

可选字段均可省略或为 null；可选文本的空串/纯空白也按“无可展示内容”消费，不为统一外观批量清洗原文。除下述明确迁移项外，已有值保持不变。

| 字段 | 类型与限制 | 用途及归属 |
|---|---|---|
| id | 必填，正安全整数；文件内唯一，无需连续 | 本地记录引用；禁止作为跨年身份。 |
| name | 必填，非空白 string | 已有显示名称；不重新拼接或推测译名。 |
| city | 必填，kebab-case string，与登记一致 | 名单地域范围键，可以是组合范围；不证明各子城市完整。 |
| guide_type | 必填，michelin-starred 或 michelin-bib-gourmand | 官方榜单类型；不预加未支持榜单。 |
| edition_year | 必填，四位整数年份，与登记一致 | 官方版次，不是采集日期。 |
| cuisine_group | 必填，当前 taxonomy 的 key | 确定性派生；规则见后文。 |
| name_zh、name_en | 可选 string/null | 官方或已存名称；缺译名使用已有名字。 |
| star_rating | 可选整数/null；星级有值为 1/2/3，Bib 有值只能为 0 | 评级元数据；0 代表不适用，不显示成“零星”。缺值不阻止名单记录。 |
| is_new | 可选 boolean/null | 该版是否新晋；true 才显示，false/缺失不生成标签。 |
| cuisine | 可选 string/null | 原始菜系标签，保留语言、分隔符和完整文本。 |
| venue_type | 可选 restaurant/street_food/dessert/null | 已有店型筛选；未知不默认 restaurant。 |
| area、primary_area | 可选 string/null | 详情区域与现有区域统计；不自动统一行政地名。 |
| address、address_en、major_region | 可选 string/null | 已有地址和地域文字；保留未被当前 UI 使用的事实。 |
| lat、lon | 可选有限 number/null；有数值时必须成对，纬度 [-90,90]、经度 [-180,180] | 地图坐标或明确 false 的候选值；0,0 不合法。 |
| geocode_success | 可选 boolean/null | 复用已有定位状态；false 明确禁止绘制，缺省/null 表示没有额外状态声明，不否定一对按合同保存的合法坐标。 |
| geo_source | 可选 string/null | 已有来源标签，保持开放字符串，不扩成认证枚举。 |
| guide_url | 可选 string/null | 已有 Michelin 详情链接；非空须 HTTPS、精确官方域名及详情路径。缺少只没有链接，不编 URL。 |
| price | 可选 string/null | 金额原文；不是强制“平均人均”。 |
| currency | 可选 CNY/HKD/MOP/null | 已明确的币种；无值不默认币种。扩大支持币种时改同一合同，不建币种服务。 |
| price_range | 可选 string/null | 来源价格等级原文，如 $$$、¥¥；与金额不同。 |
| signature_dishes、phone | 可选 string/null | 已有菜品和联系方式；不要求补齐。 |
| website | 可选 string/null | 非空须安全 HTTP(S) URL；无值不显示入口。 |
| status | 可选 active/closed/relocated/unknown/null | 已存营业状态，不声称刚核验；与年度入选独立。 |

字段所属的事实仍由原来源承担：Michelin 拥有榜单/评级/原始菜系，坐标来源拥有位置，餐厅或适合的来源拥有联系方式。P02 保留现有 guide_url/geo_source 和任务中的必要说明，不新增逐字段 provenance/observed_at，不把材料齐全程度转成展示开关。

额外 JSON 字段原样保留，校验提示未知字段名但不自动删除，不作为现有 UI 的可执行内容。已退休的 avg_price/avg_price_cny/avg_price_hkd 是例外：它们只能存在于原始/迁移输入，canonical 发布合同拒绝，避免两套价格事实并存。拼错必填字段仍然失败；未知可选字段提示维护者检查拼写。

所有已提供的已知字段都检查类型，禁止把字符串 false、数组价格等强制转换为合法值。文本允许普通标记字符，但消费者必须按文本转义；URL 禁止脚本/data 等协议、凭据和控制字符。校验不访问真实链接。

最小合法示例仅用于 fixture，不作为真实 Michelin 名单；其上下文登记须与记录一致，taxonomy 包含 OTHER：

```json
{
  "id": 1,
  "name": "合同示例餐厅（测试数据）",
  "city": "contract-fixture",
  "guide_type": "michelin-bib-gourmand",
  "edition_year": 2026,
  "cuisine_group": "OTHER"
}
```

这条记录没有价格、译名、来源或位置仍然合法。添加 `price: "約 200–400"` 和 `currency: "HKD"` 后可以展示价格；添加一对按统一约定保存的合法 lat/lon 后可以定位，不要求先填定位凭证。

代表性非法片段（替换上例的对应字段）：`id: "1"` 是错误类型；Bib 的 `star_rating: 2` 与榜单不符；`guide_url: "javascript:alert(1)"` 协议不安全；`lat: 0, lon: 0` 是占位点；单独 `lat: 22.3` 缺少另一半数值；`price: {"min":200,"max":400}` 不是选定的文本合同。它们与“没有提供这个字段”明确区分。

## Price representation and migration

选定 `price: string | null` 加独立 currency，price_range 保持原有等级。以下已经充分表达当前需求：

```json
[
  {"price": "約 200–400", "currency": "HKD", "price_range": "$$"},
  {"price": "約 700 以上", "currency": "HKD"},
  {"price": "约 150", "currency": "CNY"},
  {"price": null, "currency": "MOP", "price_range": "$$"}
]
```

不生成 kind/min/max/value/inclusive/approximate/basis，不解析来源未给的金额，不把区间取均值，也不把等级换算成金额。未知币种可以只展示原文。展示协议：有非空 price 显示原文并附已知币种；只有 price_range 显示为“价格等级”；二者均无内容则省略价格行。金额与等级都存在时可保留两者语义，不把等级冒充人均。

迁移按原字段表达判断币种，不根据城市/货币符号猜测：

| 输入 | 输出 |
|---|---|
| 非空 avg_price_hkd | price 原文逐字保留；currency=HKD。 |
| 非空 avg_price_cny | price 原文逐字保留；currency=CNY。 |
| 已有 avg_price 和明确 currency | 原数值转为同值文本，或原字符串不变；保留 currency。当前真实 avg_price 全为 null。 |
| 空串/null 的旧价格字段 | price=null；后缀币种和已有 currency 仍保留其明确含义。 |
| 完全没有旧金额字段 | 不新增 price/null；不从等级或城市填币种。 |
| 多个非空金额或相互冲突的币种声明 | 迁移报错并保留原文件，不自动选一个、换算或拼接。 |

澳门 34 条 MOP 保留；173 条非空原价原文无变化，229 条仍无金额。所有旧价格字段删除前在一次性对账中记录去向。

## Cuisine and mappings

复用现有 taxonomy 文件：version、city、fallbackGroup、groups；保留组 key、labelZh、labelEn、sortOrder 的既有定义，不在本包重新设计分类或语言系统。fallbackGroup 为实际存在的 OTHER。组 key 必须唯一，标签和排序按已有类型校验。

mappings 统一数组表示 `{version, city, mappings:[{raw, groupKey, sources?}]}`；raw 为非空完整标签，groupKey 必须存在，sources 是可选字符串数组，只保留来源标签。上海转换对象项时不补造 sources，其他城市已有 sources 原样保留。移除两个 raw 为空串的旧映射，因为缺少原文由 fallback 表达。

| 输入情况 | groupKey | 诊断/退出行为 |
|---|---|---|
| raw 精确命中非 OTHER | 映射目标 | mapped；通过。 |
| raw 明确映射 OTHER | OTHER | explicit-other；通过，无比例限制。 |
| raw 缺省/null/空白 | OTHER | missing；汇总缺失，不逐店制造认证警告。 |
| raw 非空但未映射 | OTHER | unmapped；按 raw/记录列维护 warning，转换和发布检查可通过。 |
| 重复 raw、未知目标、taxonomy 城市不一致 | 不产生正式输出 | error；非零。重复相同目标也需消除重复规则。 |
| canonical 存储分组与上述结果不一致 | 不自动修改被检查文件 | error；由显式 boarding 修复。 |

不做首词、简繁或分隔符猜测；复合标签按完整原文登记。warning 不变相升级为发布错误，避免为了消除提示把未知标签编成已知。

六条已知冲突选定处理：

| 记录 | 处理依据与结果 |
|---|---|
| 香港必比登 #18 Dragon Inn，海鮮 | raw 不说明西餐；海鮮→OTHER 修映射，该记录原 OTHER 保持。 |
| 香港必比登 #65 兩姊妹涼皮，街頭小吃 | 沿用已修正映射及提交 656191e，WESTERN_OTHER→OTHER。 |
| 上海必比登 #20 宁海食府、#32 甬府小鲜，宁波菜 | 遵循现有上海细分类，ZHEJIANG→NINGBO。 |
| 上海必比登 #22 Polux，法国菜 | OTHER→FRENCH。 |
| 上海必比登 #31 扬州饭店，淮扬菜 | ZHEJIANG→HUAIYANG。 |

香港海鮮映射调整还使星级 #42 Loaf On 从 WESTERN_OTHER→OTHER，一并对账。共六个存储值改变，但原来的六条冲突中 #18 是修规则解决。此举只修本地派生分类，不声称重新核验官方 raw 标签。

## Position contract

沿用现有统一存储约定 WGS84；它是输入数值的解释，不是每条真实位置经过本轮认证的声明。无需逐记录新增 coordinate_system。原始采集如果明确不知坐标系，必须保持 geocode_success=false 或暂不提供位置，不能猜转换；数据集空间上下文明确 unknown 时同样不可绘制。P05 负责源/瓦片转换规则和锚点验证，P02 不修改其验收要求。

共享 `getMapPosition(record, spatialContext?)` 返回 `[lat, lon]` 或 null。省略 spatialContext 使用统一 WGS84 约定；可选 context 含 coordinateSystem=WGS84/unknown 和 bounds（南、西、北、东）。它是调用参数，不新增登记文件；P03/P05 有明确范围时可提供，P02 不根据现有点的最小最大值造城市边界。

| 情况 | canonical 校验 | 地图/heat/搜索飞行 |
|---|---|---|
| 成对合法非零数值，success=true | 通过 | 可定位；不要求证明文件。 |
| 成对合法非零数值，success 缺省/null | 通过 | 按坐标合同可定位；不补造 true。 |
| 合法候选数值，success=false | 通过 | 不可定位，名单保留。 |
| 两者缺省/null，success 不为 true | 通过 | 不可定位，其他内容保留。 |
| 缺坐标但 success=true | 失败 | 防御性返回 null。 |
| 单边数值、非有限、越界、0,0 | 失败，无论 success 值 | 防御性返回 null。 |
| context 明确 unknown | 空间 warning，记录其他字段仍合法 | 返回 null，不将 unknown 默认成 WGS84。 |
| 点在调用方给定的有效 bounds 外 | success=false 的候选为 warning；其余为位置 error | 返回 null；不修改名单身份。 |
| 不同餐厅重复坐标 | 维护 warning | 不因重复自动移除。 |

缺少新增凭证不等于“坐标系 unknown”或“定位失败”。此前批量降级逻辑撤回。现有 384 条通过的点和所有 true/false 状态保留；4 个零点改 null/null，原本 false 不变；已有 null 对和 13 对 false 候选保留。UI 文案使用“可定位”，不是“已认证”。

非法上下文（如 bounds 含非有限值、上下界颠倒）属于调用方配置错误：校验明确失败，位置函数返回 null；不以忽略 bounds 继续绘制。本包默认输入使用现有统一约定，不新增城市范围数据。

## Executable contract and entry points

实施选择采用已存在于依赖树的 Zod 3.25.76，登记为直接依赖；共享合同归属 `src/data/contract.ts`，`src/types/restaurant.ts` 只导出推导类型。相关解析/派生函数放在同一职责下，是否按可读性拆文件由开发者决定；不重建一套验证 DSL 或通用 JSON 解析器。

P01 的 Node 24 可直接执行带可擦除类型的 TS CLI。Python boarding 继续负责文件读写，通过一次批量 Node 调用获得派生结果/诊断，保留 Python 原对象，仅回填 cuisine_group；额外字段不经过重建白名单而丢失。Python 不复制字段/分组/价格规则，运行需要项目 Node 环境及 Python 标准库，不增加第二套依赖管理。

两个消费边界共用同一套字段定义：

- 原始 boarding 输入至少有 id、name；cuisine 可缺失。输出只增加/覆盖 cuisine_group，其余字段和值不变，不要求原始输入提前符合完整发布字段。
- 发布/运行时输入是餐厅数组，六个必填字段、已有字段类型及文件内 ID 唯一受检查；允许可选缺失。发布 validateDataset 再检查显式登记/taxonomy 上下文；运行时解析复用记录和数组规则，不为接入本包新造 catalog 或分类加载流程。

主要接口约定（函数名可用等价清晰名称，语义固定）：

| 接口 | 输入/输出和用途 |
|---|---|
| validateRestaurant / inferred Restaurant | unknown→合法记录或字段诊断；从 schema 推导类型，禁止 JSON 类型断言绕过。 |
| parseRestaurantArray | unknown→记录数组或诊断；复用记录规则并检查 ID 唯一，供现有运行时加载接入。 |
| deriveCuisine | raw + 当前 taxonomy/mappings→groupKey 与 mapped/explicit-other/missing/unmapped；同一结果用于 boarding 和一致性检查。 |
| validateDataset | unknown 数组 + city/guide_type/edition_year/taxonomy/mappings/可选空间上下文→结果与诊断；校验文件内 ID 唯一和记录上下文一致。 |
| getMapPosition | 位置字段 + 可选空间上下文→坐标对/null；提供给标记、heat、飞行和计数。 |

`npm run validate:data` 默认读取现有 cities.ts 登记及 public/data 下全部 taxonomy/mappings；漏文件、未登记餐厅文件和已知字段错误非零。`--root PATH` 仅替换数据根，用同一登记检查隔离副本，测试可调用 validateDataset 注入单文件上下文。空数组有效，身份仍来自登记，不从第一条记录推断。P03 后续将此发现入口改接 catalog，P02 不另建清单/注册表。

输出诊断至少包含 severity、code、file、record_id（可用时）、field 和 reason；分组问题附 raw/实际/期望。数据错误退出 1，使用/执行失败退出 2，无错误退出 0（允许 warning）。缺失数量可汇总，避免为每个空价或译名刷屏。检查可重复、不写输入、不连接官网/地图服务。标准 JSON 解析失败要明确定位文件；不为自造解析边界增加新的子系统。

`validate:data` 接入 P01 的 check；Make 只转调原入口。P07 以后组合这些入口，不在 P02 改发布工作流。

## Boarding write semantics

保留现有 CLI 参数 input/output/taxonomy/mappings/dry-run。默认输出必须与所有输入不同，避免覆盖原始材料。先完成全部解析、规则校验和结果序列化，再同目录临时写入与原子替换。失败保留输入/既有正式输出；dry-run 不创建目录、临时文件或输出。重复运行语义结果一致。

未映射 warning 可写 OTHER 结果，退出 0；错误规则/坏 JSON/非法 groupKey 退出非零且不覆盖已有输出。不要沿用旧候选“非空未映射阻止写入”的行为，也不要把价格迁移藏入 boarding。

## Allowed implementation changes and handoff

| 位置/责任 | P02 允许完成的工作 | 保留给原 Packet 的工作 |
|---|---|---|
| 共享数据模块、restaurant 类型 | 最小合同、派生、校验与位置函数 | 无来源注册/认证系统。 |
| boarding、数据、tests、package scripts | 修已知数据损坏、同合同检查、一次性迁移与回归 | 不安装替换整个工程工具链。 |
| useGuideData | 调用公共运行时解析，使用已有错误返回通道；合同失败清理非法结果 | P04 的数据集绑定/竞态/URL/选择模型及重试体验。 |
| 名称搜索、现有两端卡片 | nullable 安全访问、price/currency 读取、缺内容行/链接省略；保持已有布局 | P04 的完整详情通路、多端格式体系与按城 taxonomy；不新建无坐标详情面板。 |
| MapShell/Marker/Heat/App 的简单字段入口 | 接入 getMapPosition 防止 null/false/零点绘制和飞行，按同结果计数；只改消费调用点 | P05 的 gcj02、地图重建、定位订阅、权限和瓦片恢复。 |
| 现有 boarding 文档与接入指南合同段 | 用新字段/命令替换矛盾示例，引用唯一合同 | P03 的 catalog、年度目录、覆盖表生成和来源运维重做。 |

P02 对“缺位置仍保留餐厅”的验收是记录可验证、仍留在供搜索/详情使用的数组中，且位置函数返回 null。完整无 marker 详情交互仍按 P04-R3 实现，不能把它变成 P02 的 UI 扩展任务。

交给 P03 的是记录规则、validateDataset 和迁移身份对账；跨年 URL 归一化/别名由 P03 负责。交给 P04 的是可选字段、价格文本和缺失语义；交给 P05 的是统一位置函数与统一存储含义。样式和既有未知状态的具体视觉实现由下游决定，本包不新增常态认证警告。

## Migration and validation plan

批准开发后，先保存实际文件清单和上游提交/工作树，再显式迁移。保持现有路径，不为本包提前增加年度目录。迁移步骤可以是一次性脚本，不要求长期保留 migration/reconcile 两套命令。

必需对账只保留一份紧凑结果，放在现有 tasks/必要 artifact：逐文件身份集合、增删、原价去向、四个零点、六条分组冲突及规则变化。用 Git 原值作基线，不重复存完整旧数据、不添加逐字段审批记录。当前迁移匹配键是原路径+本地 ID，附原 guide_url 对照；不得据此定义跨年身份。

迁移必须保留 id、name/译名、city/guide/edition、评级、新晋、raw cuisine、venue_type、地址、guide_url、geo_source、status 和非零坐标；保留所有既有 true/false。没有事实修复依据，不改官方字段或营业状态。任何不在上述价格、mappings、四个零点和六个派生值内的变化均需具体解释，不能靠同条数通过。

当前基线下预期：11 名单/402 条、173 条金额原文不变、229 条仍无金额、384 条可定位、18 条不可定位且仍在名单；数字来自只读数据，实际执行若出现新增上游改动需重新对账。数据检查通过不代表官方名单完整或地图校准完成。

验收场景统一在 spec 的 P02-R1–R7，tasks 引用编号；设计不以测试条数或覆盖率作为目标。先验证未知与错误边界、真实 boarding 失败保护，再迁移和全量检查，最后运行受影响快速集及必要的既有浏览器回归。无坐标完整交互和真实底图锚点不在本包验收冒领。

## Backward compatibility and remaining approval

BC-01 仍未确认。允许准备并验证本地统一合同与迁移，不移除公共地址、不双写、不添加永久适配器，也不发布。若需要真实外部接口兼容，由主线程按 BC-01 决定后再处理；这不是本设计内部缺失的字段选择。

P02 内部的字段、缺失、价格、坐标状态、映射、工具边界和迁移决定已明确且获确认。实施方法（具体文件拆分、临时脚本、测试组织）由开发者按上述接口完成。若开发中出现必须修改其他 Packet 的问题，立即停在范围讨论，不先改上层文件。
