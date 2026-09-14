## Implementation status · 2026-09-13

P04 的独立实现与本地验证已交付工作区，主线程尚未验收。P01/P02 是工作区上游；没有提交、推送、部署，也没有修改正式餐厅数据。具体结果与待联调项见 [tasks](tasks.md) 和 历史取证（原始输出已清理）。

**上游尚缺的接口：** 本轮开始及最终检查时，P03 仍只有规划文档，工作区没有 `public/data/catalog.json` 或 catalog 读取模块；`src/config/cities.ts` 仍是原登记。P04 保留这个发现入口，没有新建一份正式登记。下文的 `taxonomyPath` 是供 P03 衔接的最小建议，不宣称已是 P03 最终合同。

## Context

选择以 year/city/guide 表达，fetch 只返回 data/loading/error，无法从结果本身核对其身份。现有筛选与两端卡片可以复用，不需要为本轮引入路由器或全局 store。

## Goals / Non-Goals

**Goals:** 同一数据集上下文、确定的失效与恢复、每城分类、两端事实一致、安全外部值呈现。

**Non-Goals:** 收藏、登录、跨数据集搜索、自动推荐、为状态管理更换框架、承担 P05 的坐标转换或 P06 的控件布局改造。

## Backward Compatibility Policy

按[总计划 BC-01](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)处理。保留合法 year/city/guide 链接的选择语义，内部 hook 返回形状可随合同演进。

## Decisions

- 用 catalog 数据集身份绑定请求与结果，不能只凭当前标题推断数组属于哪一版。loading、ready、empty、error 的状态形状由开发者选择。
- 开始新选择时撤下旧数据上下文中的地图输入、详情和统计；请求成功且身份匹配才显示新内容。错误可重试，迟到响应不恢复过期数据。
- 默认新数据集选择全部菜系和全部 venue；若以后需要跨城持久化偏好，应另定义产品规则。
- 名单筛选只推导一次；可绘制子集复用 P02 位置有效性。总收录、筛选结果和可定位数量使用明确名称，不强行相等。
- taxonomy 从当前城市引用解析标签/顺序；视觉颜色可以共用，不按 import 顺序选择事实标签。
- 把年份、新晋、价格、名称、来源等语义放在共享推导/格式层。桌面 Leaflet popup 和移动 React 卡片保留各自布局。
- 网络数据运行时执行 P02 合同检查。展示层仍把外部文本作为文本，并按安全 URL 策略处理链接。

## Risks / Trade-offs

- [AbortController 未阻止已完成/缓存响应] → 结果再核对身份；用乱序响应测试。
- [搜索结果被 venue 或菜系筛选隐藏] → 定位选择与可见筛选同步，记录用户可见的筛选变化。
- [无坐标餐厅被整个产品隐藏] → 保留搜索和详情，明确不可地图定位，地图输入单独排除。
- [两端重复规则继续漂移] → 同一 fixture 对比事实输出，审阅共享规则的权威位置。

## Migration Plan

承接 P02/P03 合同，先完成选择/资源状态，再接筛选与每城 taxonomy，最后共用详情语义。分别验证单版、多版、单榜单、新城、空/坏数据及失败恢复，不以当前 2026 的固定选项数量定义测试。

## Open Questions / Delegated Choices

是否使用 reducer、查询库或纯 hooks 由开发者根据必要性说明；验收不依赖内部组件数量或文件布局。未选用新库不降低状态合同要求。



## Implemented ownership and interfaces

遵循 yanru-guidelines：版次/城市事实仍归 P03 发现入口，餐厅字段与位置规则仍归 P02；P04 只负责选择、异步上下文和呈现。复用 hooks 和共享格式模块，没有引入路由器、查询库、全局 store、第二份 registry 或新的数据模型。

