---
title: "餐厅中文正式名称纠正：设计取证与小样验收"
service_version: "0.3.0"
date: 2026-09-25
environment: "local foodie-map workspace; public Michelin pages"
model_id: "Codex (exact model UID not exposed)"
dataset_version: "catalog v1; 2026; baseline 34763f4e1b71c038e8a2bace80c0bcb90b4fba48"
purpose: "用同店官方原文纠正中文名，先验证北京8家小样，再待用户确认全量"
baseline_ref: "34763f4e1b71c038e8a2bace80c0bcb90b4fba48"
---

# 设计调查结论

开发方案与验收标准见 [计划](../../../docs/plan/plan-260925-0915-chinese-restaurant-names.md)。本节记录设计取证阶段：当时未修改正式餐厅数据、未验收开发小样，也未收到用户放行全量的明确确认。后续开发交付及独立验收见下文；各阶段结论不互相代签。

数据源：`public/data/catalog.json` 及其登记年度 JSON。北京 58 条，建议小样固定 8 条；全库 671 条，国内 402、东京 269。代码基线 `34763f4e1b71c038e8a2bace80c0bcb90b4fba48`。原有未跟踪的其他会话 `__pycache__/` 不属于本次变更。

公开取证入口为每条既有 `guide_url` 对应的米其林 `/sg/zh_CN/` 语言页（地域及分店路径保持）；不是 API。只改 locale 发起请求不能自动得出中文名称，需读实际正文。原始 HTTP 请求返回 202 空正文；正常浏览器加载后得到中文主标题和门店地址。首个导航响应有的仍记录为 202，因此通过依据是实际渲染后的目标标题/地址和保留 DOM，不是 HTTP 状态。页面可能缺 JSON-LD，不从缺失字段造值。

