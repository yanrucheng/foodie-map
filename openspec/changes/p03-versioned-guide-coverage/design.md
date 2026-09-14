## Implementation status and authority

本包在既有 P01/P02/P04–P07 工作树上完成实现与开发者验证；最终验收由另一 Agent 负责。实际起点为 13 名单、671 记录、652 合同可定位（含东京和 JPY），不是总计划中的旧 402 基线。历史工作区清单已清理，当前输入以 Git 和正式 catalog 为准。

稳定目的：让一个地域/榜单/年度能够独立发现、核验与回滚。唯一登记为 `public/data/catalog.json`；年度文件拥有餐厅事实，P02 合同拥有字段/分类/位置语义，P04/P05/P06 拥有界面及空间生命周期，P07 拥有构建/缓存摘要。不建立第二个发布登记或复杂历史数据库。采集工具、证据获取及人工调查方法可替换。

## Catalog and discovery

`src/data/catalog.ts` 定义并推导 schema，`cities.ts` 只导入原始 JSON、解析并输出发布可用的 CityConfig。城市含 id、展示名、center/zoom、scope.description/members、spatialContext、taxonomyPath/mappingsPath；guides 含榜单、year、独立 dataPath、coverage、provenance、可选 legacyPath。

`catalogCities` 排除 not-collected，不把它映射成零条文件或可选版次；空但已发布名单仍可选择。有效年份由 P04 原选择逻辑推导；新增城市/年度只改登记、数据及引用，不加业务分支。catalog 在构建时导入，原始缺失/坏 JSON/schema 错误使校验/构建失败；不把坏登记转换为空注册表。运行时使用与构建绑定的登记，不在线采纳另一个可变 catalog；P07 同时生成 catalog 内容摘要资源。

`scripts/catalog.ts` 是文件发现/验证边界，读取指定 --root 下的真实 catalog。前端适配、validate:data、Python 覆盖生成、releaseBuild 均消费它的同一登记语义。扫描只检测未登记 JSON，不推断身份。taxonomy/mappings 使用显式路径，空间参数调用原 P02 getMapPosition/validateDataset，不另造边界。

原始错误报告定位 catalog 路径/字段，记录错误沿用 file/record_id/field/code。重复城市或数据集身份、复用路径、错年度、非法/缺失引用、缺已发布文件、未登记 JSON、错误分类、坏空间上下文均非零。未采集 dataPath=null，计数=null，与空文件/官方零名单不同。

## Backward Compatibility Policy — BC-01

总计划与既有交付未找到进一步 BC-01 决定。按本轮用户明确授权继续本地迁移、联调，不退役旧公开 JSON 和合法页面链接，不推定永久兼容。

年度文件是唯一维护源。catalog.legacyPath 固定派生自其所在的年度，旧无年地址不会跟随新年度；`npm run data:aliases` 显式复制，validate:data 逐字节检查陈旧副本。现存旧文件初次保持原字节，后续只能由该命令派生，禁止两份手工维护。正式退役条件/兼容窗口与生产使用确认单独待决。本轮无部署/远端变更。

## Annual migration and revisions

13 份名单逐字节复制到 `/data/<city>/<year>/<guide>.json`。初次迁移按字节复制，当前别名一致性由校验器检查；历史逐记录迁移日志已清理。名称、评级、年度、菜系、地址、价格/JPY、状态、候选坐标与无位置 KIBUN 全部保留。旧地址与年度源的一致性可重新运行 validate:data 核对。

year 是官方版次；collectedAt 是实际采集时间；verifiedAt 是完整性核验时间；revision.id/reason/evidence 是同版修订。旧历史时间均 null，不用迁移日填充。东京 collectedAt=2026-09-14，完整年度尚未核验所以 verifiedAt=null。当前营业 closed/relocated、官网变化不决定历史退出，不删除原年度入选；同版修订记录理由及旧值证据，结合 Git/任务材料和 P07 内容哈希追溯。

## Coverage and provenance

状态为 not-collected / partial / unverified / verified，名单完整度与 counts.locatable 分离。正式旧 11 份名单 unverified；东京两份 partial。已有可定位资格不因缺历史完整性材料而被伪造或降级。

