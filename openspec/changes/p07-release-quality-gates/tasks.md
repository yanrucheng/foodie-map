## 1. 验证入口与 CI

- [x] 1.1 汇总 P01–P06 的合同、命令与最新证据；P03 按用户本轮交接已验收，P05/P06 剩余边界同步至 evidence/catalog-integration/dependencies.json。
- [x] 1.2 PR/发布共用正式 check、快速集、check:coverage、构建、浏览器和性能门禁，核对相同产物；没有替身覆盖命令。
- [x] 1.3 保留一个 test:e2e 入口，自行管理服务/动态端口；正式 catalog、新城两版与 P05 实际名单集成纳入浏览器矩阵。
- [x] 1.4 首次失败证据与双引擎审计保留；Safari 历史实测只按其构建/步骤引用。

## 2. 缓存与交付

- [x] 2.1 正式 catalog/年度/taxonomy/mappings 经 P02/P03 校验生成不可变修订，验证新年度、同年度修订及旧载荷注入。
- [x] 2.2 坏响应不能替换好缓存，所有写入绑定 Worker 事件；其他应用命名空间保留。
- [x] 2.3 已访问数据集离线刷新/重开/导航回退与搜索/筛选/详情，未缓存选择明确失败，联网重试保留上下文。
- [x] 2.4 VERSION 保持 0.3.0；正式发现链 A→B→A 与上一真实候选 Worker 升级均演练，更新发布/回滚说明及产物摘要。

## 3. 性能与综合演练

- [x] 3.1 生产、固定 Chromium、4× CPU、10Mbps/40ms、390×844，最大名单及种子 7042026 的 1000 条 fixture 各冷导航 5 次，保存全部样本。
- [x] 3.2 LCP/CLS/全部首屏自有 JS gzip/20 次交互预算按原协议执行；最终值以当前干净重放 performance.json 为准。
- [ ] 3.3 未参与实现的验收 Agent 独立重放 G1–G4、发布和回滚。本轮提供自测、完整候选、来源/身份对账与可直接执行命令，不代签独立结论。
- [x] 3.4 移除已解决的 P03 缺失/正式联调阻塞；保留 P05 未证实域的精度、东京新底图证据适用范围、P06 其余人工范围、远端 CI 与独立验收未执行项。

## 4. 最终验收记录

- [x] 4.1 开发 Agent 提交跨包集成、完整候选、干净重放、修改归属及逐文件哈希。
- [ ] 4.2 验收负责人独立复核 P07-R1–R7 与 G1–G4，决定通过、退回或保留未验收项。
- [ ] 4.3 仅在实际实现及验收完成后沉淀/归档规格。

| 要求 | 当前开发证据与实际范围 | 验收负责人判定 |
|---|---|---|
| P07-R1 | 正式 catalog → check/快速集/真实覆盖 → build → 原 dist 浏览器/性能 → verify；部署上传同一产物，无重建。当前 [完整发布自测](evidence/catalog-integration/release/result.json)、[干净环境](evidence/catalog-integration/clean/summary.json)、[故障与产物篡改](evidence/catalog-integration/clean/gates/summary.json)。坏数据/过期表/类型/行为阻止构建；篡改封存 JS 被拒，恢复原字节后通过。远端 CI 未执行。 | 待验收 |
| P07-R2 | 全套 Chromium/WebKit 回归，P06 四视口、键盘/焦点、axe 原始报告及逐项 incomplete，正式 catalog 新城两版与 P05 13 名单双布局。[当前浏览器记录](evidence/catalog-integration/clean/release/test-e2e.log)。Safari 26.4 的旧构建抽检单列，自动 WebKit 不替代 Safari/真机。 | 待验收 |
| P07-R3 | 原始 catalog 经正式 parser/adapter/releaseBuild；页面/Worker 摘要校验，餐厅、catalog、taxonomy 坏响应保护；保留旧 v2 和 v3 客户端、跨年与同版修订。[当前缓存](evidence/catalog-integration/clean/release/browser/p07-cache.json)、[回滚](evidence/catalog-integration/clean/release/browser/p07-rollout.json)。 | 待验收 |
| P07-R4 | 真实 Worker 已访问数据离线刷新/重开/fallback，搜索/筛选/详情；未缓存年度/城市报错、联网重试。正式原 dist 增加离线刷新及年度/旧别名 JSON 导航验证。缺瓦片仍独立于缺餐厅数据。 | 待验收 |
| P07-R5 | 同一正式链的隔离新年/同年修订 A→B→A；另以留存上一真实候选 A 和当前完整 B 验证旧页面、旧 Worker、真实异步资源、离线及原产物回滚。[实际候选迁移](evidence/catalog-integration/clean/candidate-rollout/summary.json)。VERSION 不变，旧地址固定年度派生，BC-01 退役待决。 | 待验收 |
| P07-R6 | 当前最大东京星级 158 条及 1000 条 fixture 按原协议测量，原始五次冷导航和 20 次交互全部保存。[接入基线](evidence/catalog-integration/baseline-release/performance.json)、[最终干净候选](evidence/catalog-integration/clean/release/performance.json)。实验室指标，不当作真实用户 INP/p75。 | 待验收 |
| P07-R7 | [完整候选清单](evidence/catalog-integration/candidate-source.json)、[交付归属/哈希](evidence/catalog-integration/delivery.json)、[干净安装与命令](evidence/catalog-integration/clean/summary.json)、[正式 catalog 对账](evidence/catalog-integration/clean/catalog/summary.json)。G1–G4 开发者串联自测与重放准备完成，独立操作/判定留给验收 Agent。 | 待验收 |

