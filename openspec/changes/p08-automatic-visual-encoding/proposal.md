## Why

东京合法的新菜系分组没有写进前端颜色表，因而使用 OTHER 灰色。数据校验只验证 raw → groupKey，未覆盖分组到视觉表达的链路。现有形式筛选又使用 restaurant / street_food / dessert，不能直接表达用户已确认的餐食、小食、甜品、饮品。

需要建立简单、可持续扩展的分类与可视化规范：接入 Agent 按 runbook 标注语义，框架自动配色并选择图标；新增地区或类别不再修改业务组件。

## What Changes

- 继续用 cuisine_group 表达一个用于浏览的细分类别，允许菜系、风格和产品类别；颜色由稳定 key 自动生成，允许碰撞。
- 增加可选 serving_form，表达四种消费形式，固定使用已经确认的 Tabler 图标；缺省/null 显示问号，不从旧字段或菜名推断。
- 地图、筛选、图例、两端详情共享样式与标签定义，形式与类别独立组合。
- 扩展现有合同、校验、快速集和浏览器验收，补上合法新类别自动显示、未知形式、组合筛选和离线图标场景。
- 将分类判断规则纳入现有来源 runbook，继续使用既有 boarding、catalog 和发布入口。

## Capabilities

### New Capabilities

- `restaurant-visual-encoding`：自动类别颜色、四类形式图标及接入到展示的一致性。

### Modified Capabilities

无新增的基础系统。实现依赖现有 guide-data-contract、guide-coverage、guide-experience、accessible-interface 和 release-quality；对既有行为的替代范围见 design。

## Impact

- 主要实现位置：src/data/contract.ts、validation.ts、display.ts，restaurantPresentation 共享展示模块（替代 cuisineRegistry），useFilters 与地图/筛选/图例/详情组件，相关测试。
- taxonomy/mappings 的现有结构和完整 raw 精确映射继续使用；普通新城接入不要求颜色、图标或全局注册代码。
- 正式餐厅数据补标、菜系重分类、同义 key 清理由独立数据任务负责，不是本包开发的前置。
- 保留既有 JSON 字段、地址和页面链接；不新增兼容框架或退役旧公开接口。
- 本地框架实现已完成，开发证据与验证结果见 [tasks](tasks.md)。提交、部署、独立验收与归档均未执行。

## Handoff

- [设计定稿](design.md)：字段、视觉规则、自动化、兼容与职责。
- [验收合同](specs/restaurant-visual-encoding/spec.md)：P08-R1–R7。
- [开发任务](tasks.md)：执行边界及证据要求。
- [已确认图标预览](preview.html)：四类图形参考，HTML 自包含。
- [文档入口](../../../docs/plan/plan-260914-2209-restaurant-visual-encoding.md)。
