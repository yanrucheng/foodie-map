## Why

切换数据集时 useGuideData 保留旧数据，失败后也不清理；标题先变化会使旧餐厅被标成新版本。每城 taxonomy 又被全局“第一份优先”规则覆盖，两端详情分别格式化字段且新晋年份写死。

## What Changes

- 建立数据集身份绑定的选择、加载、成功/空/错误状态及竞态处理。
- 统一活动数据集下的筛选、搜索、统计、地图输入和详情上下文。
- 按城市消费 taxonomy；新晋年份、价格、名称和来源文本来自合同和登记。
- 让桌面与移动端共享事实推导与格式语义，安全消费外部数据值。
- 保留现有产品核心流程，不引入跨所有数据集搜索或新状态管理平台作为前置。

## Capabilities

### New Capabilities

- `guide-experience`: 一致的版本选择、资源状态、领域筛选与详情展示。

### Modified Capabilities

无。

## Impact

主要范围：App、useSelection/useGuideData/useFilters、urlState、cuisineRegistry、桌面/移动详情与相关行为测试。P05 消费一致地图输入；P06 负责控件可访问性与布局。

## Packet Contract

- 大验收：任何时刻都能确定屏幕数据属于哪个版本；切换失败不混用旧内容；两端事实和分类一致。
- 前置：P02 的合同与有效性语义、P03 的 catalog/数据集身份。
- 细则：[spec](specs/guide-experience/spec.md)；总计划：[目标与验收基线](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。
- 状态：仅规划，开发 Agent 待分配。

