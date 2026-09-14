## 开发交接状态 · 2026-09-13

独立实现已完成，本地检查通过，最终判定留给主线程。P03 最终 catalog 尚未出现在工作区，1.1 保留待联调；不将隔离的发现 fixture 声称为 P03 正式 catalog 验收。设计与具体接口见 [design](design.md)。

## 1. 上游合同与场景

- [ ] 1.1 承接 P02/P03 的数据集身份、字段/空值和 taxonomy 发现方式，准备两年与非对称覆盖 fixture；验收对应 P04-R1、P04-R4。P02/现有发现入口与隔离 fixture 已完成；P03 最终 catalog 字段和读取接口待联调。
- [x] 1.2 定义选择与资源状态的唯一归属及默认筛选规则，交接地图/两端视图接口；验收对应 P04-R1–P04-R3。

## 2. 状态与数据流

- [x] 2.1 实现合法/非法 URL、级联选择和空登记处理，不使用固定选项数量；验收对应 P04-R1。
- [x] 2.2 绑定请求身份、处理乱序、坏 JSON、空结果和重试，并清理旧上下文；验收对应 P04-R2、P04-R6。
- [x] 2.3 统一筛选/搜索/统计/可定位子集，修复被筛选隐藏的搜索定位与旧详情残留；验收对应 P04-R3。

## 3. 分类与详情

- [x] 3.1 按当前城市解析 taxonomy 标签、顺序与可用样式，验证同 key 异标签和新组；验收对应 P04-R4。
- [x] 3.2 共用年度、价格/币种、名称和未知值语义，更新桌面与移动详情；验收对应 P04-R5。
- [x] 3.3 验证外部文本、链接和坏载荷的安全显示及恢复行为；验收对应 P04-R6。
- [x] 3.4 提交两端一致性、请求竞态和受影响快速集证据，并交接 P05/P06；验收对应 P04-R1–P04-R6。

## 4. 验收记录

- [x] 4.1 开发 Agent 填写实现/上游提交、场景证据和未执行项。
- [ ] 4.2 验收负责人复核 P04-R1–P04-R6 并给出判定。

| 要求 | 开发证据与实际结果 | 验收负责人判定 |
|---|---|---|
| P04-R1 | useSelection：年份降序、登记顺序回退、保留有效维度、URL/popstate、空登记；快速测试与新城/两年/旧版城浏览器通过。[选择与空登记快照](evidence/guide-experience.json)、[新城截图](evidence/p04-new-city-taxonomy.png)。P03 最终原始 catalog 加载器未执行。 | 待验收 |
| P04-R2 | 资源身份 + 请求代次 + 取消提交检查；切换撤下旧层/详情/统计。快速层覆盖 A→B→A、C/A/B；浏览器强制忽略取消后按 C/A/B 放行，最终仍为 C。[加载中](evidence/p04-race-loading.png)、[最终 C](evidence/p04-race-final-c.png)、[浏览器日志](evidence/browser-tests.log)。404/网络/坏 JSON/空数组及恢复全部通过。 | 待验收 |
| P04-R3 | useFilters 唯一结果，reveal 同步菜系与 venue；两端无坐标详情打开且未产生 flyTo 调用，切换/返回原身份清空详情/查询/筛选。[桌面无坐标](evidence/p04-no-position-1280.png)、[移动无坐标](evidence/p04-no-position-390.png)、[搜索显现](evidence/p04-reveal-390.png)。收录/筛选/可定位分别显示。 | 待验收 |
| P04-R4 | 移除全局合并和手写城市 imports；资源加载当前 taxonomy，组按城市标签/顺序显示，NEW_GROUP 使用共享回退色仍可筛选。快速层比较真实香港/北京 CANTONESE，浏览器验证新城同 key 新标签。[新城截图](evidence/p04-new-city-taxonomy.png)、[受影响测试](evidence/affected-tests.log)。 | 待验收 |
| P04-R5 | restaurantFacts 共用 displayName/displayPrice；2027 新晋、年度/榜单、HKD/CNY/MOP 原价、缺字段省略、安全官方来源在两端一致。[桌面年度](evidence/p04-facts-2027-1280.png)、[移动年度](evidence/p04-facts-2027-390.png)、[事实快照](evidence/guide-experience.json)。无采集日期/名单完整性推断。 | 待验收 |
| P04-R6 | P02 解析非法载荷进入可重试错误；名称/地址标签字符在 React/Leaflet 均作为文本，非法 URL 运行时拒绝，直接卡片输入也不生成危险链接。[桌面 markup](evidence/p04-markup-1280.png)、[移动 markup](evidence/p04-markup-390.png)、[非法链接错误](evidence/p04-failure-unsafe-link.png)。字符串/对象/字段错类型快速层通过。 | 待验收 |

