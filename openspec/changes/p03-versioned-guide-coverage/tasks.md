## 1. 身份、证据与迁移约束

- [x] 1.1 承接 P02 合同，清点地域/榜单/版次身份及来源缺口，记录 BC-01 对旧地址的处理分支；验收对应 P03-R1、P03-R2、P03-R4。
- [x] 1.2 确定 catalog 的唯一位置与字段、真实地域范围、覆盖状态和采集/修订语义；验收对应 P03-R1–P03-R4。

## 2. 存储与登记消费

- [x] 2.1 将现有年度迁移到独立路径并提交身份集合对账；同版修订可追溯；验收对应 P03-R2。
- [x] 2.2 前端登记、taxonomy 发现、校验和覆盖生成共同消费 catalog；验收对应 P03-R1、P03-R6。
- [x] 2.3 扩展 validate:data 检查身份、引用、版次一致性和完整性声明；验证同数不同集合与空名单场景；验收对应 P03-R1、P03-R3。
- [x] 2.4 为未核验的旧来源保留缺口，按需补可追溯证据；验收对应 P03-R4。

## 3. 更新流程与文档

- [x] 3.1 实现或明确年度身份差异对账方式，验证改名、评级变化、漏采和同名分店；验收对应 P03-R5。
- [x] 3.2 更新现有覆盖生成器并提供不写入的过期检查；验收对应 P03-R7。
- [x] 3.3 更新接入指南和来源 runbook，链接权威合同，移除旧格式/固定年份冲突；验收对应 P03-R4、P03-R7。
- [ ] 3.4 让未参与实现的 Agent 按文档演练新城、两版、部分覆盖和回滚，提交业务源码未改的证据；验收对应 P03-R2、P03-R6、P03-R7。开发者重放已完成，输入/命令/结果见 evidence/rehearsal；独立重放由验收负责人安排，不自签。

## 4. 验收记录

- [x] 4.1 开发 Agent 提交迁移、来源、对账、文档重放及未决兼容性证据。
- [ ] 4.2 验收负责人复核 P03-R1–P03-R7，并确认 BC-01 相关场景满足已选择分支。

| 要求 | 开发证据与实际结果 | 验收负责人判定 |
|---|---|---|
| P03-R1 | 正式 [catalog](../../../public/data/catalog.json) + 共享 schema/文件校验；cities.ts 仅适配。validate:data、Python 覆盖和 releaseBuild 读取同一登记。原始缺失/坏 JSON、重复身份、错年度、坏 taxonomy/mappings/证据引用和漏文件负例见 [catalog tests](../../../tests/unit/catalog.test.ts)、[重放](evidence/rehearsal/summary.json)。 | 待验收 |
| P03-R2 | 13 名单/671 条记录从实际起点逐字节迁移，包含东京/JPY/KIBUN；[完整对账](evidence/migration.json) 保存逐记录全字段 SHA，新增/删除/变化均空。年度路径独立，旧公开地址固定派生。隔离 2027 修订与恢复不改变 2026 文件及两端结果。 | 待验收 |
| P03-R3 | 覆盖分 not-collected/partial/unverified/verified；空文件、缺文件、官方零独立。官方 A/B/C 与本地 A/B/D 报 missing C/extra D；完整集合缺坐标仍完整。组合范围成员未核验拒绝 verified。[诊断与重放](evidence/rehearsal/summary.json)。 | 待验收 |
| P03-R4 | [来源说明](evidence/provenance.md)；catalog 直接引用东京 edition/list/record/report。东京仍 partial，11 旧名单 unverified；未知历史时间 null，未伪造完整官方集合。真实范围/年度依据/来源/修订可定位，缺口对结论有明确限制。 | 待验收 |
| P03-R5 | `npm run data:diff` 使用 listing/有证据的稳定 ID 或 URL 对应，不用本地数字 ID/同名合并。[年度差异](evidence/rehearsal/annual-diff.json) 含输入哈希、改名/评级/营业状态、漏采、退出和待核实新增。无完整官方集合时不自动判退出。正式只有单年度，未伪造真实下一版。 | 待验收 |
| P03-R6 | 隔离新城、两版、非默认 taxonomy/mappings、部分/空名单经原始 catalog → adapter → P04/P05 → releaseBuild；[跨端用例](../../../tests/e2e/catalog.test.mjs) 和 [重放前后 src 哈希](evidence/rehearsal/summary.json)。缓存/离线/A→B→A 改接同一正式发现链，模拟数据不进入生产。 | 待验收 |
| P03-R7 | [接入指南](../../../readme/data-onboarding-guide.md) 与 [来源 runbook](../../../docs/runbook/runbook-260507-1013-valid-data-source-guide.md) 已更新。真实 check:coverage 只读，指纹检查数据/登记/本地证据字节，同数修订也失败、重生成后成功。完整重放入口 `npm run rehearse:catalog`；独立维护者验收尚未执行。 | 待验收 |

## 工作树与开发者交付

没有创建提交、推送、部署或修改远端设置。HEAD 保持 `fb7c22e50ea543a6d362092a2332aef9c78aebbe`；它不包含工作区的各 Packet 实现。开始清单和逐文件 SHA 见 [workspace-start.json](evidence/workspace-start.json)，结束清单/逐文件哈希及变化归属见 [workspace-end.json](evidence/workspace-end.json)，精确源/产物候选见 [candidate.json](evidence/candidate.json)。系统默认 Node 是 v26.7.0；本轮使用已有临时 Node **v24.21.0** 与 npm **11.19.0**，没有变更锁文件或系统运行时。维护者按 .nvmrc 准备自己的环境。

