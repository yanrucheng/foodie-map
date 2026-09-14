## ADDED Requirements

### Requirement: P08-R1 Independent and optional serving form

系统 SHALL 在既有记录合同中支持可选 serving_form，合法业务值恰为 meal、snack、dessert、drink。其消费目的含义遵循 design 的四类定义，缺省/null SHALL 保持未知。cuisine_group SHALL 独立表达细分类别。系统 MUST NOT 从旧 venue_type、城市、菜名或坐标推断新字段。

#### Scenario: P08-R1-S1 Independent combinations and legacy input

- **GIVEN** 相同 cuisine_group 的四种 serving_form、缺省和 null 记录，以及只有 venue_type=restaurant/street_food/dessert 的记录
- **WHEN** 经正式 parser/校验加载
- **THEN** 所有合规记录保留；四类各自展示，缺省/null/仅有旧字段均显示类型未标注，类别颜色不因形式变化
- **AND** 同时存在两字段时 UI 只以 serving_form 判断形式，不重写旧事实

#### Scenario: P08-R1-S2 Invalid form fails visibly

- **WHEN** serving_form 为 unknown、空串、数组或其他非法值
- **THEN** 校验非零并给出文件、记录及字段，运行时进入既有数据错误态，不默认为任何形式

### Requirement: P08-R2 Deterministic automatic category color

所有合法登记的非 OTHER groupKey MUST 无需样式登记即可获得非灰色兜底的有效颜色。颜色 SHALL 只依赖稳定 key 及本次构建的共享算法。系统 MUST NOT 按类别集合、顺序、城市、版次、筛选或显示名称重新分配颜色；允许不同 key 同色或近色。

#### Scenario: P08-R2-S1 New city and unseen category

- **GIVEN** 隔离 catalog 新城、新 taxonomy key 和完整 raw 映射，未修改任何 src 文件
- **WHEN** 校验、构建并打开两端
- **THEN** 新类别显示正确名称和自动颜色，能筛选及看详情，不因不存在手工配色使用 OTHER 灰色

#### Scenario: P08-R2-S2 Stable across context and palette domain

- **WHEN** 同 key 换城市标签、换榜单/年度、重新排序、筛选、增删其他 key 或重新加载
- **THEN** 颜色保持一致
- **AND** 对首版全部 360 个色相验证有效颜色与白色前景对比度；不以分类颜色唯一作为通过条件

#### Scenario: P08-R2-S3 Fallback does not hide invalid classification

- **WHEN** 合法记录的原文缺失/未映射/明确 OTHER，或记录的 groupKey 未登记/与映射不符
- **THEN** 前一类按原 P02 规则使用 OTHER 和对应诊断，后一类仍为数据错误；可计算哈希不代表分类合法

### Requirement: P08-R3 Shared local icons and marker semantics

餐食、小食、甜品、饮品 SHALL 使用 design 固定的 Tabler 四款图标。未知形式 SHALL 使用问号。图标和类别色 MUST 独立组合，全部消费者 SHALL 共用一份受信图形及展示定义。素材 MUST 随构建提供，不依赖远程请求或来源数据中的 SVG。

#### Scenario: P08-R3-S1 Consumers and offline rendering

- **GIVEN** 四类与未知的同一组记录
- **WHEN** 查看地图、形式筛选、图例和桌面/移动详情，以及已有缓存的离线页面
- **THEN** 名称、图标、颜色语义一致，离线图标存在，不发送远程图标请求，不将数据解释为 SVG/HTML

#### Scenario: P08-R3-S2 Selection new badge and mixed clusters

- **WHEN** 标记被选中、获得焦点、含 is_new 或进入包含不同形式的聚合
- **THEN** 选中/焦点/新晋不覆盖类型与类别语义；混合集群显示筛选后可定位餐厅数，展开后恢复每店图标，不以某一家代表集群

### Requirement: P08-R4 Coherent form filtering search and counts

形式过滤 SHALL 与类别过滤取交集，由既有共享筛选结果驱动地图、热力图和统计。未知记录 MUST 可搜索和查看。形式控件默认全部，不再消费 venue_type。类别标题 SHALL 如实表达菜系与品类。