## 实际环境、命令与结果

- 工作区交付；HEAD `fb7c22e50ea543a6d362092a2332aef9c78aebbe` 加已存在的 P01/P02 未提交实现。没有创建提交、推送或部署，没有变更正式名单/城市登记/合同 schema/依赖锁文件。
- Node **24.21.0** 与 .nvmrc 一致，npm **11.19.0**，Chrome Headless Shell **147.0.7727.57**。复用已有 Node 24 runtime；系统默认 node 实际为 26，命令显式设置 PATH。具体版本/路径见 [commands.json](evidence/commands.json)；重放者使用 readme/development.md 的 nvm use 即可，无需依赖该临时 runtime 路径。
- `npm run check`：退出 0；类型/ESLint/数据检查通过。数据检查仍为 11 名单、402 收录、384 可定位；已有重复坐标只产生维护 warning。[检查日志](evidence/check.log)。
- `npm test -- tests/unit/guideExperience.test.tsx tests/unit/useFilters.test.ts tests/unit/urlState.test.ts tests/unit/cuisineRegistry.test.ts tests/unit/dataConsumers.test.tsx`：**50/50**。[受影响快速集](evidence/affected-tests.log)。
- `npm test`：**126/126**，8 文件通过。[完整快速集](evidence/fast-tests.log)。
- `E2E_ARTIFACT_DIR=openspec/changes/p04-consistent-guide-experience/evidence npm run test:e2e`：生产 build 成功，**16/16** 浏览器场景通过，其中新增 P04 11 个；1280×800 与 390×844，全部场景 pageerror 为空。[浏览器日志](evidence/browser-tests.log)、[P04 快照](evidence/guide-experience.json)、[原地图回归](evidence/bundled-runtime.json)。
- 保存证据的首次 Python 子进程运行被沙箱阻止 127.0.0.1 监听，未形成浏览器通过结论；获得本地运行权限后重跑通过。[失败记录](evidence/browser-sandbox-failure.log)保留。浏览器截图等待卡片实际动画完成，避免截取尚未滑入的卡片。
- `git diff --check` 通过。工作区含上游未提交变更，不能将整份 git diff 都归 P04；本包实际源文件清单及哈希见 [implementation-files.json](evidence/implementation-files.json)。

## 未执行项、待联调与剩余风险

1. **P03 最终发现接口**：未有实现可联调。当前沿用 `cities.ts`，App 对 taxonomyPath 只作最小建议字段兼容，缺失则走原 taxonomy 路径约定；最终字段/数据年份路径、原始 catalog 解析失败、覆盖/年度来源元数据需 P03 落地后核对。本轮没有新建正式 registry，也没有修改 P03 文档/合同。
2. **P05 地图接口**：MapShell 新增 groups/visibleRestaurants 输入，原 map ref 保留；P05 合并时须保留这两个输入和过期 popup 防护。当前默认统一 WGS84；若登记提供 spatialContext，计数/详情/marker/heat/flyTo 必须共同透传。定位权限、投影锚点、瓦片恢复、地图初始化生命周期仍未作为本包验收。
3. **P06/P07**：完整无障碍与布局验收、真实外部服务、SW/离线/升级/发布缓存未执行。浏览器明确阻断外部 HTTP 并绕过 SW，截图灰色底图是隔离策略产生的结果。
4. 没有重装依赖、运行真实名单采集或修改正式数据；正式 catalog 多年接入仍需 P03/P04 最终联调重放。最终 4.2 与所有判定栏保持待验收。

主线程可从本表对应证据逐项复核，无需访问任何临时截图目录。

