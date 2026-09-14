## Context

已有 CSS variables、桌面浮层和移动 BottomSheet 可以复用。SearchBar 有箭头键行为，但角色、标签和焦点联动需要完整验证；地图本身也需要可经搜索/详情完成的非拖拽路径。

## Goals / Non-Goals

**Goals:** 核心操作可达、弹层焦点正确、窄屏可用、状态可理解、视觉状态可辨识。

**Non-Goals:** 全站品牌重做、每个地图点都进入漫长 Tab 序列、为当前规模单建组件文档站、宣称未经审计的整站 WCAG 认证。

## Backward Compatibility Policy

按[总计划 BC-01](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)处理。保持核心业务流程与合法链接，允许调整按钮尺寸、标签和布局以满足本包要求。

## Decisions

- 先明确控件行为和语义，再选择 native 元素、现有组件修正或必要的可访问组件依赖。验收不绑定某套 UI 库。
- 键盘用户经搜索/详情获取餐厅信息与定位，不要求逐个 Tab 遍历全部标记。
- 每个弹层声明模态或非模态；模态有名称、焦点约束与返回，非模态不冒用模态语义。滚动锁与关闭路径归同一生命周期。
- 固定基础视口 360×800、390×844、768×1024、1280×800 CSS px，补 200% 缩放和移动输入场景。浏览器范围与 P07 保持一致。
- 普通核心文本对比度至少 4.5:1，大文本至少 3:1；主移动操作目标至少 44×44 CSS px。聚合点等地图内容通过可访问替代路径操作，不以尺寸规则强行放大每个点。
- 复用现有 CSS variables 与组件承载焦点、禁用、加载、空、错误等状态；共享事实格式来自 P04。
- 用户提示说明当前状态与下一步，HTTP/数据集诊断细节放到可审阅的开发/测试记录，不占据主要用户流程。

## Risks / Trade-offs

- [只跑落地页自动扫描] → 展开下拉、弹层、详情和错误态分别检查。
- [Portal/滚动锁破坏焦点] → 验证键盘、点击外部、拖拽关闭及数据集切换。
- [移动模拟器未覆盖真实软键盘] → 记录实际验证范围，输入场景使用可复现模拟并做支持设备/浏览器抽检；未实测项不能写通过。

## Migration Plan

在 P04 接口稳定后修正基础控件和弹层，再验证窄屏/缩放及状态样式。按 P07 浏览器协议提交截图/可访问树、自动审计和实际键盘/辅助技术操作证据。与 P05 共享文件改动由接收方开发 Agent 集成。

## Open Questions / Delegated Choices

自动审计工具、控件具体实现和 CSS 拆分由开发 Agent 选择。真实设备可用性需在验证前确认并记录；证据不足的目标平台不得被宣称已验收。


## Implementation decisions (2026-09-14)

- 保留 P04 的 catalog 适配、请求身份、筛选、所选详情和共享 `restaurantFacts`；保留 P05 的空间规则、模式通知、瓦片重试和固定 5 分钟定位会话。P06 新增状态仅限控件开关、活动选项、面板高度与焦点书签。
- 桌面选择器采用非模态按钮 + 单选 listbox；打开进入当前项，上下/Home/End 移动活动项，Enter/Space 提交，Escape 取消，Tab 关闭后继续顺序导航。单选维度显示带名称的静态值。两端共用 `PickerOptions`，选项数/年份来自 P04。
- 移动选择/筛选/统计/图例与移动详情采用原生 `dialog.showModal()`，由 `DialogSurface` 统一顶层隔离、关闭、滚动锁和焦点恢复。桌面无坐标详情使用非模态 dialog；桌面可定位详情保留 Leaflet popup，以标题进入、来源链接和 Escape/关闭返回形成完整路径。
- 原生 modal top layer 隔离 Leaflet 和 React Portal，不加平行业务 modal store。Body 锁保留原值并计数；退出优先使用浏览器原生焦点恢复，仅在焦点丢失到 body 时修复。稳定 `data-focus-key` 为切版/断点重建寻找等价触发器，找不到时返回搜索。
- BottomSheet 使用实际 half/full 高度与内部滚动区，不把全高面板向屏外平移。提供展开/收起及关闭按钮；拖拽是附加操作，pointercancel 不提交。FAB 横排，给短视口的地图缩放和定位留空。
- SearchBar 的 combobox 语义全部附着 input；ARIA 引用指向实际列表和活动项；IME composition 不提交；pointerdown 不选项，完成点击才选择，滚动/取消不误选。确认建立搜索焦点书签，由详情接收焦点。状态区区分无匹配，并不逐个播报地图更新。
- `useVisualViewport` 只提供可见高度/偏移 CSS 变量；不接管业务状态或定位。动态高度、长词换行、安全区域和 44px 命中范围在现有 CSS 内实现。地图点继续通过搜索/详情替代路径访问。
- 普通文本对比度按 4.5:1；修正菜系标签文字、类型选中态及输入 placeholder；半透明面板提高不透明度，保留现有色彩。选中有勾选、禁用有虚线及原生语义，新晋继续使用共享文字标签。
- 自动验证扩展现有 `node:test` + Vite production preview，不另建 runner。Puppeteer 继续运行既有 P01/P04/P05 回归；Playwright 连接同一 Chromium 并增加 WebKit。axe-core 在实际展开/异常状态执行。新增依赖仅用于测试，均固定版本。
- macOS WebKit 默认 Tab 略过普通按钮；最小原生页面确认 Option+Tab 可完整遍历。WebKit 场景记录使用 Option+Tab，Chromium 使用 Tab；不修改系统偏好，也不向应用批量添加 tabindex 覆盖平台约定。
- 200% 通过隔离 Chrome 扩展 `tabs.setZoom(..., 2)` / `tabs.getZoom()` 验证，原生窗口调整尺寸；不是 DPR、CSS transform 或 pinch。GUI 窗口受当前显示器高度约束，记录实际值。Safari/真实朗读/真机软键盘证据不足，不能据 WebKit、AX 树或模拟视口宣布通过。
