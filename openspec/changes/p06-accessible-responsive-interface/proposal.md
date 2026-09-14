## Why

现有界面支持移动底部面板和部分键盘行为，但选择器的 option 主要响应点击，BottomSheet 缺少完整对话框/焦点语义。专业前端的验收需要证明用户在键盘、触摸、窄屏和错误状态下都能完成核心流程。

## What Changes

- 完成版本选择、搜索、筛选、详情和定位控件的键盘与可访问语义。
- 为弹层明确焦点进入、约束、关闭和返回规则。
- 在指定视口、缩放和移动输入场景检查布局与触摸目标。
- 统一状态提示、颜色/焦点和事实呈现，提供自动检查与实际操作证据。
- 在现有组件和样式中改进，不以完整视觉重做或独立设计系统为前置。

## Capabilities

### New Capabilities

- `accessible-interface`: 可操作的核心界面、焦点管理、响应式布局和可访问性验证。

### Modified Capabilities

无。

## Impact

主要范围：SegmentPicker、SearchBar、BottomSheet、FilterPanel、MobileShell/Popup、Header/Legend、相关样式和浏览器测试。领域状态采用 P04；地图资源和权限逻辑采用 P05。

## Packet Contract

- 大验收：目标视口、键盘与触摸下核心流程可完成；错误可理解；证据覆盖展开态和异常态。
- 前置：P04 领域状态与共享展示语义；P05 的地图状态接口需集成协调。
- 细则：[spec](specs/accessible-interface/spec.md)；总计划：[目标与验收基线](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。
- 状态：P06 界面实现与自动证据已交付，实际辅助技术/真机补验和最终判定待验收 Agent；见 tasks.md。