验证命令、时间、退出码、环境逐项保存在 [commands/](evidence/commands/)，完整正式发布结果见最终记录。`check:coverage` 为正式 Python→Node 校验消费，不安装 fixture checker。旧 P07 隔离故障演练也已移除覆盖命令替换，采用真实覆盖漂移。

已定位的开发过程失败：P02 测试注入仍指旧路径（更新 fixture 路径，保留失败断言）；组合范围 fixture 共享成员数组（复制数组隔离预期）；新浏览器用例在 Worker 接管重载瞬间过早读取状态（等待真实 controlled/ready）；picker 辅助函数使用中文维度标签（修正测试调用）。完整下游缓存测试无删弱断言，新增 mappings 访问后缓存期望同步包含 mappings。P01 合成 raw 菜系改用已登记的粵菜/點心，使已有组赋值符合新接入的同一运行时合同。

未执行/未证实：独立维护者重放、最终 4.2/规格归档、真实生产发布和远端 CI；旧 11 份名单历史年度完整性与采集时间；东京完整年度缺失 5 身份及排他性地域依据；P05 真实精度/东京底图与 P06 剩余实际设备、读屏、缩放等人工验收。本包仅交开发实现与自动证据，不代签上述判定。BC-01 仍未决，旧 JSON 地址暂保留并固定从年度源派生，正式退役单列待决。

总体规则见[总计划](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。



## 最终候选验证（2026-09-14，开发者执行）

| 实际命令 | 最终结果 | 证据 |
|---|---|---|
| `npm run check` | exit 0；types/lint/data 全过；13 名单、671 收录、652 合同可定位 | [最终门禁 check.log](evidence/release/check.log) |
| `npm test` | exit 0；14 文件、185 项通过 | [最终 test.log](evidence/release/test.log) |
| `npm run check:coverage` | exit 0；正式 catalog/数据/引用字节与覆盖文档一致 | [日志](evidence/release/check-coverage.log) |
| `npm run release:check` | exit 0；check→test→check:coverage→build→test:e2e --prebuilt→performance 全绿 | [步骤、时间与结果](evidence/release/result.json)、[外层命令](evidence/commands/release-check-final.json) |
| `npm run release:verify` | exit 0；完整源/产物未变 | [命令](evidence/commands/release-verify-final.json)、[封存回执](evidence/release/verified.json) |
| `npm run rehearse:catalog -- --output …/evidence/rehearsal` | exit 0；新城/两版/状态/故障/差异/同版修订/回滚；src 前后哈希一致 | [重放摘要](evidence/rehearsal/summary.json)、[年度差异](evidence/rehearsal/annual-diff.json) |
| `npm run test:gates -- --output …/evidence/gate-faults-final` | exit 0（演练本身）；注入的坏数据/过期表/类型/行为分别 exit 1/1/2/1，均阻止构建；首个浏览器失败 exit 1 并保存现场。真实覆盖命令未被替换 | [故障结果](evidence/gate-faults-final/summary.json) |
| `git diff --check` / `openspec validate p03-versioned-guide-coverage --strict --no-interactive` | exit 0；没有修改规格或归档 | 开发终端实测；文档相对链接检查无失效 |

51/51 浏览器场景通过，包含 Chromium 147.0.7727.57 / WebKit 26.6、生产 dist 启动、两端正式 catalog、新城两版、竞态/错误、未知位置、映射缓存、离线、真实 Worker A→B→A。[跨端 catalog 结果与 src 前后哈希](evidence/release/browser/p03-catalog-browser.json)、[缓存](evidence/release/browser/p07-cache.json)、[回滚](evidence/release/browser/p07-rollout.json)、[核心矩阵](evidence/release/browser/p07-core-matrix.json)。页面/Worker 摘要断言保留；浏览器场景的外部地图/网络受控，不能当真实精度验收。

性能使用 P07 原协议、原预算，没有放宽：Apple M5 Pro / 18 逻辑核 / 48 GiB，macOS Darwin 25.4.0 arm64，HeadlessChrome 147；390×844、4× CPU、10 Mbps/40 ms。东京最大单名单 158 条与种子 7042026 的 1000 条 fixture 各 5 次冷导航，LCP 中位数均 680 ms、CLS 中位数均 0；首屏 JS gzip 最大 159942/155358 B，20 次交互 p95=62.3 ms。[完整条件、原始样本与结果](evidence/release/performance.json)。构建仍有原有 >500 kB chunk 提示，未改门限。

候选 source SHA-256：`e7aa1b4432b526beb62fcd2a0902c49ae288cf9b2bbdf15ec24926564bf3b284`；部署产物 SHA-256：`2b162fec24ebf4349e97c13a9843792e4592c4323255bfc533a8b2573d753c51`；buildId：`f870d86b49c6b0a4e9acfd0288c1e70b937b28efbafc83fb7ca50b2e20c8c8ca`。全部原始餐厅旧地址仍与 workspace-start 的对应哈希一致，且与年度文件逐字节一致；P02 字段/分类文件、P05/P06 业务组件、上游锁文件未改动。P03 修改的共享文件及新增文件在 workspace-end 的 changes 中精确列出，不能把全仓 git diff 当作本包改动。

首次已通过候选单独保留在 evidence/release-first；最终结果以 evidence/release 和上述哈希为准。最终补充了递归来源摘要的确定性测试和显式 B 修订元数据，故按新候选完整复跑。开发过程失败日志保留在 commands/browser-dev.log，未靠重试循环、跳过场景或削弱断言通过。
