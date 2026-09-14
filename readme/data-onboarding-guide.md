# 数据接入、年度更新与回滚

运行环境以 [.nvmrc](../.nvmrc)、[开发指南](development.md) 为准（Node 24；不要使用系统 Node 26）。所有命令从仓库根运行。Python 只用标准库，调用同一 Node 校验器；可用 FOODIE_NODE 指定与项目一致的 Node。

## 权威入口与输入

- [public/data/catalog.json](../public/data/catalog.json) 是城市/范围、榜单、年度、文件路径、展示和 taxonomy/mappings 的唯一登记。[cities.ts](../src/config/cities.ts) 只适配它。release.json 是 P07 构建摘要，不编辑。
- 餐厅字段、空值、价格/币种、位置资格只以 [P02 合同](../src/data/contract.ts)、[taxonomy 合同](../src/data/taxonomy.ts)、[校验](../src/data/validation.ts) 为准；含 JPY，金额保留原文，不推算均价。
- 准备输入：明确地域与年度的官方公告/名单或保存材料、每个餐厅的稳定 listing 身份、采集记录、现有 taxonomy/mappings，以及需要解释的人工对应关系。工具可以替换；证据要求见[来源 runbook](../docs/runbook/runbook-260507-1013-valid-data-source-guide.md)。

## 新城或新年度

1. 先从官方年度公告确认版次与范围。采集日期不能推导 edition_year；当前详情不能证明历史年度完整。组合范围逐成员说明，不把“广州·深圳”标题当作两个城市都已核验。
2. 数据放到 `public/data/<city>/<year>/<guide>.json`。数组记录保留六个必填字段：id、name、city、guide_type、edition_year、cuisine_group。文件内 id 只需唯一，跨年不用它匹配。缺坐标省略或 null/null，不能用 0,0；无位置餐厅仍可搜索和看详情。停业/搬迁/详情失效不能删除历史入选事实。
3. 在 catalog.cities 增加城市或在 guides 增加版次。城市字段：id/label/labelZh/center/zoom、scope.description/members、spatialContext、taxonomyPath/mappingsPath；榜单字段：id/label/labelZh/year/dataPath、coverage、provenance。完整格式以 [catalog schema](../src/data/catalog.ts) 与[可执行夹具](../tests/fixtures/p03Catalog.ts) 为准。普通扩展不改选择器、地图、卡片、Python 城市表或手写 taxonomy import。
4. 复用/增加 taxonomy 与 mappings，路径从 catalog 引用，可用非默认文件名。mappings 格式为 `{version:1, city:"…", mappings:[{raw:"完整原始标签",groupKey:"OTHER",sources:["可选来源"]}]}`；不拆复合标签、不覆盖原始 cuisine。用 `python3 skills/cuisine-boarding/board.py --input 原始.json --output 候选.json --taxonomy 分类.json --mappings 映射.json --dry-run` 预检，再移除 dry-run 生成候选；输入与输出必须不同。未知/未映射保留 OTHER 和 warning。
5. 填写 coverage 与 provenance，运行校验、覆盖生成及年度对账。修订同一年度须填 revision.id/reason/evidence，并在 Git 或任务记录保存原因和前后差异；P07 为发布文件生成摘要。不要因新年度采集覆写旧年度。

| 状态 | 文件与依据 |
|---|---|
| not-collected | dataPath=null，不参加页面选择，不计为零条；登记不等于已采集。 |
| unverified | 文件合法但年度/完整性证据不足；包括无证据的空数组。collectedAt/verifiedAt 未知用 null。 |
| partial | 已采部分或年度身份集合未恢复；说明缺口。officialCount 可以已知，数量一致仍不代表完整。 |
| verified | 完整年度身份集合逐项对账、无缺少/额外/歧义/无身份记录；有年度、范围、成员证据及 verifiedAt；每个 scope member 都在 verifiedMembers。可以是有依据的零条名单。 |

provenance.sources 使用 kind=edition/scope/membership/gap、ref、note；ref 可以是 HTTP(S)、`/data/…json` 或 `repo:仓库相对路径`。本地引用缺失会失败。collectedAt 表示实际采集；verifiedAt 表示完整性核验；year 表示官方版次；revision 表示同版修订，四者不得混用。线上可见覆盖提示，详细证据从 catalog 追溯。旧名单缺口和东京 partial 说明见 [P03 来源记录](../openspec/changes/p03-versioned-guide-coverage/evidence/provenance.md)。