#### Scenario: P08-R4-S1 Mixed forms and unclassified records

- **GIVEN** 四类、未知、同类别不同形式和缺坐标记录
- **WHEN** 交叉筛选类别/形式、选择未标注、搜索隐藏记录及切换数据集
- **THEN** 结果及计数一致，搜索揭示命中项；缺坐标不定位但仍可看详情，切换不残留旧选择
- **AND** 未标注仅为 UI 状态，不写为数据枚举

#### Scenario: P08-R4-S2 Dataset with no form annotations

- **WHEN** 加载所有 serving_form 都缺失的合规名单
- **THEN** 全部仍可浏览，显示未标注数量，不呈现四个无结果类型按钮；框架不补值，不按覆盖率拒绝名单

### Requirement: P08-R5 Readable and operable visual encoding

颜色与图标 SHALL 配有可访问的文字含义，不能把表达形式的图标当成菜系颜色的等价替代。标记、控件、图例和详情 MUST 在桌面及移动端可读、可点击、可通过键盘操作。视觉尺寸/触摸目标及对比度采用 design 的首版参数和验证要求。

#### Scenario: P08-R5-S1 Contrast names and non-hover access

- **WHEN** 在浅/深背景和桌面/移动布局查看、聚焦及选择各类标记
- **THEN** 图标/文字满足约定对比度，accessible name 有店名、类别和形式；用户不必区分颜色或使用 hover 才能获知信息
- **AND** 原类型控制的可见标签、焦点和两端详情能力没有丢失

#### Scenario: P08-R5-S2 Dense targets and coordinate integrity

- **GIVEN** 邻近和相同坐标的多条记录，含不同图标
- **WHEN** 在不同缩放及触摸场景展开并逐个选择
- **THEN** 每条记录可操作，聚合/spiderfy 避免无法选择的重叠目标；不修改来源坐标，不因扩大透明命中区选到邻店

### Requirement: P08-R6 Existing automation closes the presentation path

系统 SHALL 扩展既有 validate:data/check/test/release 管线，检查字段、引用、完整 raw 映射及展示完整性。boarding MUST 继续只修改 cuisine_group。缺失类型 SHALL 汇总而非被猜补或作为数据质量阈值阻断。

#### Scenario: P08-R6-S1 Read-only validation and transparent boarding

- **WHEN** 校验所有登记数据，或对带 serving_form/venue_type 的输入运行 boarding 和 dry-run
- **THEN** 校验输出四类/未标注数量、保留原分类和位置诊断，所有引用分组均可生成样式；boarding 不改两个类型字段及其他事实，dry-run 不写文件

#### Scenario: P08-R6-S2 Presentation defects are caught

- **WHEN** 在隔离夹具/测试中缺少一种形式图标、破坏颜色生成、设置非法 serving_form 或错误映射
- **THEN** 相应类型/数据/展示检查失败；合法新 key 则无需代码登记即可通过，不保留“新组必须回退灰色”的旧断言

### Requirement: P08-R7 Reviewable handoff and data boundary

开发交付 SHALL 包含已启用的既有 runbook/接入指南、逐要求证据、真实数据不变对账与发布一致性验证。数据补标和语义重分类 MUST 与框架开发分开记录，不能用推断填值换取验收通过。

#### Scenario: P08-R7-S1 Existing data and onboarding rehearsal

- **GIVEN** 当前全部正式名单的起始字节清单和一个新地区夹具
- **WHEN** 完成本包并按既有接入入口演练
- **THEN** 正式餐厅/taxonomy/mappings 字节未改，真实东京合法类别自动上色；夹具新类别与四种形式不用改业务代码即可展示
- **AND** runbook 能解释主营边界、复用/新增 key、缺失值、完整 raw 映射和来源；字段尚未实现时不宣称可用

#### Scenario: P08-R7-S2 Build and release remain coherent

- **WHEN** 运行既有发布检查及旧构建→新构建→原构建回滚演练
- **THEN** 图标随产物可用，旧/新资源不混用，合法页面链接与已有 JSON 地址保留；不添加兼容平台，不清缓存冒充升级成功
- **AND** 未执行/失败/开发者通过与独立验收分别记录，设计文件存在不等于实现完成