2026-09-25 设计者逐条读得：京艳 ‧ 翰林书院、新荣记 (金融大街)、新荣记 (新源南路)、静一 (琉璃厂东街)、湘彬萱 (花园路）、屋里厢、钟餐厅、Trb Hutong。预计 4 条修改、4 条保持，细节见 [source-evidence.json](source-evidence.json)。TRB 没有得到中文门店名，不创造翻译；湘彬萱“萱”虽看似可疑，来源原文确认保留。金融大街门店建筑称谓与旧字段有差异，完整说明保存在逐条材料中，不顺带改地址。

来源 JSON 的 `source_heading` / `source_address` 是原文；`candidate_name_zh` 是候选；`decision` 为设计判断，不代表已应用或已获用户确认。记录原字段和文件哈希，供开发与验收独立对账。

额外发现：当前 `src/data/reconciliation.ts` 的 `listingIdentity` 会剥离 `/sg/zh_CN/`，却保留 `/en/`，对同一餐厅两个语言 URL 的返回值直接比较不相等。设计已明确本轮按显式 URL 对的完整餐厅路径及地址核对，避免错误自动配对；共享 helper 未在设计阶段修改。

设计取证命令（临时脚本为当前方法，不是新长期工具）：

```sh
rtk proxy /Users/chengyanru/.nvm/versions/node/v24.21.0/bin/node /tmp/foodie-map-name-probe.mjs
```

脚本使用已有 Puppeteer 打开固定 8 个公开 URL，等待目标 `h1` 和 `.data-sheet__block--text`，保留最终 URL、原文、DOM 和 SHA-256。原始 HTML/JSON 和截图位于本会话 `outputs/sources/`，按项目约定 local-only、不入 Git；紧凑摘录和哈希随 source-evidence 保存。临时源脚本副本见 `outputs/name-probe.mjs`，仅用于复现取证方法，后续可换方法。来源 URL 可重新访问，页面内容有变化时按新的采集日期保存，不冒充旧快照。

## 后续回交位置

开发在本报告追加小样预览 URL、候选输入位置/哈希、数据差异和验证结果；验收者随后追加独立结论。用户确认使用正常会话，报告可引用真实回复及范围，不自行构造批准字段。尚未发生的开发、验收或批准不要提前记为完成。

设计交付自检：8 份来源 HTML 哈希均匹配，4 改/4 留与逐条候选一致；41 份 `public/data/**/*.json` 保持调查基线；计划/报告本地链接及新增文档元数据有效，两个文档索引已更新。`rtk git diff --check` 与 Node 24 下 `scripts/check-repository.mjs` 通过。这些检查只验证设计交付材料，不等于开发小样或全量验收。

## 开发交付：隔离候选与查看入口

2026-09-25 按设计实现固定北京 8 家小样，4 改、4 留。业务代码、共享 `listingIdentity`、正式 `public/data/`、原有 `dist/` 及现有服务均未修改。本轮结果是供独立验收和用户确认的候选，未获全量授权；没有推送或部署。

- [用户对照页](http://127.0.0.1:55229/review/preview.html)：8 家原名、候选、修改或保持、原始标题/地址、来源、读取时间、理由及限制，京艳置顶；无需读取 JSON。
- [候选真实应用：北京星级](http://127.0.0.1:55229/?city=beijing&year=2026&guide=michelin-starred)；[北京必比登](http://127.0.0.1:55229/?city=beijing&year=2026&guide=michelin-bib-gourmand)。输入「京艳」、各分店中文名或既有英文名可查看候选。
- 对照页文件：[outputs/preview.html](outputs/preview.html)。候选数据根：`outputs/candidate/public/data/`；完整 catalog 保留 13 份年度数据、671 条，只有授权小样发生名称变更。
- 服务信息：[outputs/server.json](outputs/server.json)。仅绑定 `127.0.0.1`，由系统选择空闲端口 55229，避开既有 4173 和 5174；服务继续保留供验收。重启会选择新空闲端口，以此文件及命令输出为准。

对照页所有来源名称/正文按普通文本转义。8 份可读原文入口位于 `outputs/sources/*.txt`，同目录原始 `.html` 通过预览服务器以 `text/plain` 和禁止执行的 CSP 提供，不执行来源页面脚本；原始 DOM 字节未变。原始材料、候选、构建、截图和运行日志均 local-only、被 Git 忽略。保留的复现配方为 [sample.py](sample.py) 和 [preview.mjs](preview.mjs)，不参与正式应用运行。

### 精确名称差异

每行只改 `name_zh` 及 `name`；`name_en` 原样保留，组合名为候选中文名 + ` / ` + 原英文名。

| 记录键 | name_zh 原值 → 候选 | name 候选完整值 |
|---|---|---|
| beijing/2026/michelin-starred#11 | 京雁 → 京艳 ‧ 翰林书院 | 京艳 ‧ 翰林书院 / Mansion Cuisine by Jingyan |
| beijing/2026/michelin-starred#7 | 新荣记（金融街） → 新荣记（金融大街） | 新荣记（金融大街） / Xin Rong Ji (Jinrong Street) |
| beijing/2026/michelin-bib-gourmand#10 | 静一 → 静一（琉璃厂东街） | 静一（琉璃厂东街） / Jingyi (Liulichang East Street) |
| beijing/2026/michelin-bib-gourmand#13 | 湘彬萱 → 湘彬萱（花园路） | 湘彬萱（花园路） / Xiang Bin Xuan (Huayuan Road) |

保持项 starred #18 新荣记（新源南路）、starred #21 屋里厢、bib #1 钟餐厅、starred #1 TRB Hutong 的整个记录均未改变，包含 TRB 原有重复组合名。全库 id、URL、记录顺序、身份集合、评级、状态、地址、坐标、价格、菜系及主打体验等非名称事实均保持。

机器可复核的完整 8 字段前后值、catalog 两项 revision 前后值和候选每文件 SHA-256 见 [outputs/reconciliation.json](outputs/reconciliation.json)。候选内只有 5 个 JSON 文件字节与正式源不同：北京两份年度 JSON、工具派生的两份旧地址副本、catalog。catalog 只增加这两个榜单的本轮来源并更新 revision；前 revision 已在 source-evidence 的 `previous_revisions` 保存。coverage、scope、collectedAt、verifiedAt 及其余 catalog 字段不变。

候选数据树 SHA-256：`9b658749952025115e7a7baf716cc6c4548c054d64ab889daef236af23a97e09`。算法为各文件相对路径→SHA-256 的映射按 key 排序、紧凑 JSON 编码后再 SHA-256，具体映射保存在上述对账文件。

### 来源与实际构建

开发复核 8 份原始 HTML SHA-256 与设计证据一致，并用 DOMParser 读取目标 h1、地址块和 title，逐条匹配摘录。显式英文 `/en/` 与中文 `/sg/zh_CN/` URL 对仅去掉各自已知语言前缀，再比较余下的完整地域/城市/分店路径；没有调用存在 locale 差异的共享 helper 作错误匹配，也没有模糊匹配品牌。来源和旧地址的并列核对见 [outputs/source-check.json](outputs/source-check.json)。

金融大街 #7 的“金融街国际酒店 / 国际金融中心”差异保留并在页面明示；新源南路 #18 保留原“1楼”，来源“1层”仅作核对。TRB 中文 locale 仍给外文品牌，本轮保持原有大小写，不创造中文名。当前来源不证明 2026 全年使用同一名称或获奖完整性。

真实应用使用现有 Vite 配置、业务代码、releaseBuild、数据合同和 Service Worker，通过已有 `dataRoot` 隔离入口构建；raw catalog 的构建输入也指向候选。构建输出仅为 `outputs/app/`。没有浏览器注入名称、请求拦截替换数据或 UI 名称覆盖。

构建 ID：`66a6cb3aba5ea53aa300d5ff56a2803009992c381e7a0ed7e19e4e4181af9ff4`。每份 release resource 的 SHA-256 已与候选源及构建文件三方核对，见 [outputs/build-evidence.json](outputs/build-evidence.json)。构建成功，保留现有的超过 500 kB chunk 提示，未为小样调整构建策略。

### 复现与验证命令

从仓库根运行，Node 使用 `/Users/chengyanru/.nvm/versions/node/v24.21.0/bin`；以下命令的 npm/node 前置 `rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH`。

```sh
rtk proxy python3 eval/sessions/260925-0915-chinese-restaurant-names/sample.py prepare
rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH npm run data:aliases -- --root eval/sessions/260925-0915-chinese-restaurant-names/outputs/candidate/public/data
rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH node scripts/data-contract.ts --root eval/sessions/260925-0915-chinese-restaurant-names/outputs/candidate/public/data --json
rtk proxy python3 eval/sessions/260925-0915-chinese-restaurant-names/sample.py audit
rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH node eval/sessions/260925-0915-chinese-restaurant-names/preview.mjs build
rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH node eval/sessions/260925-0915-chinese-restaurant-names/preview.mjs serve
rtk proxy env PATH=/Users/chengyanru/.nvm/versions/node/v24.21.0/bin:$PATH node eval/sessions/260925-0915-chinese-restaurant-names/preview.mjs check
```

`prepare` 为避免覆盖已检查候选，会拒绝重复运行；当前候选直接运行 `audit` 即可。重新制作时先保留或移走旧候选和证据，不能把候选目录替换成正式目录。服务与浏览器在本机需沙箱外权限，均已在本轮成功启动；没有要求更改用户现有服务。

数据校验 [outputs/validation.json](outputs/validation.json) 为 `valid=true`、0 error、14 条既有重复坐标 warning；13 份 legacy 副本均与其固定年度源字节一致。正式数据对账覆盖 `public/data/` 全部 42 个文件（41 份 JSON 及既有 Finder 元数据），全部与 [outputs/production-baseline.json](outputs/production-baseline.json) 一致，也与设计基线中的 41 份 JSON 哈希一致。

### 浏览器结果与交接边界

最终 `preview.mjs check` 退出 0，[outputs/browser-evidence.json](outputs/browser-evidence.json) 为 `passed=true`：

- 桌面 1440×1050、手机 390×844，8 家分别完成搜索、详情和实际点击地图标记，共 16 组；30 次中英文查询均只返回目标记录。TRB 中英文相同，每种布局只需一次查询。
- 「京艳」及 `Mansion Cuisine by Jingyan` 均命中 starred #11；两家新荣记用中英文各自匹配对应分店地址与 guide_url。候选星级全部记录的三个名称字段中均无「京雁」。
- 每组核对页面 dataset/buildId、浏览器读取到的数据字节 SHA-256、候选年度数组及 release resource 一致；不是只核对独立对照页。详情内地址和官方链接仍为原记录值，搜索选中后回填准确的候选组合名。
- 8 份 DOM 的主标题、地址块及 title 与 source-evidence 一致；对照页 8 张卡片、京艳首位、桌面和手机无横向溢出，16 个本地原文/DOM 链接均返回 200。原始 HTML 入口确认为纯文本。
- 页面运行异常为 0。16 组均观察到真实底图瓦片加载；这是名称展示的浏览器抽查，不是坐标精度或全域底图覆盖验收。

可直接查看的截图：

| 小样 | 桌面地图弹窗 | 手机详情 |
|---|---|---|
| 京艳 ‧ 翰林书院 | [桌面](outputs/screenshots/desktop-michelin-starred-11-map.png) | [手机](outputs/screenshots/mobile-michelin-starred-11-map.png) |
| 新荣记（金融大街） | [桌面](outputs/screenshots/desktop-michelin-starred-7-map.png) | [手机](outputs/screenshots/mobile-michelin-starred-7-map.png) |
| 新荣记（新源南路） | [桌面](outputs/screenshots/desktop-michelin-starred-18-map.png) | [手机](outputs/screenshots/mobile-michelin-starred-18-map.png) |
| 静一（琉璃厂东街） | [桌面](outputs/screenshots/desktop-michelin-bib-gourmand-10-map.png) | [手机](outputs/screenshots/mobile-michelin-bib-gourmand-10-map.png) |
| 湘彬萱（花园路） | [桌面](outputs/screenshots/desktop-michelin-bib-gourmand-13-map.png) | [手机](outputs/screenshots/mobile-michelin-bib-gourmand-13-map.png) |
| 屋里厢 | [桌面](outputs/screenshots/desktop-michelin-starred-21-map.png) | [手机](outputs/screenshots/mobile-michelin-starred-21-map.png) |
| 钟餐厅 | [桌面](outputs/screenshots/desktop-michelin-bib-gourmand-1-map.png) | [手机](outputs/screenshots/mobile-michelin-bib-gourmand-1-map.png) |
| TRB Hutong | [桌面](outputs/screenshots/desktop-michelin-starred-1-map.png) | [手机](outputs/screenshots/mobile-michelin-starred-1-map.png) |

同目录各有 `-search.png` 与 `-detail.png`，保留搜索结果和详情打开过程；[桌面对照全页](outputs/screenshots/desktop-comparison.png)、[手机对照全页](outputs/screenshots/mobile-comparison.png)展示用户小样。

过程限制如实保留：早期检查脚本在地图 0.8 秒移动中点击弹窗，以及详情关闭前填入下一查询，发生点击或输入竞争；另外两家新荣记仍在聚合点内，需要实际点一次放大后才能操作独立标记。最终脚本等地图移动完成、明确清空输入，并用实际缩放按钮展开聚合。桌面静一、湘彬萱、钟餐厅的较长弹窗与顶部搜索区可能重叠；本轮通过既有键盘关闭和实际拖动地图取得完整可读截图，不改应用布局。`detailPanned/mapPanned/zoomClicks` 明确记录这些操作，不能把这些截图解释为修复了既有布局问题。诊断保留于 `outputs/browser-attempt1.log`、`outputs/browser-attempt2.json` 至 `browser-attempt5.json`；只有最终 browser-evidence 的完整结果计为通过。

候选构建产物 SHA-256：`6382278beffd028b384aef011c655c88d397081ebae6be798ef155d9fba88500`，按现有 `artifactIdentity` 文件清单算法计算。源材料、候选数据、构建资源及截图入口均在本报告直接可追溯。会话脚本 ESLint、repository 输出/大小策略、报告相对链接和 `git diff --check` 已通过。未修改共享 helper 或业务展示逻辑，因此未新增每家餐厅的镜像单测，也未把小样校验说成正式全量发布门禁。

最终完整性复核见 [outputs/final-integrity.json](outputs/final-integrity.json)：浏览器检查后的构建产物与 build-evidence 文件清单一致，正式工程输入的 `sourceIdentity` 与构建时一致；最后一次 sample audit 再次通过正式数据未变与候选 4 条/8 字段边界。

开发小样已具备独立验收条件，请 orchestrator 转设计者复核。此处只报告开发验证结果，**不代签独立验收或用户确认**。当前名称口径是完整门店名候选，国内 402 条含港澳仍为建议范围；需用户直接确认名称口径和明确范围后才能推广。正式数据和现有服务继续保持原状。

## 独立验收：北京 8 家小样通过，仍待用户确认

2026-09-25，设计者按原方案独立验收完成。**结论：本次隔离小样通过，可以交用户直接查看；没有收到用户对完整名称口径及全量范围的明确确认，不放行全量。**此结论仅针对下列已核对候选，不表示正式数据已修订或已发布。

- 候选数据树 SHA-256：`9b658749952025115e7a7baf716cc6c4548c054d64ab889daef236af23a97e09`。
- 构建 ID：`66a6cb3aba5ea53aa300d5ff56a2803009992c381e7a0ed7e19e4e4181af9ff4`。
- 构建产物 SHA-256：`6382278beffd028b384aef011c655c88d397081ebae6be798ef155d9fba88500`。

验收没有运行开发的 `sample.py audit` 或 `preview.mjs check` 来代替独立判断。独立读取正式文件、候选、原始来源 DOM 和实际服务响应，另用新浏览器上下文操作真实页面。独立记录和脚本放在 `outputs/acceptance/`，均为本轮 local-only 检查材料。

### 独立结果与依据

| 项目 | 独立检查结果 | 证据 |
|---|---|---|
| 精确修改范围 | 对全部 671 条记录逐字段比较，只有指定 4 条的 `name_zh/name` 共 8 字段变化；另外 4 家样本整条保持；所有非名称事实和顺序保持 | [data.json](outputs/acceptance/data.json) |
| 正式数据与副本 | 设计基线中的 41 份正式 JSON 哈希全部保持；候选 13 份旧地址副本均与固定年度源字节一致 | [data.json](outputs/acceptance/data.json) |
| catalog | 仅北京两个榜单的本轮来源与 revision 改动；前 revision 可追溯；coverage、采集和完整性核验时间及其他字段保持 | [data.json](outputs/acceptance/data.json) |
| 原文与同店性 | 8 份原始 HTML 哈希匹配，逐条重新读主标题、地址块和 title；显式中英文 URL 对去掉各自 locale 后完整门店路径一致；人工核对地址及分店差异 | [data.json](outputs/acceptance/data.json)、[browser.json](outputs/acceptance/browser.json) |
| 合同校验 | 独立执行 Node 24 数据校验，`valid=true`，0 error；14 条既有重复坐标 warning，不属于本次名称修正 | [validation.json](outputs/acceptance/validation.json) |
| 实际服务与构建 | 从运行服务获取 release 和全部 28 个数据资源，响应字节哈希与候选及本地构建一致；源码输入和构建产物身份也重新计算并匹配 | [data.json](outputs/acceptance/data.json)、[integrity.json](outputs/acceptance/integrity.json) |
| 用户对照页 | 桌面 1440×1050、手机 390×844 均为 8 家、京艳首位，无横向溢出；旧名、候选、原始标题/地址及官方链接逐卡匹配，16 个本地原文/DOM 入口可读；DOM 按纯文本提供且哈希匹配 | [browser.json](outputs/acceptance/browser.json)、[桌面对照页](outputs/acceptance/desktop-review.png)、[手机对照页](outputs/acceptance/mobile-review.png) |
| 真实应用 | 两种尺寸共 30 次中英文搜索均只命中目标记录，搜索选中后的名称、原地址、官方链接一致；16 次实际地图标记点击对应正确餐厅；观察到的真实数据响应和页面 build/dataset 身份匹配，0 页面运行异常 | [browser.json](outputs/acceptance/browser.json) |

名称判定与原设计一致：京艳采用来源完整名「京艳 ‧ 翰林书院」；金融大街、琉璃厂东街、花园路来自正式分店标题。湘彬萱保留原文“萱”；屋里厢、钟餐厅、TRB Hutong 不猜译或主观改写。金融大街门店建筑称谓差异已在小样明示，本次不据此顺带修地址。搜索、详情与地图点的分店身份均已核对。

验收者实际查看了对照页和应用截图，包括 [静一桌面详情](outputs/acceptance/desktop-michelin-bib-gourmand-10-detail.png) 及 [京艳手机详情](outputs/acceptance/mobile-michelin-starred-11-detail.png)；完整名称及门店地址可读。其他 14 组详情截图同在本目录。

### 长弹窗与地图交互的判定

独立检查确实需要对两家新荣记各点一次地图放大，才能从聚合点展开到各自标记；桌面、手机均核对最终标记标题与官方链接，没有用脚本直接调用应用选店函数。这是实际操作步骤，不是分店被合并或名称错误。

开发报告中长弹窗遮挡、拖动地图及早期输入竞争的材料继续保留，不视为已修复。本轮独立路径使用新导航、等待地图移动完成和真实键盘/鼠标操作；1440×1050 的 8 家标题均直接可读，无需触发脚本中的拖图分支。另在 1280×720 用鼠标选中静一、湘彬萱、钟餐厅，3 家标题也都位于搜索区下方、保持一行、可直接读到，见 [short-desktop.json](outputs/acceptance/short-desktop.json) 及同目录 `short-*-initial.png`。

因此，现有材料不支持将该交互现象判为本次名称改动引入的阻断问题；本次可验证的名称展示与用户核对路径通过。该结论不保证所有地图位置、连续操作或视口都无布局问题，也不构成一次全站布局验收。

### 独立检查复现

下列命令不重新生成候选、不改变正式数据，也不覆盖开发的检查结果。浏览器脚本中的 origin 指向本次服务端口；服务若重启，须先核实新地址仍提供同一候选，再更新本地检查地址。

```sh
rtk proxy python3 eval/sessions/260925-0915-chinese-restaurant-names/outputs/acceptance/check-data.py
rtk proxy /Users/chengyanru/.nvm/versions/node/v24.21.0/bin/node scripts/data-contract.ts --root eval/sessions/260925-0915-chinese-restaurant-names/outputs/candidate/public/data --json
rtk proxy /Users/chengyanru/.nvm/versions/node/v24.21.0/bin/node eval/sessions/260925-0915-chinese-restaurant-names/outputs/acceptance/check-browser.mjs
rtk proxy /Users/chengyanru/.nvm/versions/node/v24.21.0/bin/node eval/sessions/260925-0915-chinese-restaurant-names/outputs/acceptance/check-short-desktop.mjs
```

### 用户查看与下一步

请用户直接查看 [8 家名称与依据对照页](http://127.0.0.1:55229/review/preview.html)，也可在 [星级候选应用](http://127.0.0.1:55229/?city=beijing&year=2026&guide=michelin-starred) 搜索「京艳」或在 [必比登候选应用](http://127.0.0.1:55229/?city=beijing&year=2026&guide=michelin-bib-gourmand) 搜索「静一」。服务保持运行。

待用户明确确认的是：是否采用当前小样所示的完整正式门店名口径，以及全量具体范围。国内 402 条（内地 221、港澳 181，排除东京）仍然只是建议。**独立小样通过不是用户确认；在其明确回复前，开发不得推广全量，验收者也不放行。**本轮没有需要退回开发修复的阻断项。

## 用户直接确认与全量开工（2026-09-25）

以下是 orchestrator 在本开发会话原文转交的用户直接答复，更新前文各阶段“待用户确认”的历史状态。确认问题为：「看过小样 http://127.0.0.1:55229/review/preview.html 后，是否确认采用其中的完整正式门店名口径（如『京艳 ‧ 翰林书院』），并按以下范围推进全量？」用户回答：**「确认，推进国内 402 条（含港澳，排除东京）」**。

据此采用已验收小样的完整正式门店名口径，核实国内 402 条（内地 221、港澳 181），排除东京 269。可在正式年度数据修正有依据的名称并生成派生数据；保留英文名和非名称事实，不据此清空未经证实名称，不批量简繁转换。未决继续补证或提出具体决策，不把未决写成通过。发布/部署未获新增授权。小样候选及独立验收材料保留，最终全量另交设计者验收。

### 全量中的两项用户指定待补证

开发就香港 Bib #9「台灣味」和 #39「璐璐豹豹」提出仅有已证实外文品牌、原中文名缺少官方依据的具体处置问题。用户在本会话直接答复：**「先保留原值并列为未决，我补充官方中文依据」**。两条记录因此保持完整原值，列为待用户补证，不计入名称已核实通过。其余已授权的国内名称核实、修订和验证继续推进；这不是用户缩小402条范围或放行全量语义验收。

### Jing 的用户明确指示

对于北京 starred #2，用户在本会话直接答复：**「他的名字就叫Jing，我这边也没有额外的网页，你就按这个来，中文名也按这个来就行。」**据此将 `name_zh` 和 `name` 修正为 `Jing`，保留既有英文名及其他事实。同一门店米其林中文页主标题已直接提供 `Jing`，所以该条不再未决；未把这项指示扩展到香港两条或上海阿娘面。

## 全量实施交接：399 条已核实，3 条未决

本轮按用户确认的国内402条范围逐条检查。当前 **120 条有依据修改、223 条有依据保持、56 条正式外文品牌保持、3 条未决**；前三类共399条。正式年度数据已应用120条名称修订，共239个字段，东京269条完全未动。**这不是402条名称全部核实完成，也不是全量独立验收通过。**未决记录完整原值保留。本节记录开发回交时的状态；按下文用户最新调整，这3条本轮不再要求补证，明确未核实即可，不阻断收尾。

逐条总账和变更前后名称：[full-source-evidence.json](full-source-evidence.json)。每条含稳定dataset/id、原记录哈希、原名/现名、判定、主标题、地址、来源链接、实际读取时间、原始材料哈希、同店依据及限制；旧catalog revision在同一文件保留。正式餐厅事实仍只维护在年度JSON。

| 数据集 | 范围 | 修改 | 有依据保持 | 外文品牌保持 | 未决 |
|---|---:|---:|---:|---:|---:|
| hong-kong/2026/michelin-bib-gourmand | 70 | 32 | 30 | 6 | 2 |
| hong-kong/2026/michelin-starred | 77 | 8 | 34 | 35 | 0 |
| beijing/2026/michelin-bib-gourmand | 26 | 19 | 7 | 0 | 0 |
| beijing/2026/michelin-starred | 32 | 9 | 20 | 3 | 0 |
| guangzhou-shenzhen/2026/michelin-starred | 20 | 6 | 13 | 1 | 0 |
| guangzhou-shenzhen/2026/michelin-bib-gourmand | 44 | 7 | 37 | 0 | 0 |
| shanghai/2026/michelin-starred | 51 | 18 | 25 | 8 | 0 |
| shanghai/2026/michelin-bib-gourmand | 35 | 15 | 18 | 1 | 1 |
| chengdu/2026/michelin-starred | 13 | 3 | 10 | 0 | 0 |
| macau/2026/michelin-starred | 21 | 0 | 20 | 1 | 0 |
| macau/2026/michelin-bib-gourmand | 13 | 3 | 9 | 1 | 0 |
| **合计** | **402** | **120** | **223** | **56** | **3** |

### 变更及非名称事实保护

[全量字段对账](outputs/full/reconciliation.json)对全部671条记录逐字段比较，检查字段集合、id/URL、数组顺序和所有非名称字段。仅name_zh和含需纠正中文片段的组合name变化，name_en、价格、坐标、地址、评级、状态、菜系及体验类型全部保持。香港一乐烧鹅的原name仅为英文，没有旧中文片段，故仅name_zh的括号排版变化；其余119条各修改两个名称字段，总计239字段。

13份固定年度旧地址副本由原data:aliases生成，并逐字节核对。东京年度源及副本、所有taxonomy/mappings均与全量开工基线一致。catalog只为国内11个已登记榜单追加名称依据和同版revision；coverage、scope、collectedAt、verifiedAt、officialCount等不变。README接入指南仅重新生成覆盖输入摘要，计数与名单状态不变。

基线保存在`outputs/full/baseline/public/data/`，其文件哈希随full-source-evidence保存；它是本轮实际工作区输入，非拿HEAD覆盖工作区。首次正式应用前检查基线一致；Jing追加指示后，应用脚本也核对当前值只能为本轮before或after，拒绝中途未知名称变化。旧小样候选和小样构建继续保留，未被全量覆盖。

主要纠正包括京雁→京艳 ‧ 翰林书院、诗·酒→拾久（东三环中路）、菁禧会→菁禧荟（长宁）、荣叔黄鱼面→荣家黄鱼面（静安），以及有来源的完整分店限定。所有修改的原始标题和完整前后值均可从总账逐项查阅；未将旧错字另存为别名。仅规范已披露的分店括号，保留其他来源标点，不批量简繁转换。

### 来源例外及限制

- 止观小馆原`zhiguan-courtyard`失效，官方北京一星列表直接链接`zhiguan`；新详情中文名及金鱼胡同12号对应，保持原名称。新入口仅用于证据，不越权改原guide_url。
- 澳门泓、瑞兆、當奥豐素1890使用已由旧P09材料对应的带编号listing，本轮重新核对中文标题及酒店/楼层/铺号。雅吉的旧URL跳到西班牙同名店，明确排除，改用美高梅澳门官网的中文原文和酒店地址证明名称保持。
- 香港潮樂園原listing失效，补用公开官方账号chiuchow_delicacies的中文名称和北角和富道96号。来源写地下1号店、旧记录写4号舖，差异保留；没有借名称任务修地址或营业状态。
- 上海壹零貳小馆的中文依据为餐厅公开官方账号`102house_shanghai`；亚洲50最佳2026官方档案给出罗斯福公馆506室/中山东一路27号并直接链接该账号，账号又链接原Michelin listing。两份原文分别支持名称和地址，`source.address_source`明示地址的独立来源，不把地址伪称为账号正文。保留账号原“貳”字。
- 成都来源为当前页面，版次可能已是2027；名称按实际读取时点注记，不修改edition_year=2026，不声称恢复2026全年名称或获奖完整性。
- 多条旧中文地址与来源不同，但既有英文地址可以对应；另有楼层、建筑称谓或明显街址差异。总账并列保存旧中英文地址和来源原文，保留差异，不把名称验证当作旧地址或真实迁址已验证。
- 英文品牌的大小写、排版和既有地域标识不在本次中文纠错中顺带清理；只有出现正式中文标题或明确用户指示时才替换原外文展示。Jing为用户明确指示的专门修订，不扩展到其他未决记录。

原始中文listing、补强官网/账号及发现材料在`outputs/full/sources/`、`outputs/full/extra/`，本地保留但不入Git；搜索结果只找入口，未作为最终名称依据。外部读取未提交预订、消息或账户操作。取证脚本为[full-capture.mjs](full-capture.mjs)、[extra-capture.mjs](extra-capture.mjs)；总账编译、应用及审计用[full.py](full.py)。

### 三条未决的具体边界

| 记录 | 已读到的事实 | 当前处置与所需补充 |
|---|---|---|
| 香港 Bib #9 台灣味 | 同店米其林中文正文主标题为Art & Taste，未证明原中文名 | 用户明确要求保留原值，待其提供官方中文依据；不自动回退外文 |
| 香港 Bib #39 璐璐豹豹 | 品牌官网为lulu BAOBAO，同店米其林完整分店标题为Lulu Baobao (Wong Chuk Hang) | 用户明确要求保留原值，待其提供官方中文依据；官网43号与listing39号的地址差异另保留 |
| 上海 Bib #2 阿娘面 | 旧米其林详情当前失效，本次官方现行列表和补查尚未恢复能支持该中文名的原文 | 原值保留并待补证；不从失效链接推断停业、退出或名称正确，不删记录 |

如未来另行取得同店官方依据，可再修订这3条；用户最新指示已取消本轮继续补证的要求。3条仍计入402条并保留原值，结论为未核实，不能被计作399条已核实名称。它们不再是本轮完成的阻断项。

### 最终技术验证与实际应用

- [全量核对页](http://127.0.0.1:55229/review/full/review.html)：402条完整前后名称、原文、同店依据、限制，按地区/结果/关键词筛选；3条未决明确单列，香港两条显示用户“保留原值待补证”的直接答复。
- [最终真实应用](http://127.0.0.1:64737/?city=beijing&year=2026&guide=michelin-starred)：提供本轮正式数据构建，可搜索Jing、京艳等，也可切换其他地区。服务信息见[server.json](outputs/full/server.json)。旧小样服务55229和用户原有服务继续保留。
- [全量核对页检查](outputs/full/review-check.json)、[用户保留指示展示检查](outputs/full/review-disposition-check.json)：桌面/手机402条、120修改、3未决筛选正确，401个本地原文摘录链接返回200且为纯文本，无横向溢出。[桌面未决截图](outputs/full/desktop-review-unresolved.png)、[手机未决截图](outputs/full/mobile-review-unresolved.png)。

正式数据[validation.json](outputs/full/validation.json)为valid=true，0 error，14条既有重复坐标warning。技术门禁通过不表示三个未决名称已证实。

完整门禁最初在主工作区遇到历史生成应用、旧test-results脚本等运行产物被eslint扫描，失败日志保存在[release-check.log](outputs/full/release-check.log)。没有降低规则或删除用户历史输出。改用项目既有release:snapshot流程，归档全部可版本化源码及实际工作区修改，在临时目录重放原六阶段门禁。快照机制自动核对构建输入SHA-256与工作区一致；仅复用相同node_modules依赖，未修改源码/配置来绕过检查。

Jing追加指示到达时，上一版验证尚在执行；上一版凭据保留但不作为最终交付通过证明。**最终版本**重新快照并完成check（类型/lint/数据）、test、check:coverage、build、test:e2e、test:performance，六阶段均exit 0。快速测试**16文件/273项通过**；浏览器门禁**84项通过、0失败/跳过**。随后从原工作区对复制出的相同构建独立执行release:verify通过，同时验证当前构建输入和产物未漂移。

- 最终快照：[candidate-source.json](outputs/full/final-snapshot/candidate-source.json)，归档[源码包](outputs/full/final-snapshot/candidate-source.tar.gz)（local-only）。
- 门禁：[result.json](outputs/full/final-release/result.json)、[verified.json](outputs/full/final-release/verified.json)、[完整日志](outputs/full/final-release-check.log)。
- 从原工作区复验：[final-verify.log](outputs/full/final-verify.log)。
- 构建输入SHA-256：`20fa901e3efc9de10880b259de29e516bebef1913aaf56a90e39fd5a1d1a934d`。
- 构建ID：`99d7d40b1c1ee0b9a8763a67eedc08f5c0b0a325c454a8d2340b72d5dc620355`。
- 构建产物SHA-256：`caf0373b6203f03b3fccd836589eaf5d1fe3426cd297fe0740d25c127c74fa3a`。
- 性能为受控本地测量：[performance.json](outputs/full/final-release/performance.json)。最大现有名单LCP中位数704ms，1000条夹具692ms，CLS均0，20次交互p95约30.3ms，预算通过。

最终构建复制到`outputs/full/app/`并提供独立预览，原主目录dist和既有服务未被该重放覆盖。临时验证工程为`/tmp/foodie-chinese-names-final-o8j7SQ`；原工作区源码、正式数据、被引用的本地证据与最终快照构建输入保持同一SHA-256。快照中的Git head可从descriptor追溯；无Git的解包重放不伪造HEAD。

独立于项目门禁，又用[full-browser.mjs](full-browser.mjs)消费最终真实应用：**25家代表记录覆盖11份国内榜单，桌面/手机共50场景、70次名称查询通过；48次地图标记实际激活通过；另2次确认態邸原本缺位置时保持可搜索详情和“暂无可靠坐标”提示。**三个未决记录的场景只验证其原值保留行为，不证明名称事实正确。28个发布数据资源的实际HTTP字节哈希均与当前正式public文件、release描述一致，0页面运行异常。详见[browser-evidence.json](outputs/full/browser-evidence.json)。

检查通过实际搜索、键盘关闭、缩放/拖动、聚合点及标记点击进行；没有注入名称、伪造响应或调用内部选店函数。先前尝试发现：图例遮挡点击点、原无坐标记录使用另一种详情容器、URL中的乘号被浏览器标准编码、原重复坐标需展开聚合点。脚本按这些实际情况调整操作和等价URL比较，未改应用或数据。失败诊断保留在`outputs/full/browser-attempt1.json`至`browser-attempt4.json`；最后延续同一buildId下已通过的18场景，只续验未完成场景，最终核对50个mode/key组合恰好齐全且无重复，续验来源记录于resumedFrom。

代表截图：[Jing桌面地图](outputs/full/screenshots/desktop-beijing-michelin-starred-2-map.png)、[京艳手机详情](outputs/full/screenshots/mobile-beijing-michelin-starred-11-detail.png)、[壹零貳小馆手机详情](outputs/full/screenshots/mobile-shanghai-michelin-starred-2-detail.png)、[成都蔻聚合展开](outputs/full/screenshots/desktop-chengdu-michelin-starred-4-map.png)、[雅吉地图](outputs/full/screenshots/desktop-macau-michelin-starred-13-map.png)、[態邸缺位置详情](outputs/full/screenshots/desktop-hong-kong-michelin-starred-18-detail.png)。其余同目录截图按mode/city/guide/id定位。当前视口观察到真实瓦片不构成新的位置精度验收。

### 当前回交与继续条件（以用户最新调整为准）

用户经 orchestrator 转交的最新原话：“整体而言，我觉得不用做那么重，就是这波剩下几个不确定的，就保持他们当下的状态就行。然后后续做完了以后，你直接帮我commit呀、推上线那些流程都做完。当然在做完之前，先让我做一下本地验证。”

据此，香港 Bib #9「台灣味」、#39「璐璐豹豹」和上海 Bib #2「阿娘面」保留当下完整原值，明确未核实，本轮不再要求补证。此为用户认可的保留处置，不能写成3个中文正式名称已证实，也不再作为本轮收尾阻断。国内402条范围、完整正式门店名口径和北京「Jing」专门指示继续有效，无需再次确认。

后续顺序固定为：**本地可验证交付 → 用户明确本地验证通过 → 开发执行commit、推送、部署与上线验证**。用户已经授权后续提交发布，但附有本地验证先行的条件；技术验收通过不替代这项用户验证。本段形成时尚未收到用户对本地验证结果的明确通过回复，当时暂不执行commit、推送或上线；后续进展如下。

后续进展：用户已对名称本地验证明确回复“我验收了一下，我觉得整体而言挺好，没什么问题。”名称验证条件已满足。随后新增的界面文案清理按本报告末节的已确认范围实施；发布继续等待该调整完成和验收，不重复确认已经通过的名称范围。

以下独立验收结论负责技术判断；开发负责后续提交发布准备和获准后的执行。三个保留项不要求等待外部材料。

## 本轮独立技术验收通过：交用户本地验证

2026-09-25，设计者完成当前正式数据交付的独立验收。**按用户最新收尾要求，本轮技术验收通过，没有需要退回开发修复的阻断项。**402条的准确结论是：120条有依据修改、223条有依据保持、56条正式外文品牌保持、3条按用户要求保留未核实。399条名称经核验；没有将另外3条认证为正式名称，也不再要求本轮补证。

独立复核实际读取了全部记录的原始来源主标题、地址和前后名称，并逐条检查同店关系；没有用开发总账的结果标签或开发自检代签。名称保留了来源汉字与品牌写法，港澳未做批量简繁转换；北京Jing的两字段处理符合用户明确指示。

| 检查 | 独立结论与证据 |
|---|---|
| 逐店名称 | 402个唯一记录键与原始Git基线、当前正式数据逐一对齐；399条通过名称核验，3条明确保留未核实。见[逐条验收结论](outputs/acceptance/full/semantic-review.json) |
| 原始依据 | 401份主来源原始材料哈希、目标标题及地址独立核对；其中香港两条的外文主标题只支持“中文未证实”，不被计为中文名通过。阿娘面无有效中文来源。补充官网/账号及地址档案另核查。见[来源检查](outputs/acceptance/full/source-checks.json) |
| 改动边界 | 以任务前Git提交`34763f4e1b71c038e8a2bace80c0bcb90b4fba48`读取原值，确认120条、239个名称字段变化；671条顺序和非名称事实保持，东京269条及其副本字节不变；13份年度旧路径副本一致。见[边界检查](outputs/acceptance/full-boundaries.json) |
| 数据与覆盖 | 独立重跑正式数据校验为valid=true、0 error，14条既有重复坐标warning；覆盖输入摘要检查通过。见[校验输出](outputs/acceptance/full/validation.json) |
| 发布检查有效性 | 原六阶段门禁日志齐全、全部exit 0；独立重算当前源码与产物身份、核对快照源文件集合及归档哈希，并执行产物凭据校验。28个实际HTTP数据资源与正式数据和release描述逐字节匹配。见[构建与服务完整性](outputs/acceptance/full/release-integrity.json) |
| 实际应用 | 独立操作11份国内榜单的代表记录，桌面/手机共22个搜索详情场景通过；18次实际地图激活通过，另4次确认態邸和岁集院子·拾月原缺坐标仍可搜索看详情；0页面运行异常。见[应用检查](outputs/acceptance/full/app.json) |
| 用户核对页 | 桌面/手机均402条，逐卡名称与结果类别和总账一致，3条保留项筛选正确、无横向溢出；已将页面收尾提示同步为最新用户决定，不再显示本轮必须补证 |

特殊来源已单独判断：壹零貳小馆的官方账号与50最佳同店地址档案相互对应，保留“貳”；潮樂園账号明确同名、同街道96号和“只此一家”，铺号差异保留；雅吉采用澳门美高梅官网，排除旧URL跳到西班牙同名店；止观小馆及澳门三条带编号listing与所引发现/历史材料的门店地址对应。部分旧地址与现行来源不同的记录，额外比对了原英文地址或既有P09官方英文材料。这里核验的是所登记listing的名称，不声称旧地址、坐标或历史营业变化已经修复或认证。

采用源码快照重放门禁合理：原工作区失败来自被扫描的本地运行产物（包括本轮验收临时脚本与已生成应用），没有降低lint规则；最终快照与当前构建输入逐文件相同。独立检查的输入SHA-256为`20fa901e3efc9de10880b259de29e516bebef1913aaf56a90e39fd5a1d1a934d`，构建ID为`99d7d40b1c1ee0b9a8763a67eedc08f5c0b0a325c454a8d2340b72d5dc620355`，产物SHA-256为`caf0373b6203f03b3fccd836589eaf5d1fe3426cd297fe0740d25c127c74fa3a`。未重复整套已通过门禁，也未扩展全站布局或地图精度任务。

独立应用脚本曾有两项检查假设错误：只把態邸视为无坐标记录，以及使用默认聚合点class而非本应用的`.cluster-badge`。已按正式数据合同和实际DOM修正检查操作，保留先前通过的同一buildId场景，只续验剩余场景；完整22组唯一mode/key结果已对齐，诊断见`outputs/acceptance/full/app-attempt1.json`、`app-attempt2.json`。这些不是产品缺陷，应用和正式数据没有因验收而修改。独立脚本与截图均留在该输出目录。

**现在交用户本地验证：**

- [最终真实应用：北京星级](http://127.0.0.1:64737/?city=beijing&year=2026&guide=michelin-starred)：搜索`Jing`、`京艳`，确认展示符合期望；可切换城市继续体验。
- [402条名称与原文对照页](http://127.0.0.1:55229/review/full/review.html)：按“有依据修改”查看修订，按“未决 · 保留原值”查看台灣味、璐璐豹豹、阿娘面。
- 可参考[独立Jing手机详情](outputs/acceptance/full/mobile-beijing-michelin-starred-2.png)和[独立壹零貳小馆桌面详情](outputs/acceptance/full/desktop-shanghai-michelin-starred-2.png)。

名称阶段技术验收至此完成。随后用户已明确通过名称本地验证，并新增界面清理要求；当前发布进度以本报告下一节的最新确认范围为准，不再等待一次重复的名称确认。

## 新增界面清理：用户已确认，保留坐标来源与可见版本号

名称本地验证已获用户通过，名称技术验收结论保留。新增问题属于面向食客的展示文案，不重新开启名称取证或调整餐厅事实。设计者按用户显式调用的 `/Users/chengyanru/.agents/skills/reasoning-sidecar/SKILL.md` 完成只读调查，检查了桌面和手机的首页、城市/榜单选择、搜索/无结果、筛选/空筛选、统计、图例、详情、无可靠位置、热力图、离线浏览及悬浮提示，共22个实际界面状态。

用户对清单的最新原话：“我觉得坐标来源这个应该保留，包括版本号应该保留，因为版本号是让我人工可以显著看到线上的那个当前版本的一个地方。其他的你识别读错可以去除。”据此，**保留坐标来源及页头显著可见的真实版本号，其余清理范围已确认，可以交开发实施，无需再确认同一清单。**用户意图优先于技能中的一般分离建议。

### 开发可执行范围

| 项目 | 已确认处置 |
|---|---|
| 坐标来源 | 保留详情中的「坐标来源」及已有值，如`google_maps`、`manual_web_lookup`。本项撤回原删除建议，不更改源字段 |
| 页头版本号 | 保留当前可见位置和可辨识程度，继续来自项目`VERSION`权威来源。不可隐藏、写死或另造显示编号。发布时应能用它核对实际线上版本 |
| 价格解析说明 | 有效价位在详情显示「价位 ¥¥¥」，删除「（价格等级 3，共 4 档；原文 ¥¥¥）」等重复解释。地图悬浮及读屏同步简化，读屏可用「价位第3档」表达已有相对等级；保留真实金额、币种、价格条件及官方页面入口，不换算或猜价，不修改原始价格字段 |
| 标注工作状态 | 从详情标签和地图提示移除「主打体验未标注」。缺失类别继续缺失，不改写成已知「其他料理」；不变更分类数据、筛选语义或地图图标体系 |
| 详情分类标签堆叠 | 详情不再把内部分类组与原始菜系重复列出；保留已知主打类型和原始菜系，完全相同的词只显示一次。例如富春居从「粤菜／中餐／粤菜」简化为「中餐／粤菜」，止观小馆不再出现内部组「鲁菜」和工作状态「主打体验未标注」，保留原始菜系「东北菜」。分类组继续用于现有颜色、筛选和图例，不做数据重新分类 |
| 构建与数据哈希 | 移除状态栏面向用户的`title`中「构建99…／数据101…」等排障内容。此项与保留的可见版本号不同；非可见诊断属性、release记录、测试定位能力及发布凭证可继续保留 |
| 名单来源过程说明 | 普通页面不直接显示catalog中的生产过程文字，如「旧登记范围」「旧文件自报年度」「完整身份集合」「现行在线集合对齐」等。改为面向读者的结论：未核验榜单说明「该榜单的年份、范围及完整性尚未核实，请以官方指南为准」；部分名单说明「该年度名单尚未收齐」。保留相应未确认状态，不升级可信度、不改变coverage。未核验空名单的提示也只说「这里暂未收录，不代表官方没有收录」，不说「空文件」 |
| 图例与离线措辞 | 图例保留使用含义，可压缩为「颜色看菜系，图标看主打；¥越多价位越高，不表示金额，不同城市不宜直接比较」。缓存分支的「使用已验证缓存」改为「使用已保存内容」；离线、更新提醒及重试操作继续保留，不暴露验证流程 |
| 影响使用的限制 | 「无法地图定位」「区域近似位置」、地图不可用、名单不完整、搜索无结果等仍要表达。无可靠位置可写「暂时无法在地图定位」；不能因为精简而让用户误以为可定位或已核实 |

以上是本轮具体范围，不扩展布局改版、分类体系、源数据修补、坐标纠正或版本管理系统。内部材料整理过程与原始依据继续由现有runbook、catalog、逐店证据和发布记录承载；不清理维护报告，不强制新增UI reasoning文件。尚未触发的同源状态分支按相同展示边界处理，不凭空添加金额、分类或确定性。

### 交付与验收

复用共享展示路径，保证桌面弹窗、手机详情、地图悬浮与读屏不出现互相矛盾的文案。重点复核富春居的有效价位、止观小馆的缺失主打标签、態邸的无位置提示，以及页头版本和坐标来源确实仍可看到。名单不完整和离线状态保留意义；搜索、筛选、图例继续可用。跑与改动相关的已有检查，保留必要发布门禁，不重复名称逐店补证或扩展全站问题。

只读调查证据见[22个实际界面状态及title/aria文案](outputs/ui-copy-review/views.json)、[价格说明现状](outputs/ui-copy-review/mobile-detail-price3.png)、[未标注标签现状](outputs/ui-copy-review/mobile-detail-unclassified.png)。这些都是清理前材料，不能作为修改后通过的证明。

本次清单已获用户确认，开发可实施后回交设计者验收。当前产品文案与代码尚未由设计者修改；不要把设计确认记录成实现完成。此前commit、推送、上线授权继续有效，发布暂缓至本轮已确认调整完成并通过验收，随后沿用既定发布流程。

## 界面清理实施回交（2026-09-25）

已按上述用户确认范围完成展示层修改，交设计者复验。**最新实际应用入口：[北京星级](http://127.0.0.1:56144/?city=beijing&year=2026&guide=michelin-starred)**；可搜索富春居、止观小馆、Jing、京艳，切换香港查看態邸。服务信息见[server.json](outputs/ui-cleanup/server.json)。64737保留为名称阶段旧界面预览，55229保留历史名称对照；本次界面验收使用56144。

### 改前与改后

| 项目 | 当前实现 |
|---|---|
| 价格 | 富春居由带“价格等级3，共4档；原文”的尾注改为“价位 ¥¥¥”。读屏文本为“价位／第3档”，地图title与aria-label使用“价位第3档”。未知格式保留原文字，不再添加“未识别等级”；真实金额、币种和条件保留，如態邸仍为“HKD 約 700 以上” |
| 分类 | 富春居由“粤菜／中餐／粤菜”改为“中餐／粤菜”；止观小馆保留“东北菜”，去掉内部组“鲁菜”和“主打体验未标注”。完全相同的标签只显示一次；缺失主打类型不补成“其他料理”。现有分类组仍控制颜色、筛选和图例，原图标保持 |
| 名单状态 | 不再把catalog生产过程文字放进title；未核验榜单显示“该榜单的年份、范围及完整性尚未核实，请以官方指南为准”，部分名单显示“该年度名单尚未收齐”，未核验空名单保留“这里暂未收录，不代表官方没有收录” |
| 状态栏与图例 | 删除构建/数据哈希title，保留非可见data-build/data-revision及release记录。图例改为“颜色看菜系，图标看主打；¥越多价位越高，不表示金额，不同城市不宜直接比较”。缓存提示改为“使用已保存内容”，离线、更新提醒和重试保留 |
| 明确保留 | 详情坐标来源及原值、页头原位置可见的v0.3.0、官方链接、无可靠定位和区域近似位置提示。版本仍从VERSION读取，本轮未另造编号、未改版本值 |

实现复用`src/data/display.ts`的共享事实展示，供Leaflet弹窗、React详情及地图提示消费；共修改5份应用文件、6份既有检查文件。没有创建新的UI reasoning文档，没有改餐厅原始事实或分类体系。[41份正式数据字节对账](outputs/ui-cleanup/data-unchanged.json)与名称验收时完全一致，包含年度数据、旧路径副本、catalog及taxonomy/mappings；名称399条已核实、3条原值保留未核实的结论不变。

### 实际应用与相关检查

[ui-browser.mjs](ui-browser.mjs)直接操作新生产构建。桌面1440px、手机390px分别检查富春居、止观小馆、態邸、Jing、京艳，共10个搜索详情场景，加2个离线场景，**12个场景通过、0页面异常**。检查了标签去重、价格文本、官方链接、坐标来源、真实版本可见、无横向溢出及地图title/aria标签；无位置记录保持可查详情。读屏证据来自浏览器Accessibility树及隐藏价格文本，没有声称执行过VoiceOver语音验收。断开页面与Service Worker两者网络后，桌面和手机仍能浏览已保存内容并显示重试按钮。

证据：[browser.json](outputs/ui-cleanup/browser.json)、[富春居手机详情](outputs/ui-cleanup/screenshots/390-beijing-3.png)、[止观小馆手机详情](outputs/ui-cleanup/screenshots/390-beijing-9.png)、[態邸手机详情](outputs/ui-cleanup/screenshots/390-hong-kong-18.png)、[桌面富春居](outputs/ui-cleanup/screenshots/1440-beijing-3.png)、[手机离线](outputs/ui-cleanup/screenshots/390-offline.png)。检查脚本先前错误地假定搜索后标记一定已经脱离聚合、仅页面断网就能让Worker断网、React读屏文字一定在同一个节点；按实际行为调整操作与断言，未为此修改应用。诊断保留为browser-attempt1/2/3.json；最终同buildId的6个桌面场景沿用，只续验手机6场景。

类型、lint、数据、覆盖检查和构建通过；单元测试16文件273项通过。正式数据0 error，仍有14条既有重复坐标warning。已通过的名称逐条取证不重做。仓库产物策略与`git diff --check`通过。

### 发布门禁的准确状态

继续使用既有源码快照重放方式，未降低规则或移除用户本地运行产物。[最终源码快照](outputs/ui-cleanup/final-snapshot/candidate-source.json)与当前构建输入一致。首次门禁的3处旧离线断言仍要求“缓存”，已按用户确认的“使用已保存内容”更新。此后同一最终源码的两次完整浏览器运行分别83/84通过，但失败项不同：一次在地图标记淡入opacity=0.62274时留下对比度未决；另一次WebKit手机密集标记场景关闭详情等待超时。两项随后均原样单独复验通过，没有降低对比度标准、增加自动重试或修改地图交互。不能据此断言问题已永久修复，也不把两次结果合成一次整套门禁成功。

- 完整运行及失败证据：[release-attempt2/result.json](outputs/ui-cleanup/release-attempt2/result.json)、[final-release/result.json](outputs/ui-cleanup/final-release/result.json)，各目录含原始日志与失败截图。
- 对比度定向复验：[p06-browser.json](outputs/ui-cleanup/accessibility-recheck/p06-browser.json)、[原失败状态的复验](outputs/ui-cleanup/accessibility-recheck/p06-chromium-no-match.incomplete-review.json)；原测试1项通过、0失败。
- WebKit定向复验：[p09-visual-encoding.json](outputs/ui-cleanup/webkit-recheck/p09-visual-encoding.json)；原测试1项通过、0失败。
- [检查总账](outputs/ui-cleanup/check-summary.json)记录同一源码84个场景均曾通过，同时明确`releaseGatePassed=false`，它不是发布凭据。

浏览器门禁失败后单独完成原性能检查，[performance.json](outputs/ui-cleanup/performance.json)预算通过：当前最大名单LCP中位数700ms，1000条夹具696ms，CLS均0，20次交互p95约30.7ms。这是本地受控测量。

**当前新版没有成功的完整release:check凭据，不能沿用名称阶段旧verified.json为界面改版放行。**本次不再反复整套重跑，将实现、实际应用证据及这项门禁限制一并交设计者判断；后续发布必须按项目原流程通过完整质量门禁，不跳过失败，不将定向复验冒充发布授权。

[交付一致性](outputs/ui-cleanup/delivery-check.json)确认当前源码等于最终快照，预览目录逐文件等于实际受测dist，HTTP release.json也一致：构建输入SHA-256为`74be0b3bc4786b86f114bfd8e4c8e446d30dfd696503bfb436071e00fb3fbb87`；buildId为`efdf1f32f08ebcbcd20fcf77e0f23d9718b80c095c01b405bf390b4526566c48`；产物SHA-256为`df94fd7d817e745ad34dc3096149e3a2d4fdbcbd6ff36ea1d9d5b0c23a79b08a`。

本节是开发实施回交，不代签设计者验收。名称已获用户本地确认，此清理范围也已确认，不再重复询问。尚未commit、推送或部署；等待设计者复验及orchestrator的发布交接。

## 界面清理独立复验：展示通过，发布门禁尚未完成

设计者已独立复核当前56144预览、共享展示代码和两次完整门禁的原始失败材料。**已确认清单的界面文案及保留项通过；尚不能为新版签发发布放行结论。**名称验收和用户名称本地确认继续有效，不需要重做。

### 新版界面与数据边界

独立检查10个实际状态：桌面/手机各检查富春居、止观小馆、態邸、东京部分名单及断网后的已保存内容。富春居显示「价位 ¥¥¥」与读屏「第3档」，标签为「中餐／粤菜」；止观小馆保留「东北菜」，不再展示「鲁菜／主打体验未标注」；態邸的金额条件、`manual_web_lookup`和无法定位提示保持。页头v0.3.0可见，版本仍对应VERSION，坐标来源行未删除。官方链接、榜单未核实/尚未收齐、离线和重试保留。未发现此次文案改动引入的页面横向溢出或运行异常。

源数据直接与已验收名称阶段的源码清单逐文件比较，41份正式JSON全部未变；未重新跑名称取证。另对当前源码、最终快照、预览产物和28个HTTP数据资源进行独立哈希核对，均对应本次新版：source `74be0b3bc4786b86f114bfd8e4c8e446d30dfd696503bfb436071e00fb3fbb87`，build `efdf1f32f08ebcbcd20fcf77e0f23d9718b80c095c01b405bf390b4526566c48`，artifact `df94fd7d817e745ad34dc3096149e3a2d4fdbcbd6ff36ea1d9d5b0c23a79b08a`。

独立证据：[ui.json](outputs/ui-cleanup/independent-review/ui.json)、[富春居手机](outputs/ui-cleanup/independent-review/390-beijing-富春居.png)、[態邸手机](outputs/ui-cleanup/independent-review/390-hong-kong-態邸.png)、[汇总结论](outputs/ui-cleanup/independent-review/conclusion.json)。没有以开发的12场景自检替代这些检查。

### 对两项发布失败的判断

**P06对比度：已证实在转场中取样，优先修测试等待边界。**原日志并非静态颜色低于阈值，而是`opacity=0.62274`使`reviewIncomplete`无法完成合成对比度判断。现有`accessibility.helpers.mjs`的`audit`仅在开始时枚举一次`document.getAnimations()`；此后地图仍可创建/启动新的聚合标记淡入，因此这一次等待不能保证真正读到稳定状态。单独复验通过支持这一判断，但不能据此把原未决标为通过。原对比度阈值和未决即失败的规则应保持。

**P09 WebKit关闭：根因未完全定位，不能直接归为环境偶发。**原失败保留了「甜品测试」详情，在调用关闭后仍可见直至12秒超时；没有足够的点击命中/事件顺序材料来区分未命中、未处理或重新打开。设计者仅做了一次带事件记录的临时副本定向观察，保留原点击与隐藏/取消选中断言，1项通过。留存的关闭轨迹显示调用关闭常发生在卡片`slide-up`动画time=0时，成功的pointer/click事件则发生在`transform=none`后，说明操作就绪边界值得优先处理；这不证明先前失败已经修复，更不能据单次通过断言不是产品问题。

诊断副本和材料在[webkit-diagnostic.mjs](outputs/ui-cleanup/independent-review/webkit-diagnostic.mjs)、[事件记录](outputs/ui-cleanup/independent-review/webkit-diagnostic/independent-webkit-close-events.json)及同目录`webkit-diagnostic/`。该事件数组在页面重载后重置，最终留存的是后续关闭轨迹，**没有声称捕获了原失败密集阶段的事件序列**。这是诊断材料，不是新发布凭据；本轮未改产品或正式测试文件。

### 交开发的最小下一步

1. 在现有`tests/e2e/accessibility.helpers.mjs`的`audit`中补有界的视觉稳定等待：地图缩放/聚合转场结束、被测可见目标的有限动画已结束，重新采样到的目标几何与opacity在连续帧稳定，再运行原axe及未决复核。不要仅等待最初枚举的一批动画，也不要把所有非1 opacity跳过、强设为1、降低阈值或为过门禁禁用产品动画。超时保留状态证据；稳定后仍有非1透明度或真实对比度问题，继续按原规则失败。
2. 在现有`tests/e2e/visual-encoding.test.mjs`的`closeDetail`附近补最小就绪条件：详情入场动画结束，关闭按钮位置稳定且点击点命中按钮后，再执行原关闭点击；保留「详情隐藏」和「选中标记清空」两个断言。失败时记录当前餐厅、按钮rect/命中对象、动画状态、click/pointer事件、dialog是否先关闭再出现；事件记录按场景/重载分段保存，避免覆盖。不要简单加长12秒超时、自动重试点击或改用Escape跳过鼠标关闭路径。若稳定命中的点击仍不能关闭，应作为产品交互缺陷继续修复，而非豁免测试。
3. 修改后只先运行这两个既有定向用例，确认改动针对具体失败；随后对新的同一份源码和产物重新完成一次原六阶段`release:check`，取得完整成功的84项浏览器门禁及性能结果，再执行匹配的`release:verify`。测试文件本身也是构建输入，改后应重新快照。失败继续保存原始证据，不通过反复整套碰运气或合并分次通过制造凭据。

定向入口（使用项目Node 24/npm 11环境）：

```sh
rtk proxy node --test --test-name-pattern='P06-R1/R4/R6 chromium: complete keyboard journey and distinct failures' tests/e2e/accessible-interface.test.mjs
rtk proxy node --test --test-name-pattern='P09 R1–R7 webkit 390px' tests/e2e/visual-encoding.test.mjs
```

处理范围仅上述等待/诊断边界及必要的真实缺陷，不扩展通用测试框架或全站改造。无需重做已通过的名称确认，也无需为现有清单再征询用户。后续commit、推送、上线已有授权；**当前缺的是新版有效的完整发布门禁凭据，补齐并复验后再继续既定发布流程。**旧名称阶段的verified.json和本轮定向通过都不能替代它。

## 发布门禁修复回交：新凭据已取得（2026-09-25）

已按独立复验给出的最小步骤处理两个具体等待边界，先通过两个指定定向用例，再对同一份新源码快照完成**一次完整release:check，六阶段均exit 0，84项浏览器测试全部通过、0失败/跳过**。随后从原工作区对相同产物执行匹配的release:verify通过。前节缺少有效发布凭据的状态至此更新；本节仍是开发回交，待设计者针对修复及凭据复验，不代签独立验收。

### 修复内容与边界

- `tests/e2e/accessibility.helpers.mjs`：audit在3秒上限内逐帧重新枚举可见目标的有限动画及地图缩放/聚合/平移状态，检查目标几何、opacity和transform连续至少4帧且200ms稳定后，再执行原axe与未决复核。记录每次等待的最终目标状态和最近变化；超时明确失败并由现有机制保留截图。稳定的非1透明度仍进入原对比度判断，没有跳过、强设opacity或改变阈值。
- `tests/e2e/visual-encoding.test.mjs`：closeDetail先在3秒上限内确认详情入场动画结束，关闭按钮几何连续至少4帧且100ms稳定、中心命中按钮，再执行原单次真实click。详情隐藏及取消选中两个断言保持。按测试场景、documentId分段记录餐厅、rect、命中对象、有限动画、真实pointer/touch/mouse/click事件和详情出现/消失顺序；重载不覆盖已有段。关闭失败继续抛错，无自动再次点击、Escape替代或延长原关闭超时。

与已独立验收UI版本相比，仅修改上述两个测试文件：[精确修复diff](outputs/gate-fix/gate-fix.diff)。[应用与数据对账](outputs/gate-fix/unchanged-app-data.json)确认100个应用源码、正式数据及VERSION文件均未变，其中41份正式数据保持。没有扩大到通用测试框架，没有修改产品交互或重新进行名称取证。

### 定向与完整验证

[定向日志](outputs/gate-fix/targeted.log)记录两个指定用例2/2通过。[定向汇总](outputs/gate-fix/targeted-summary.json)：P06的8次视觉等待均稳定，最长约1147ms；P09跨3个页面文档完成23次关闭，23次均为稳定命中后的真实点击，隐藏和取消选中均通过。完整轨迹见[targeted/p09-visual-encoding.json](outputs/gate-fix/targeted/p09-visual-encoding.json)，视觉采样状态见targeted目录的各`.stability.json`。没有用这两项定向通过替代完整门禁。

之后使用[新源码快照](outputs/gate-fix/snapshot/candidate-source.json)重放项目原六阶段门禁：[完整运行日志](outputs/gate-fix/release-check.log)、[result.json](outputs/gate-fix/release/result.json)、[有效verified.json](outputs/gate-fix/release/verified.json)。类型、lint、数据、273项单元测试、覆盖检查、构建、84项浏览器测试、性能均通过。数据校验仍为0 error、14条既有重复坐标warning。没有重跑碰运气或合并分次结果；本次修复后的完整门禁只执行了一次。

完整运行中98次视觉稳定等待全部成功，最长约1336ms；P09的10个场景、18个文档分段共114次关闭全部通过，见[关闭汇总](outputs/gate-fix/close-summary.json)及[完整关闭事件记录](outputs/gate-fix/release/browser/p09-visual-encoding.json)。本轮没有出现稳定命中后仍无法关闭的失败；原失败材料继续保留，不据此宣称其他未知交互问题已不存在。

[性能结果](outputs/gate-fix/release/performance.json)通过原预算：最大现有名单LCP中位数704ms，1000条夹具696ms，CLS均0，20次交互p95为32ms。复制同一受测dist后，从原工作区执行[release:verify](outputs/gate-fix/release-verify.log)通过，确认当前构建输入及所有产物字节匹配新凭据；没有沿用名称阶段或UI清理失败阶段的凭据。

### 最新实际预览与构建身份

最新入口：[北京星级实际应用](http://127.0.0.1:49665/?city=beijing&year=2026&guide=michelin-starred)。[服务信息](outputs/gate-fix/server.json)指向本次通过门禁的产物副本。旧56144、64737、55229及用户原有服务保持，不覆盖旧验收产物。

[新入口实际加载检查](outputs/gate-fix/preview-check.json)通过：新浏览器实际读取的data-build与新release一致，北京星级数据revision匹配；富春居搜索详情仍显示简洁价位与坐标来源，页头真实版本为v0.3.0，0页面异常。见[当前应用截图](outputs/gate-fix/preview.png)。应用源文件未改，因此沿用已通过的名称和UI语义验收，不重复逐店或整套UI复验。

- 构建输入SHA-256：`919d63342f2aec183a1917bea234c40e89d56eb6a23239735eef980aec20731e`。
- buildId：`8a08b9b12cda8a23b8c2add747a05afa0e53acc272b77da8bddde77fdaab07c7`。
- 产物SHA-256：`d96834268b3e2219c10b2e486908e05c396ce61932c38d9b5e00ec99d267939d`。

本次回交供设计者复核等待/记录边界、原断言保留及新凭据有效性。尚未commit、推送或部署；待设计者复验和orchestrator发布交接后，继续已获授权的提交上线流程，无需用户重复确认名称或UI清单。

## 最终针对性复核通过：可执行已授权发布

用户已明确完成最后本地验收，原话：“我最后验收过了，我感觉挺好的。反正视觉上看没什么问题，你这边流程走完就发布到线上了。”设计者现已完成本次两处测试修复及新发布凭据的针对性复核，**结论：可以交开发执行已授权的commit、推送、部署和线上核验，无需再次征询用户确认。**名称与UI验收不重开；3条未核实名继续按用户决定保留，不构成发布阻断。

本次独立核对结果：

- 与已验收UI版本的输入清单比较，仅`accessibility.helpers.mjs`和`visual-encoding.test.mjs`两份测试文件变化；产品代码、正式数据及VERSION未改变。当前208个构建输入文件与新快照、成功运行及有效凭据逐项一致。
- P06新增的是3秒有界稳定等待，原axe范围、严重问题断言、未决即失败规则和对比度阈值保持。P09仍执行一次真实关闭click，仍要求详情隐藏和选中标记清空；没有自动重试、Escape替代、延长原关闭超时或吞掉失败。分文档诊断不改变应用状态。
- 完整运行日志确认六阶段全部exit 0，273项单测、84项浏览器测试全部通过，0失败/跳过，性能通过。98次视觉稳定等待和114次关闭记录与汇总一致。这是一份新的完整成功运行，不是拼接先前分次结果。
- 独立调用现有`verifyReleaseArtifact`，重算当前源码及全部产物清单、核对快照归档哈希，并从49665预览读取release描述及33个数据/应用文件，均与当前源码、正式数据和本次凭据匹配。未重跑整套测试来代替审查。

最终放行身份：

| 对象 | SHA-256 / ID |
|---|---|
| 构建输入 | `919d63342f2aec183a1917bea234c40e89d56eb6a23239735eef980aec20731e` |
| buildId | `8a08b9b12cda8a23b8c2add747a05afa0e53acc272b77da8bddde77fdaab07c7` |
| 受测产物 | `d96834268b3e2219c10b2e486908e05c396ce61932c38d9b5e00ec99d267939d` |

证据：[独立最终复核](outputs/gate-fix/independent-review.json)、[完整成功运行](outputs/gate-fix/release/result.json)、[匹配发布凭据](outputs/gate-fix/release/verified.json)。最新实际预览仍为[49665北京星级](http://127.0.0.1:49665/?city=beijing&year=2026&guide=michelin-starred)。

此前“新版缺少完整发布凭据”的阻断至此解除。后续由开发继续提交、推送、上线与线上核验，orchestrator按既定流程交接。此处记录的是可发布结论，不声称部署已完成；上线结果仍由实际发布与线上核验记录证明。