provenance.sources 含 kind=edition/scope/membership/gap、ref、note；引用允许安全 HTTP(S)、`/data/*.json` 或 `repo:相对文件`。校验检查所有本地引用可读，生成覆盖指纹包含其字节。repo: 材料归原任务/文档位置，不复制东京采集库；缺原始网页时明确材料限度。生产来源缺口见[来源 runbook](../../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md)。

verified 必须有核验日期、年度/范围/名单来源、所有 scope.members 的核验声明以及 reconciliationPath；对账材料含 dataset、完整官方集合标识 complete、identities、sources、aliases。校验按真实身份集合报告 missing/extra/unresolved/ambiguous，不能由数量相同推导完整。证据完整但坐标缺失可以名单完整/部分不可定位；官方空集合与本地空集合一致且证据满足要求才允许 verified 零条。

东京官方年度公告证明 160 星级/114 Bib，原在线 157/111 逐身份结果加年度 KIBUN 构成 158/111；缺 2/3 身份，不能拿当前详情覆盖历史缺口。东京范围边界和组合城市各成员不会由展示名或坐标包围盒自动核验。

## Explainable annual reconciliation

`src/data/reconciliation.ts` 以官方 listing URL 归一化匹配；保留地域/分店，只去 locale、查询参数、fragment、尾斜杠。官方稳定 ID 可通过有证据的 URL→ID 对应使用。aliases.from/to/已清理的历史输出 是直接一对一的人工例外，不靠数字 id 或同名合并。

`npm run data:diff -- --root … --before city/year/guide --after city/year/guide` 先校验真实 catalog/文件，输出输入哈希、官方材料、匹配依据、改名/评级/URL/营业状态等变化。完整新年度官方名单无对象才标 annual-exit；官方仍有但没采到标 capture-gap；官方集合不全则 pending；本地出现对象先标 observed-addition-pending-prior-coverage，避免把旧年漏采误报首次入选。重复/无 listing 身份待核实，当前停业单列 changes.status。生产只有一版，跨年结果只在清楚标记的隔离夹具生成，不捏造真实下一版。

## Coverage generation and downstream integration

Python `render-coverage-table.py` 通过一次 Node 子进程调用原 validate:data --json，共享 schema、位置资格及身份集合结果；没有 CITY_LABELS 或目录身份推断。输出真实年度、实际收录、可定位、覆盖状态、范围及已知官方总数，指纹覆盖 catalog 和全部引用输入字节。

`npm run readme` 更新已有指南标记区块；`npm run check:coverage` 只读，缺失/重复/倒置标记、过期数据或登记均失败，同数修订也检出。覆盖文档自身不进入指纹，避免循环。P07 sourceIdentity 另外包含指南及 catalog 引用的本地证据，防止核验后改输入。

App 将 taxonomyPath/mappingsPath/spatialContext 传入既有请求身份，餐厅/分类/映射并行加载且一起提交；校验使用 P02 原合同。原 generation/requestKey、abort、乱序清理、选择、搜索/筛选、详情旧状态清理和空间生命周期保持。两端状态显示 partial/unverified/verified，空文件注明不代表官方零收录。

releaseBuild 默认调用真实 catalog 校验；fixture 仅指定隔离 dataRoot，也必须走相同校验链。前端 fixture 只替换原始 catalog JSON，不替换 cities.ts 或业务组件。P07 既有内容摘要、页面/Worker 验证、离线、A→B→A 保留，mappings 纳入访问缓存检查。release.json 仍是派生结果。

## Rehearsal and acceptance boundary

`npm run rehearse:catalog -- --output /tmp/foodie-p03-replay` 创建自包含隔离数据/catalog/证据与覆盖文件，执行新城、两版、部分、未核验空、官方零、未采集、错年度/重复/坏引用/同数异集/过期覆盖故障及年度对账/回滚。保存 src 逐文件前后哈希。`tests/e2e/catalog.test.mjs` 在两端真实构建验证选版/搜索/详情/覆盖，release-cache/release-rollout 通过同一发现链验证缓存和回滚。模拟数据只在 fixture/隔离输出，不进入生产登记。

开发者验证结果在 tasks.md R1–R7 表。独立维护者仅按指南重放由验收 Agent 安排；任务 3.4/4.2 与规格归档不自签。门禁通过不授权上线，也不解决 P05 精度/东京底图、P06 实际设备/读屏/缩放等剩余人工边界。