## 官方身份与年度差异

coverage.reconciliationPath 可引用如下材料；sources 必须指向实际年度依据，不能把本地餐厅数组自动复制为“官方名单”。complete 表示官方输入集合完整，并非本地完整。

```json
{
  "dataset": "city/2027/michelin-starred",
  "complete": true,
  "sources": ["https://official.example/annual-list"],
  "identities": ["https://guide.michelin.com/en/region/city/restaurant/one"],
  "aliases": []
}
```

identity 首选归一化 listing URL（忽略 locale、query、fragment、末尾 /；保留地域与分店 slug）。若官方提供稳定 ID，可在 identities 用该 ID，并在 aliases 用有证据的一对一 URL→ID 映射。同样支持旧 URL→新 URL，记录 `{from,to,evidence,reason}`；拒绝歧义/链式映射。同名分店不合并。

```sh
rtk npm run validate:data
rtk npm run data:diff -- --before city/2026/michelin-starred --after city/2027/michelin-starred
```

差异输出保存到任务证据：输入身份/哈希、官方输入、aliases、保留对象的改名/评级/URL/营业状态变化、capture-gap、annual-exit、待核实身份。官方新年度仍有而本次没采到是 capture-gap；完整官方新年度无该对象才可判 annual-exit；无完整官方集就待核实。新出现对象仍需旧年度完整依据才能确认首次新增。当前 status=closed 是营业观察，独立于年度入选。实际生产目前仅一版，不编造真实跨年度差异；重放用隔离测试年度。

## 校验、派生与发布前检查

```sh
rtk npm run validate:data
rtk npm run data:aliases
rtk npm run readme
rtk npm run check:coverage
rtk npm run check
rtk npm test
rtk npm run release:check
rtk npm run release:verify
```

`data:aliases` 仅在设置 legacyPath 时更新旧地址副本：每个旧地址固定到 catalog 中指定的某年度，不跟随最新年份；年度文件是唯一维护源。校验拒绝旧地址与其源字节不同。BC-01 尚未确定，暂保留已有地址和合法 year/city/guide 链接；没有永久兼容承诺，退役另行决定。

`readme` 更新下方覆盖区块；`check:coverage` 只读，表格缺失、过期、数据/登记/本地证据字节变化均非零，即使条数未变也能发现。validate:data 数据错误 exit 1，命令执行/使用错误 exit 2。重复坐标等维护 warning 不自动删店或改 geocode_success。

正式发布门禁使用实际覆盖检查，构建一次，生产浏览器与性能检查消费该产物，verify 校验源和产物未变化。通过门禁不授权部署，不代替 P05 地图精度或 P06 人工验收。发布流程与缓存 A→B→A 见[开发指南](development.md)。

回滚以先前已核验的完整构建为单位，恢复 catalog、年度文件、分类、旧地址派生及应用/Worker 对应关系；不得只替换 release.json。恢复源候选时重跑 aliases/readme/check/release:check/verify。历史年度独立保存，当前营业修订另附证据，不抹去历史名单。

## 不依赖口头补充的隔离重放

```sh
rtk npm run rehearse:catalog -- --output /tmp/foodie-p03-replay
rtk npm run validate:data -- --root /tmp/foodie-p03-replay/public/data
rtk npm run data:diff -- --root /tmp/foodie-p03-replay/public/data --before harbor-fixture/2026/michelin-starred --after harbor-fixture/2027/michelin-starred
rtk proxy node --test tests/e2e/catalog.test.mjs tests/e2e/release-cache.test.mjs tests/e2e/release-rollout.test.mjs
```

首命令创建完整可检查输入、summary.json、annual-diff.json、每个命令日志。包括新城、两版、部分/未核验空/官方零/未采集、重复身份、混合年度、坏引用、同数异集、数据与登记漂移、旧版不变及回滚；src 逐文件前后哈希相同。故障只在 output 内注入并恢复。浏览器从相同正式 schema/文件发现链构建隔离产物，真实页面/Worker 检查选版、搜索/详情、离线和缓存升级回滚。模拟名单不进入正式 public/data。

独立维护者可编辑该隔离目录的 catalog、数据和证据后运行相同命令，不需改业务源码。开发者结果在 [P03 交付](../openspec/changes/p03-versioned-guide-coverage/tasks.md)，独立重放及最终判定留给验收负责人。

## 自动生成的覆盖