| 责任 | 当前实现与消费者 |
|---|---|
| 登记与身份 | `useSelection(registry = cities)` 消费现有 `CityConfig[]`；`city.id + guide.year + guide.id` 组成 `datasetKey`。不从餐厅第一条记录推断版次，空数组仍有身份。 |
| URL 与回退 | 年份降序，未知年份取最新；该年城市按登记顺序，保留仍有效的城市，否则取第一项；榜单同理。年份/城市变化尽可能保留其余有效维度。修正后的 URL 使用 replaceState，保留其他参数和 hash；popstate 重新解析。空登记返回 null 身份并呈现不可用状态。 |
| 数据与分类资源 | `useGuideData(dataPath, {cityId, guideId, year, taxonomyPath})` 并行读取名单与 taxonomy；两者全部成功、P02 parseRestaurantArray/taxonomySchema 通过且记录身份/组 key 匹配后才提交。返回 `status/data/groups/requestKey/error/retry`。 |
| 请求代次 | requestKey 含选择身份、路径、taxonomy 引用、选择代次和重试次数。切换的第一帧直接返回空 loading 上下文；AbortController 清理旧请求，提交前再次检查 abort。即使传输忽略取消，旧结果也不能提交。A→B→A 使用新代次，不复活此前 A 的详情或结果。 |
| 筛选与搜索 | `useFilters(data, requestKey, spatialContext?)` 生成唯一 visibleRestaurants 与 mappableRestaurants；新数组/身份重置全部菜系与全部 venue。reveal(record) 同时恢复菜系及被阻挡的 venue；仅接受活动数组中的记录。搜索仍使用全体活动名单与 searchNames。 |
| 详情 | App 保存带 requestKey 的记录引用；只有属于当前活动/筛选列表才可显示。移动端搜索和 marker 共用详情选择；桌面有坐标用 Leaflet popup，无坐标复用现有 React 卡片。无坐标明确提示，不请求 flyTo。遮罩关闭不再监听新开卡片的那次全局 pointerdown。 |
| 地图/统计 | MapShell 新增 `visibleRestaurants` 与 `groups` 输入，撤销内部第二次筛选。地图、热力图和区域统计消费相同结果；各绘制点仍使用 getMapPosition。切换名单在 layout effect 清除旧层/旧 popup，之后建立新层；搜索在筛选提交后定位，使用聚合层回调并核对当前记录，替代固定 400ms popup 定时器。 |
| taxonomy 展示 | 当前城市 taxonomy 随资源进入 groups；FilterPanel/Legend 按 sortOrder 展示，getGroupLabel 必须读取这份 groups。移除全局“第一份优先”合并与六城手写 imports。颜色表可共用，新组使用 OTHER 颜色但保留本城标签并可筛选。 |
| 两端事实与安全 | `src/data/display.ts::restaurantFacts` 复用 displayName/displayPrice，推导版次/榜单、新晋、已有星级、可选详情、定位说明、已有坐标来源及安全 guide_url。新晋仅 is_new=true；价格按原文加明确币种，未知行省略。React 按文本渲染，Leaflet 对共享事实转义，链接复用 isGuideUrl 并加 noopener/noreferrer。 |
| 用户状态 | 两端始终显示 loading/error/empty 或“收录/筛选结果/筛选内可定位”；错误有重试，空名单无重试错误暗示。图例表达全名单可定位数，区域统计只统计筛选结果。 |

### P03 最小衔接建议与待联调项

P03 可以继续导出当前 `CityConfig[]` 适配层，也可提供等价读取 hook；无需把它定成 canonical catalog 的存储形状。P04 只依赖城市 `id/labelZh/center/zoom` 和榜单 `id/labelZh/year/dataPath`，城市还需要明确 taxonomy 引用。当前 App 优先读取建议字段 `taxonomyPath`，尚未提供时按既有 `/data/taxonomy/{city.id}.json` 路径约定读取。这是唯一需要替换的过渡取值点。

最终 catalog 落地后需核对：发现接口与无效登记如何报告、taxonomy 引用字段名、年度路径、相同 city/guide 的两年发现，以及最终覆盖/来源元数据的呈现。原始 catalog 的 schema 拒绝与目录迁移归 P03；本轮只证明选择器对已经解析的登记及空登记的行为，不宣称测试了一个尚不存在的原始 catalog 加载器。已有 guide_url 是详情页入口，未用它推断历史版次完整性或采集/核验日期。

### P05/P06 衔接

P05 接收 `MapShellProps.restaurants/visibleRestaurants/groups`，保留组件与 map ref，不以 dataset key 整体重挂地图。P04 改动仅限传入同一结果、清除旧内容、搜索 popup 竞态；原投影、瓦片、定位权限与初始化 effect 仍归 P05。当前没有登记提供空间上下文，默认使用 P02 的 WGS84 规则；P03/P05 最终提供 spatialContext 时，须让名单可定位计数、详情、marker/heat/定位统一透传。useFilters/restaurantFacts/createRestaurantMarker 已支持 P02 可选参数，不新增空间合同。

P06 接收两端共用的状态条、筛选 props 和事实函数。新增无坐标详情沿用 MobilePopupCard，桌面只补充宽度/位置规则；完整键盘焦点管理、对比度、布局和响应式验收未纳入本包结论。

## Validation method and limitations

快速层使用真实 hook 与 P02 parser，deferred promises 控制响应到达顺序，不真实等待。浏览器使用 Vite 生产构建与实际 Leaflet/聚合/heat，fixture 只替换发现模块并拦截 HTTP 数据，正式数据未写入。所有外部 HTTP 阻止，SW 绕过；地图真实服务与缓存行为不在这些证据中。

同一 [fixture](../../../tests/e2e/fixtures/guide-experience.json) 供快速层和浏览器层使用，包含一城两年、旧版单城、新城单榜单、同 key 异标签、新组、HKD/CNY/MOP 与缺失字段。浏览器针对合法/非法 URL、级联选择、空登记、两端隐藏记录搜索、无坐标详情与无飞行调用、markup、2027 新晋、历史切换清理、A→B→C 的 C/A/B 完成顺序、404/网络错误/坏 JSON/对象/危险链接/空名单及恢复验证。浏览器通过显式忽略 fetch signal 验证传输无法取消时的结果隔离；等待真实 DOM/请求/动画完成，不加固定 sleep。

完整命令、截图、身份/事实快照和构建结果保存在本包 evidence。P03 最终 catalog、P05 最终地图实现、P06 无障碍、P07 SW/离线升级及发布尚未联调，不将本轮测试结果视为这些 Packet 的验收。