## 当前候选与重放

以 [evidence/README.md](evidence/README.md) 和 [开发与运行](../../../readme/development.md) 为入口。当前证据放在 evidence/catalog-integration/，之前根目录下的 candidate-source/candidate-dist、release-blocked、clean 等是 P03 接入前历史候选，不是当前发布状态；原始失败及 SHA 保留，不改写成成功。

HEAD `fb7c22e50ea543a6d362092a2332aef9c78aebbe` 不包含当前全部实现。当前完整源码归档包含所有上游未提交内容、代码/测试/数据/工作流/文档及冻结前证据；候选按 source.sha256、archiveSha256 和逐文件 SHA 标识。安装后的输出与日志在归档外生成，不能用 HEAD 或借用其他 Packet 的旧快照代替。干净副本实际 npm ci/browser:install，不共享原目录 node_modules；故障副本则复用该新安装依赖，这一边界明确记录。

Node 24.21.0 / npm 11.19.0、Python ≥3.11；本机 macOS 26.4.1 arm64、Apple M5 Pro /18 逻辑核/48GiB，Chromium 147.0.7727.57、WebKit 26.6。检查所用锁文件和最终构建/数据摘要均在当前 delivery/clean 记录；VERSION 未改。

## 上游与未执行项

- P03 已验收，正式 catalog、年度文件、派生覆盖/来源与接入 runbook 已具备，P04/P05 正式发现联调已完成。历史任务表的待验收文字不由 P07 代改。
- P03 数据声明继续如实保留：11 份历史名单 unverified，东京两份 partial（158/160、111/114）；当前没有真实下一年度，不用合成两版证明官方资料完整。来源/身份可追溯机制与名单已完整核验是不同结论。
- P05 最新补验：[13 份名单×2布局联调](../p05-map-location-correctness/evidence/supplement-260914/README.md)完成。大陆/香港/澳门独立数值误差≤10m、物理端到端≤200m仍未证实。后续上游已将东京切到GSI标准图，实际非纯色瓦片、3点数值与有限地图参考预算见[新底图证据](../p05-map-location-correctness/evidence/basemap-260914/tokyo-map-reference-measurements.json)；旧高德纯色图作为历史失败保留，不再描述为当前东京底图。地图参考不代替所有餐厅/实地GPS精度，最终范围由验收负责人判定。
- P06 最新用户范围：[读屏专项跳过](../p06-accessible-responsive-interface/tasks.md)，不记通过、不再要求执行。完整Safari当前候选流程、真机中文软键盘、完整768×1024原生200%仍未补齐。已有Safari桌面抽检属于旧构建，不外推当前候选。
- BC-01退役政策仍待决；保留固定年度的旧JSON别名，无永久兼容承诺。
- 远端CI、真实部署、独立G1–G4/最终判定未执行；4.2/4.3及3.3独立部分保持未勾选。没有提交、推送或修改远端设置。

## 历史失败保留

P03接入前首次完整消费者演练有Chromium意外断开，42/50，原因未证实且未生成凭据；后续记录保留进程诊断，没有测试自动重试或skip。旧Vite摘要时机、axe异常与元数据复现问题的失败/修复见历史证据入口。当前正式接入基线已跑通189快速/54浏览器及六阶段门禁；本轮补入boarding输入身份回归后，最终集合及结果以当前clean记录为准。


## P05 底图覆盖交接 — 2026-09-14（待验收负责人复核）

P05本轮修复东京：catalog选择GSI标准地图，供应商规则集中管理；东京原高德纯色阻塞的历史记录保留，新状态以[P05本轮证据](../p05-map-location-correctness/evidence/basemap-260914/README.md)为准。未将整个P05或P07标为验收通过。

- [ ] 发布/新增坐标域时按[接入指南底图步骤](../../../readme/data-onboarding-guide.md)抽检至少3个分散点（包括实际范围边缘），在真实生产应用中确认有可用地物、署名/缩放正确、同一物理点位置对应；保存日期、供应商URL、截图、精度和误差。
- [ ] 独立记录“底图覆盖可用”“餐厅合同可定位”“数值转换≤10m”“应用物理点≤200m”四个结论；HTTP200、纯色/非纯色检测、mock瓦片测试均不能独自代表真实覆盖/精度通过。
- [ ] 供应商/样式/显示坐标规则变化后重新执行P05真实抽检与相关跨域回归；本轮东京数值/测绘图参考证据待验收Agent判定，大陆/港澳独立高德参考缺口仍未关闭。

以上是发布交接项，未修改CI硬编码为联网门禁；外部服务不稳定时记录实际未执行或失败，不放宽精度阈值。

首轮正式接入干净安装因catalog场景寻找未安装的完整Chrome而53/54，门禁拒绝凭据；修正为同一Headless Shell harness。失败、定向复核及最终完整重装记录分别保留，不通过额外安装完整Chrome或跳过场景解决。

第二轮干净主门禁已全过，但后续健康故障副本的WebKit离线冷重开停留loading，53/54，现场与无凭据结果保留在clean-worker-stall-failure。Worker网络优先读取补4秒头/体完成上限；双引擎真实HTTP悬挂新增验证匹配缓存回退/未缓存503/联网恢复，原有断言不删弱。最终完整重放以当前clean为准。
