## Context

初始环境与脚本见 package.json、Makefile 和 index.html。基线地图库通过外部 script 暴露全局 L；首次检查没有本地 node_modules。开发时已在独立目录安装基线锁文件：Node 24.21.0 / npm 11.19.0 下原有 25 条快速测试和构建通过。首次沙箱下载的 DNS 失败与联网重试结果分别保留在任务证据中。

## Goals / Non-Goals

**Goals:** 可重复启动；明确依赖；类型与测试失败可发现；给后续包稳定的命令入口。

**Non-Goals:** 框架迁移、目录全面重排、全项目格式重写、数据模型改造、提前实现 P04 的领域行为。

## Backward Compatibility Policy

采用[总计划 BC-01](../../../docs/plan/plan-260913-0040-frontend-professionalization.md)的当前结论。本包不改变公共 URL 或数据接口；环境升级必须在依赖 engines 和干净安装上验证。

## Decisions

- 保留 React/Vite/TypeScript；选择满足锁文件 engines 的受支持 Node LTS，并在项目中记录。具体版本由开发者核验后填写；不能仅依赖个人机器的 Node 26。
- 地图 JS 和必要 CSS 由锁定依赖构建；瓦片仍是明确的外部服务。选择直接 Leaflet 集成或小型适配代码由开发者判断，不要求引入新的 React 地图库。
- 约定 npm run check 负责类型及规范，npm test 负责快速确定性测试，npm run build 负责生产产物。Makefile 仅转调同一入口。
- 后续数据检查使用 npm run validate:data，浏览器验证复用 npm run test:e2e。P01 不放置永远返回成功的占位检查。
- 类型、Hooks 规则和资源边界优先；已知既有问题若由下游修复，例外须指明文件、原因和接收 Packet，最终发布前清零。禁止以全局关闭规则使检查变绿。

## Risks / Trade-offs

- [Leaflet 插件依赖单例 L] → 用生产构建浏览器验证插件与核心库协作，不能只证明 TS 编译通过。
- [工具升级扩大修改面] → 优先解决运行与验证必要差异，不追逐所有包的最新版本。
- [过重快速测试] → 只保护行为与集成边界；长浏览器和外部来源检查交给 P07/P03。

## Migration Plan

先记录当前命令和依赖条件，再建立环境/入口并迁移地图依赖装载，完成干净安装与生产预览。此包回退以源码与锁文件对应回退为单位，不触碰餐厅文件。

## Developer Choices

- **环境**：支持 Node `>=24.11.0 <25` 与 npm 11；`.nvmrc` 固定 24.21.0，`packageManager` 记录 npm 11.19.0。锁文件中全部 224 个 Node engines 声明在 24.11.0 和 24.21.0 均匹配。`engines` + `.npmrc` 拒绝不支持的安装，npm `devEngines` 同样约束运行命令。Python `>=3.11` 沿用 cuisine-boarding 的 pyproject，仅数据工具需要；前端无 Python 安装步骤。
- **检查**：`check` 顺序调用 `check:types` 和 `check:lint`。TypeScript 5.8 保留严格检查，并覆盖快速测试和 Vite/Vitest 配置；以 `--noEmit` 执行，避免生成配置声明文件。ESLint 10、typescript-eslint 8 与 Hooks 插件 7 检查 JS/TS 及 Hooks 调用/依赖；项目没有 React Compiler 构建步骤。ESLint 警告和未使用的局部 disable 同样使检查失败。
- **构建**：`build` 只生成 Vite 生产产物；Makefile 与现有工作流改为调用权威 npm 入口。工作流仅对齐 `.nvmrc` 并显式运行 `check` 以保留原构建的类型门禁，完整 CI 仍由 P07 负责。
- **地图依赖**：锁定 Leaflet 1.9.4、markercluster 1.5.3、heat 0.2.0。`src/lib/leaflet.ts` 单独负责加载核心、两个插件和三份 CSS，业务模块从这里导入 `L`。Leaflet 的 CommonJS/UMD 入口会设置 `window.L`，heat 使用该对象；markercluster 的 require 也解析同一依赖。类型使用正式的 `@types` 包，移除手写 CDN 插件声明和 `allowUmdGlobalAccess`。生产浏览器场景验证真实聚合、热力图像素及本地样式。
- **快速测试**：保留 25 个行为测试；默认 Node 环境，仅需要 DOM 的测试选择 jsdom。URL 测试使用 History API 并恢复现场，Hook 测试显式卸载。Vitest 恢复 mocks、globals、env 和计时器，不允许空集合成功。浏览器测试独立于快速入口，使用本地合成 fixture、动态端口及资源清理。
- **浏览器运行器**：沿用 Puppeteer 24.42.0，显式安装它锁定的 Chrome Headless Shell 147.0.7727.57 到 `node_modules/.cache/puppeteer/`，不在 `npm ci` 时下载。普通 Chrome headless 在本机最小按钮页面也不产生动画帧；同版本 Headless Shell 的动画帧、真实点击与截图均正常，因此选择不依赖桌面合成器的官方运行器，不修改页面或降低交互断言。

## Local Exception and Handoff

`src/components/MapShell.tsx` 初始化 effect 的依赖数组保留一处单行 `react-hooks/exhaustive-deps` 例外（P01-R4-S2）。当前定位回调每次渲染都变化，直接扩展依赖会触发地图重建，涉及 P05 的生命周期设计。**P05-R4/R5** 负责稳定回调、验证重建/清理并移除例外；最终发布前清零。不关闭整个文件、规则或测试目录。

`useLocationTracking` 的 effect 补入稳定的 `mapRef` 依赖；`gcj02.ts` 的常量缩短为运行时完全相同的 IEEE-754 数值（`Object.is` 已验证），只处理规范错误，不改变坐标规则。瓦片服务完整反馈、坐标边界与定位行为仍归 P05。

逐项命令、失败注入、环境与浏览器结果在 [tasks.md](tasks.md) 保持一份证据记录，运行步骤在 [readme/development.md](../../../readme/development.md)。验收正文不变，最终判定由验收负责人填写。
