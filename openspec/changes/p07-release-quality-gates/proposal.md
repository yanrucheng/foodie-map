## Why

本轮起点的部署已有 check/build，P04–P06 也已提供自行管理服务的生产浏览器测试；仍缺完整快速集、覆盖检查与浏览器发布门禁。Service Worker 缓存缺少经验证的版本一致性、坏响应保护和回滚证据。需要把各 Packet 的合同组合成真实可重复的发布检查。

## What Changes

- 将类型/规范、快速测试、全量数据、覆盖文档和必要浏览器场景接入 PR/发布检查。
- 用受控 fixture 验证 Chromium/WebKit 核心流程及生产构建，记录实际浏览器范围。
- 保证缓存不会污染数据集身份、吞掉更新或让坏响应替换好缓存。
- 演练离线、A→B 升级和 B→A 回滚，并给出构建/数据版本证据。
- 设置明确的初始性能预算与采样协议，完成一次跨 Packet 的综合验收。
- 本 Packet 原实施范围为实现、验证和交付，当时未包含真实生产部署、推送及最终验收。后续任务可依用户的实际授权执行发布；操作入口和已发生的发布见[GitHub Pages 发布](../../../readme/development.md#github-pages-发布)，独立验收仍单独记录。

## Capabilities

### New Capabilities

- `release-quality`: 持续检查、浏览器验证、缓存/离线、可回滚交付和性能验收。

### Modified Capabilities

无。

## Impact

主要范围：GitHub Actions、已有测试入口/浏览器 harness、生产预览、sw.js、构建标识/manifest 和发布说明。复用 P01 的命令及 P02–P06 的合同与证据；不另建遥测或测试管理服务。

## Packet Contract

- 大验收：坏数据和行为回归不能发布；缓存与构建身份一致；升级/离线/回滚和性能有证据；G1–G4 综合演练通过。
- 前置：P01–P06。开发可提前准备 harness，最终验收依赖全部上游结果。
- 细则：[spec](specs/release-quality/spec.md)；总计划：[目标与验收基线](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)。
- 状态：P03 已验收且正式接入完成，P07 跨包自测与发布交接已有记录；后续远端 CI 和正式发布见[发布交接实例](../../../readme/development.md#已确认的交接实例2026-09-16)。P05 各域精度及新底图证据适用范围、P06 人工范围继续保留各自边界，独立验收由验收 Agent 负责。
