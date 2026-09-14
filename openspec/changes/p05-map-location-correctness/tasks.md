> **最新开发交付：东京底图已修复为可配置GSI标准图。** [东京覆盖与独立参考](evidence/basemap-260914/README.md)包含真实地物、三个独立EPSG数值对及三个公开测绘图参考点；最终精度口径待验收Agent判定，大陆/港澳独立高德校准仍未齐，整包4.2保持未完成。下面“东京纯色”记录为修复前历史证据。

> **当前补验状态（2026-09-14）：** 正式 P03 catalog/年度数据的两端空间联调已完成（13份名单×2布局）；新增东京3锚点及真实应用在线捕获。R1独立数值≤10m、物理位置端到端≤200m仍未证实，东京当前高德style=8纯色瓦片构成覆盖阻塞。详见[本轮补验](evidence/supplement-260914/README.md)，最终4.2不代签。下方2026-09-13记录作为历史证据保留。

## 1. 坐标依据与校准

- [ ] 1.1 承接 P02 坐标合同，核验源数据/高德瓦片规则并记录证据；验收对应 P05-R1。合同接入完成；供应商资料/真实瓦片已保存，独立精度校准未完成。
- [ ] 1.2 为现有各坐标域准备空间分散锚点和数值转换对，记录精度、条件和误差；验收对应 P05-R1、P05-R2。已保存原10个候选及新增东京3个候选；本轮13点真实应用捕获，仍缺各域独立≤10m参考与真实端到端≤200m证据。

## 2. 空间与地图生命周期

- [x] 2.1 统一标记、热力图、中心、搜索飞行和用户位置的投影入口，检查重复转换；验收对应 P05-R2。
- [x] 2.2 复用可靠位置判断并核对两种图层的身份集合与数量；验收对应 P05-R3。
- [x] 2.3 修正地图/控件/事件生命周期，验证反复切换和卸载后的资源及迟到回调；验收对应 P05-R4。

## 3. 定位与外部服务状态

- [x] 3.1 验证主动开启、拒绝、超时、不支持和停用；假时钟验证自动停止及前后台规则；验收对应 P05-R5。
- [x] 3.2 提供瓦片失败与恢复状态，保持非地图餐厅信息可用；验收对应 P05-R6。
- [ ] 3.3 提交离线数值/生命周期测试、真实底图锚点证据和未核验事项；验收对应 P05-R1–P05-R6。代码回归已提交，完整真实空间验收证据未齐。

## 4. 验收记录

- [x] 4.1 开发 Agent 填写实现/上游提交、坐标证据、权限场景和资源验证结果。
- [ ] 4.2 验收负责人复核 P05-R1–P05-R6，明确区分代码回归通过与外部坐标核验通过。

| 要求 | 开发证据与实际结果 | 验收负责人判定 |
|---|---|---|
| P05-R1 | **整组仍未完成**：东京新底图、EPSG独立数值参考及公开测绘图84.47m工作预算已交付，[本轮证据](evidence/basemap-260914/README.md)待验收；大陆/港澳独立校准未齐。历史补验：[补验](evidence/supplement-260914/README.md)保存测站来源、东京3点、13点真实应用截图；东京72张z17瓦片及36次跨子域/缩放样本均纯色。各域独立精度未证实。[原坐标证据](evidence/coordinates/README.md)：重新获取供应商资料、10候选（大陆4/香港3/澳门3）、90张真实瓦片；公开第三方数值例差值0m，参考可能同源；独立数值≤10m、实地端到端≤200m未证实，不标通过 | 待验收 |
| P05-R2 | **底图配置与所有入口已统一**：GSI/高德切换、署名/zoom、正式catalog两端26组合及unknown负向重跑通过；[本轮日志](evidence/basemap-260914/browser.log)。正式catalog补验：[26个名单/布局组合及unknown原始catalog负向场景](evidence/supplement-260914/browser/spatial-catalog.json)通过；东京全部入口一致，绝对精度仍依赖R1。[mapLocation.test.tsx](../../../tests/unit/mapLocation.test.tsx)：中心/标记/热力/搜索/用户点圈一致、域切换；[浏览器](evidence/browser/map-location.json)验证空间上下文贯通及模式同步。绝对精度仍依赖R1 | 待验收 |
| P05-R3 | 复用P02 getMapPosition；测试null/零点/非法范围/非有限/false/unknown、缺省/null成功标志及重复坐标；浏览器验证坏载荷进入error、未知仍有详情，marker/heat点集合一致；[check.log](evidence/check.log)保留402条、384合同可定位 | 待验收 |
| P05-R4 | [locationLifecycle.test.tsx](../../../tests/unit/locationLifecycle.test.tsx)真实React假时钟/受控传感器验证旧回调与授权、10次清理；MapShell实际实例循环、heat帧取消；[生产浏览器10次城市/布局切换](evidence/browser/p05-ten-remounts-clean.png)；原P04详情切换回归也通过 | 待验收 |
| P05-R5 | 固定5分钟deadline（后台计时）、未开启零请求、拒绝/超时/不支持、失败清旧点、精度改善、绝对方向限制、到期重启、旧deadline不影响新会话；见 [unit.log](evidence/unit.log)。真实设备GPS/权限弹窗手测未执行 | 待验收 |
| P05-R6 | 单张失败不误报、3张失败且1500ms无成功提示、成功/重试恢复、旧层事件隔离；生产[故障详情](evidence/browser/p05-tile-outage-detail.png)/[恢复](evidence/browser/p05-tile-recovered.png)保留数据与定位请求数；底图失败/成功均受HTTP拦截控制，非真实服务可用率测试 | 待验收 |

