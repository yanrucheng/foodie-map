## Why

当前工程已经使用 React/Vite/TypeScript，但运行时地图代码仍由 HTML 中的 CDN 脚本提供；检查、测试和构建没有形成统一可复现入口。后续 Agent 需要一套能定位失败、可以接入数据校验与发布验证的工程底座。

## What Changes

- 固定受支持的运行环境、依赖安装与检查入口；将地图运行代码及必要样式纳入锁文件和构建。
- 收敛类型、代码规范、快速测试和生产构建的职责与失败语义。
- 建立能供 P02/P07 扩展的统一命令，并补齐新开发者运行说明。
- 本包不改餐厅事实、版本模型、产品筛选语义或发布生产站点。

## Capabilities

### New Capabilities

- `frontend-engineering`: 可复现的前端环境、构建依赖、质量入口与快速测试约束。

### Modified Capabilities

无；这是该项目首次建立 OpenSpec 规格。

## Impact

主要范围：package.json/lockfile、TS/Vite/Vitest 配置、index.html 中的依赖装载、必要的地图库 import、Makefile 和 readme。后续 P02 接入 validate:data，P07 接入完整 CI；本包不设第二套检查入口。

## Packet Contract

- 大验收：干净 checkout 能安装、检查、测试、构建；应用代码不依赖运行时 CDN 才能启动。
- 前置：无。交付运行环境、命令语义和构建依赖边界给 P02–P07。
- 细则：[spec](specs/frontend-engineering/spec.md)；总计划：[目标与验收基线](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。
- 状态：实现与开发证据已提交至 tasks.md，等待验收负责人复核并填写最终判定。
