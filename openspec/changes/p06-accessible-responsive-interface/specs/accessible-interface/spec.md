## ADDED Requirements

### Requirement: P06-R1 Keyboard-complete core flows

用户 SHALL 能仅用键盘完成版本选择、搜索、筛选、查看详情/来源、地图模式切换及定位控件操作；控件有可访问名称、状态和可见焦点。餐厅信息 MUST 有不依赖拖拽地图的访问路径。

#### Scenario: P06-R1-S1 Complete keyboard journey

- **WHEN** 不使用鼠标，从页面入口选择城市/年份/榜单，搜索餐厅、筛选、看详情并切换图层
- **THEN** 操作均可完成且焦点可见，选中/展开状态能从可访问语义识别

#### Scenario: P06-R1-S2 Search and picker navigation

- **WHEN** 使用 Tab、箭头键、Enter/Space 和 Escape 操作搜索及选择器
- **THEN** 行为符合对应控件语义，活动项与实际选择一致，关闭后焦点有明确位置

### Requirement: P06-R2 Correct overlay focus lifecycle

弹层 SHALL 声明模态性、可访问名称与关闭方式；模态弹层打开时管理焦点并限制背景交互，关闭后返回触发位置或合理后继位置。各关闭路径 MUST 清理滚动锁与事件。

#### Scenario: P06-R2-S1 Modal open and close

- **WHEN** 打开移动选择/筛选面板，以键盘导航后关闭
- **THEN** 焦点进入有效内容且不会落入不可操作背景，关闭后返回触发控件

#### Scenario: P06-R2-S2 Alternate close paths

- **WHEN** 点击外部、拖拽关闭、Escape、选择条目或切换数据集导致弹层关闭
- **THEN** 焦点与滚动状态恢复，没有不可见覆盖层拦截后续操作

### Requirement: P06-R3 Usable responsive layouts

核心界面 SHALL 在 360×800、390×844、768×1024、1280×800 CSS px 及 200% 缩放下保持可达；文字、选择器、搜索和详情 MUST 不被页面横向溢出、安全区域或软键盘永久遮挡。

#### Scenario: P06-R3-S1 Viewport and zoom matrix

- **WHEN** 在目标视口和 200% 缩放检查默认、展开选择器、详情与错误状态
- **THEN** 页面核心控件不发生不可用的横向溢出或遮挡，内容可通过适当滚动访问

#### Scenario: P06-R3-S2 Mobile input and long content

- **WHEN** 窄屏输入搜索词、显示软键盘并查看长中英文名称/地址
- **THEN** 当前输入、候选项和关闭/确认操作仍可见可达，不与地图拖动冲突

### Requirement: P06-R4 Understandable and announced states

加载、空名单、无搜索结果、数据失败、地图服务失败和定位失败 SHALL 有可区分提示与可行下一步；重要状态变化可由辅助技术获知，但 MUST 不反复抢夺焦点。

#### Scenario: P06-R4-S1 Error and empty states

- **WHEN** 分别进入空名单、无匹配、数据失败和定位拒绝状态
- **THEN** 提示说明当前情况及可行操作，不把它们统一显示为无解释的空白地图

#### Scenario: P06-R4-S2 Status announcements

- **WHEN** 数据加载完成或失败，或者用户操作改变结果
- **THEN** 辅助技术可获知必要状态，输入焦点不被无关地图更新打断

### Requirement: P06-R5 Perceivable visual controls

核心文本 SHALL 达到普通文本 4.5:1、大文本 3:1 的对比度；主要移动操作目标至少 44×44 CSS px。选择、焦点、禁用和新晋等含义 MUST 不只依赖颜色。

#### Scenario: P06-R5-S1 Control state inspection

- **WHEN** 检查默认、焦点、选中、禁用、错误及新晋状态
- **THEN** 每种含义有可辨识的文字、形状或语义辅助；对比度和主操作尺寸达到要求

#### Scenario: P06-R5-S2 Shared component consistency

- **WHEN** 同一类操作出现在桌面和移动界面
- **THEN** 名称、状态含义和事实显示一致，布局可以适应视口而不复制业务规则

### Requirement: P06-R6 Evidence beyond a landing-page score

本包 SHALL 提交核心页面、展开控件、详情和错误状态的可访问性证据；自动审计的适用 critical/serious 问题必须清零，并提供实际键盘与辅助技术抽检。未测平台 MUST 明确标为未覆盖。

#### Scenario: P06-R6-S1 Audited state matrix

- **WHEN** 对约定状态运行自动审计及键盘检查
- **THEN** 提供各状态的工具版本、报告/截图与实际步骤，不能仅提交落地页总分

#### Scenario: P06-R6-S2 Assistive technology sample

- **WHEN** 使用记录版本的屏幕阅读器检查选版、搜索、弹层关闭和状态提示
- **THEN** 能理解并完成流程；发现的问题修复后复核，证据不足不记为通过