实现提交：未提交（按用户要求）。工作树基线HEAD `fb7c22e50ea543a6d362092a2332aef9c78aebbe`；P01/P02及P04上游以本轮起始工作区为准，而非伪造独立提交。实际改动与哈希见 [文件清单](evidence/changed-files.json)，本包相对起始工作区的代码/任务/设计差异见 [implementation.patch](evidence/implementation.patch)。上游合同/状态源哈希见 [verification.json](evidence/verification.json)。最终验收项4.2及判定栏保持待验收。

## 开发交付 — 2026-09-13

### 实际执行

环境：Node v24.21.0（符合.nvmrc）、npm 11.19.0、Chrome Headless Shell 147.0.7727.57、macOS arm64。借用现有 `/private/tmp/foodie-map-p02-e8fczqqf/runtime/node_modules/node/bin` 的Node；未安装/修改项目依赖。默认全局Node为26，执行时已显式切换PATH。复跑者应使用自己的.nvmrc版本路径，不依赖该临时目录。

| 命令 | 最终结果 | 记录 |
|---|---|---|
| `npm run check` | exit 0；types/lint/data通过，11数据集402条，384条符合合同可定位；重复坐标等warning保留 | [check.log](evidence/check.log) |
| `npm test` | exit 0；10文件152项通过（P05新增26项） | [unit.log](evidence/unit.log) |
| `E2E_ARTIFACT_DIR=openspec/changes/p05-map-location-correctness/evidence/browser npm run test:e2e` | exit 0；先生产build，再21项浏览器全部通过 | [browser-final.log](evidence/browser-final.log) |
| P04/P05针对性联合重放 | exit 0；16项通过 | [integration-recheck.log](evidence/integration-recheck.log) |

复跑（先使用项目规定的Node24.21.0）：

```sh
rtk npm run check
rtk npm test
rtk proxy env E2E_ARTIFACT_DIR=/tmp/foodie-p05-browser npm run test:e2e
```

快速定位回归：`rtk npm test -- tests/unit/locationLifecycle.test.tsx tests/unit/mapLocation.test.tsx`。

### 验证隔离说明

- 单元测试运行真实React hooks与Leaflet对象；浏览器geolocation/orientation回调受控、使用假时钟；jsdom中heatLayer用图层替身捕获点集，map.flyTo被监测；生产浏览器另测真实图层。
- 生产浏览器用真实Vite资产/React/Leaflet/plugins，P05 fixture替换发现模块并拦截数据/taxonomy；传感器stub，真实点击控件；瓦片被abort或返回明确synthetic SVG，外部字体/HTTP阻止，service worker绕过。不是正式P03 catalog或实地GPS测试。
- 核验截图视口桌面1280×800、移动390×844；两种布局切换至少10次，最后watch/方向监听/本包计时器为0；每页检查无未处理异常。
- 真正高德瓦片单独在coordinates/下载保存，只能用于地图规则佐证；不把这些独立叠图或隔离浏览器截图宣称为200m校准通过。