<!-- COVERAGE_TABLE_START -->

<!-- catalog-and-inputs-sha256: dbd7e2d0dc97d71b545bd65788e9161361b2891d97deb3b62ad86c2d36a57997 -->

| 城市 / 实际范围 | 榜单 | 年度 | 收录 | 可定位 | 名单状态 | 官方总数 |
|---|---|---:|---:|---:|---|---:|
| 香港 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林必比登 | 2026 | 70 | 70 | 未核验 | 未知 |
| 香港 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林星级 | 2026 | 77 | 64 | 未核验 | 未知 |
| 北京 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林必比登 | 2026 | 26 | 26 | 未核验 | 未知 |
| 北京 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林星级 | 2026 | 32 | 32 | 未核验 | 未知 |
| 广州 · 深圳 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林星级 | 2026 | 20 | 18 | 未核验 | 未知 |
| 广州 · 深圳 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林必比登 | 2026 | 44 | 44 | 未核验 | 未知 |
| 上海 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林星级 | 2026 | 51 | 48 | 未核验 | 未知 |
| 上海 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林必比登 | 2026 | 35 | 35 | 未核验 | 未知 |
| 成都 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林星级 | 2026 | 13 | 13 | 未核验 | 未知 |
| 澳門 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林星級 | 2026 | 21 | 21 | 未核验 | 未知 |
| 澳門 / 旧登记范围；尚未恢复官方年度地域定义。 | 米其林必比登 | 2026 | 13 | 13 | 未核验 | 未知 |
| 东京 / 官方 Tokyo / tokyo-region；观察到 19 个特别区，尚无仅限 23 区的排他性依据。 | 米其林星级 | 2026 | 158 | 157 | 部分 | 160 |
| 东京 / 官方 Tokyo / tokyo-region；观察到 19 个特别区，尚无仅限 23 区的排他性依据。 | 米其林必比登 | 2026 | 111 | 111 | 部分 | 114 |
| **合计** | | | **671** | **652** | | |

可定位按 P02 getMapPosition(record, catalog.spatialContext) 计算，不代表精度已验收。未采集无文件不计为零条；已发布缺文件是错误。来源、采集/核验时间、范围成员与修订见 [catalog](../public/data/catalog.json)。

<!-- COVERAGE_TABLE_END -->


## 底图覆盖与空间验收（P05 → P07）

catalog 城市可配置 `basemap: "amap" | "gsi-standard"`，省略沿用高德。供应商URL、署名、缩放范围及显示坐标规则由 `src/config/basemaps.ts` 统一定义；不要在餐厅坐标中预先施加底图偏移。东京使用GSI标准地图（日本全国z9–18）；其他当前城市使用高德。新增供应商必须先补真实覆盖和坐标规则证据，再扩展配置枚举。

`spatialContext`继续只描述源坐标和资格；底图不可用不能改写餐厅坐标、成功标志或名单覆盖状态。新增城市/坐标域、底图产品/样式变更及供应商切换时，交付两类独立结果：

1. 餐厅合同资格与数据集身份校验。
2. 真实底图在至少3个分散位置（含实际数据边缘）的覆盖抽检：可识别道路/建筑/地物、默认缩放及可用缩放范围、署名、相同物理点对应。保存URL、日期、瓦片/截图、坐标系及参考精度。HTTP200或非纯色都不能单独判定通过。

Node版本遵循.nvmrc。在线抽检（不进入快速测试）：

```sh
rtk proxy env P05_CITY=tokyo P05_COVERAGE_DIR=/tmp/p05-coverage node tests/e2e/basemap-coverage.mjs
rtk proxy env P05_CITY=tokyo P05_CALIBRATION_DIR=/tmp/p05-application node tests/e2e/spatial-calibration.mjs
```

后者运行真实应用/正式catalog/真实瓦片，但注入公开来源位置，不是实地GPS；需人工核对同一物理地物。自备锚点文件可用 `P05_ANCHORS_FILE`，结构参照P05证据。不要在没精度依据时把注入accuracy常量当作来源精度。

数值10m比较使用独立转换参考（例如供应商响应），200m比较使用有精度依据的物理点；分别保存结果。P05最新[GSI底图与精度证据](../openspec/changes/p05-map-location-correctness/evidence/basemap-260914/README.md)区分已测、统计精度预算及未核验范围。P07发布交接复核这些材料，不用模拟瓦片浏览器回归替代真实覆盖。