### 回归中发现并修复

1. 位置圈Canvas销毁后排队重绘异常：改为拥有并清理SVG renderer。
2. 地图故障提示被底部图例遮挡：调整布局和层级，真实点击重试通过。
3. P04桌面切换时旧popup淡出残留、移动端cluster延迟回调触发hasLayer(undefined)：关闭fadeAnimation，搜索使用已选中记录直接开桌面popup/移动详情，移除不可取消的cluster continuation。

首次全量失败日志 [browser.log](evidence/browser.log) 与 [失败截图](evidence/browser/p05-recovery-failure.png)仅供失败复核，**最终结果以browser-final.log为准**。

### 尚未完成

- R1外部精度：三个域各有候选，但没有可量化源点精度、独立供应商转换对及真实应用实地端到端误差；澳门南部圣堂精确对应还未证实。下一步取测绘/供应商或GNSS有精度的锚点、独立转换响应，按coordinates/README的测量协议补齐；不能用更多自生成数值代替。
- P03正式catalog联调：此为2026-09-13历史未执行项；**2026-09-14已完成**，见本轮补验。
- 真实设备权限弹窗/GPS、其他浏览器、SW升级/离线缓存属于后续真实设备/P07验证，未冒充本轮通过。
- 瓦片阈值只判连续无成功的错误批次；仅悬挂但不产生tileerror或部分失败夹杂成功不会判整服务不可用，详见design。

本轮未修改真实餐厅数据、P02合同实现或P01地图库装载，也未修改P04的活动数据集状态设计；App/MobileShell仅接通共享空间上下文。无提交、推送或部署。



## 补验交付 — 2026-09-14

- [补验报告与限制](evidence/supplement-260914/README.md)、[逐点精度判定](evidence/supplement-260914/calibration-results.json)、[真实应用/真实瓦片记录](evidence/supplement-260914/online/observations.json)。注入浏览器定位源点，不是实地GPS；两个精度门槛均独立保留未核验。
- 正式catalog和真实年度数据未替换，13份名单两端26组合全部通过；另以隔离原始catalog的unknown值验证同一release/parser路径。标记身份、热力输入、计数、搜索、中心和用户点/精度圈一致，东京包含在内。
- `npm run check` exit0；`npm test` 189项通过；受影响P03/P05生产构建浏览器9项通过。日志与mock/网络边界见补验报告。P06/P07全部门禁未重跑，不扩大通过范围。
- 本轮仅改3个测试/取证脚本及P05设计、任务和证据；未改业务算法/真实数据/正式catalog。文件与SHA256见[补验清单](evidence/supplement-260914/changed-files.json)。原始首次交付哈希为历史快照，不应当成当前全工作树哈希。
- 当前真实阻塞：独立WGS84/GCJ参考、可量化物理点精度及澳门南部对应；东京当前tile产品无地物。没有使用日志小数位、算法预测、accuracy测试常量或HTTP200替代精度证明。
- 4.2和负责人判定仍待验收；无提交、推送或部署。


## 东京底图修复交付 — 2026-09-14

- [x] 修复东京真实底图可用性：GSI标准图、catalog可配置、所有投影消费者一致，保留其他城市和P02资格。
- [x] 保存东京三个独立EPSG:9936数值对，差值约0.0001m；来源操作精度1m，适用中低精度地图。
- [x] 保存三个事先选定GSI测绘建筑轮廓顶点、真实应用截图和可重放测量；3σ工作预算约84.47m。地面精度不是0m，最终200m证据口径待验收Agent判断。
- [x] 底图覆盖抽检步骤写入接入指南，交接P07复核地物/缩放/点位；未代签P07验收。
- [ ] 大陆、香港、澳门各3点独立高德转换响应及物理点精度依据。已提供不落盘凭据的在线响应捕获脚本，缺授权Key未运行，不能以脚本替代证据。

环境Node24.21.0/npm11.19.0；check通过、196快速测试通过、受影响9生产浏览器测试通过（每套自行生产构建）。真实在线GSI3点z17截图、3点×z9/12/15/18共12张图块均有地物，物理参考另z18取证。全部条件、限制和命令见[报告](evidence/basemap-260914/README.md)。本轮文件与哈希见[changed-files.json](evidence/basemap-260914/changed-files.json)。最终4.2及各负责人判定保留待验收，无提交、推送、部署。
