## ADDED Requirements

### Requirement: P02-R1 Single authoritative record contract

系统 SHALL 以一份可执行合同定义餐厅记录；TypeScript 类型、Python boarding 使用的派生规则、发布校验与运行时字段解析 MUST 复用同一来源。合同 MUST 仅要求 id、name、city、guide_type、edition_year、cuisine_group 六个核心字段；字段类型和可选信息按本 change design 的 Record contract 固定。合法缺失 SHALL 仅影响相应内容或操作，不要求来源凭证、核验日期或字段齐全。

#### Scenario: P02-R1-S1 Minimal and partial information

- **GIVEN** 最小核心记录、缺译名/价格/链接的记录，以及只有名称地址但无位置的记录
- **WHEN** 按相应数据集上下文校验
- **THEN** 合法记录通过并完整保留在结果数组中；可选省略/null/空文本不触发整批失败
- **AND** 既有来源、营业状态和坐标不因没有新增认证元数据而被改写

#### Scenario: P02-R1-S2 Invalid field semantics

- **WHEN** 出现缺少核心字段、错误类型、重复文件内 ID、不同于登记的城市/年度/榜单、星级不在 1–3 或 Bib 有值不为 0、危险 URL
- **THEN** 返回文件/记录/字段级错误；不能用 TypeScript 类型断言或静默类型转换接受输入
- **AND** 未知译名等可选缺失与上述错误有不同结果

#### Scenario: P02-R1-S3 Existing and optional facts

- **GIVEN** 一条 status=closed 的年度记录、没有 status 的记录和带额外来源字段的记录
- **WHEN** 验证或迁移
- **THEN** 年度身份均不被删除；没有 status 不要求填 unknown；额外字段保留并可报告维护提示
- **AND** 既有 active 不因无核验时间改为 unknown；合同不把营业状态描述成刚确认的实时信息

### Requirement: P02-R2 Non-destructive boarding

boarding SHALL 只派生 cuisine_group，保留所有其他输入字段和值。原始输入仅要求 id/name，cuisine 可缺失；不要求先补齐完整发布合同。dry-run MUST 不写文件或目录；全部校验成功前 MUST 不覆盖原输入或正式输出；成功写入 SHALL 使用原子替换，拒绝输出与任一输入同路径。

#### Scenario: P02-R2-S1 Hong Kong field preservation

- **GIVEN** 带 venue_type、avg_price_hkd、额外嵌套来源字段的香港原始记录
- **WHEN** 调用 boarding
- **THEN** 除 cuisine_group 外，所有字段和值与输入深比较相同；币种不变，venue_type 不丢失
- **AND** 原始 cuisine 含复合标签、简繁体或空值时，不改写原文

#### Scenario: P02-R2-S2 Dry-run and failure protection

- **GIVEN** 已有正式输出文件和非法 mappings/groupKey/JSON 输入，或写入替换失败
- **WHEN** 执行转换或 dry-run
- **THEN** dry-run 不创建任何输出/目录；失败非零退出，原输入和既有正式输出保持原状
- **AND** 同路径写入被拒绝，临时写入失败不留下可误用的正式结果

#### Scenario: P02-R2-S3 Repeatability and fallback

- **GIVEN** 合法 raw，其中有一个未映射标签或缺少 cuisine
- **WHEN** 两次转换到独立输出
- **THEN** 均返回相同语义结果，未知分组为 OTHER；非空未映射输出 warning，缺失分开汇总
- **AND** 二者都不要求人工审批或凭证，不因 fallback 比例拒绝输出

### Requirement: P02-R3 Deterministic taxonomy and mapping contract

系统 SHALL 统一 mappings 为数组，检查 raw/group key 唯一、目标组存在、fallbackGroup 存在、城市一致，以及存储派生值与规则一致。原始 cuisine MUST 保留；精确匹配完整标签，不猜首词或简繁等价。显式 OTHER、缺失与未映射 fallback SHALL 分开报告。

#### Scenario: P02-R3-S1 All current city mappings

- **WHEN** 六城 mappings 和真实记录通过同一派生/检查入口
- **THEN** 上海与其他城市使用相同数组合同；所有存储分组可由规则或 fallback 解释
- **AND** sources 原有标签保留，上海没有来源标签时不补造

#### Scenario: P02-R3-S2 Conflicts are errors, missing information is allowed

- **WHEN** 有重复 raw、重复组 key、不存在的目标、城市不符或存储派生值不一致
- **THEN** 检查非零退出，包含规则/记录位置、raw、实际与期望值
- **WHEN** 只有合法非空 raw 未映射且存储为 OTHER，或 raw 缺失且存储为 OTHER
- **THEN** 检查允许通过；分别报告未映射维护 warning 或缺失汇总，不静默删除餐厅

#### Scenario: P02-R3-S3 Explicit OTHER and compound labels

- **GIVEN** 全部记录明确映射 OTHER，或 compound raw 未精确登记但首词存在
- **WHEN** 派生/检查
- **THEN** 前者通过且不算未映射；后者按完整标签回退 OTHER 并提示，不能按首词编造已命中
- **AND** 不以任意 OTHER 占比阈值要求错误分类

### Requirement: P02-R4 Usable coordinate semantics

合同 SHALL 明确可定位含义：成对有限 lat/lon、合法范围、非 0,0，遵循统一 WGS84 或调用方明确的空间上下文，且没有 geocode_success=false。缺省/null 的定位状态不否定已按合同保存的合法坐标，也不自动补写 true。统一坐标约定 SHALL 由合同/数据集承担，不要求逐记录 coordinate_system、凭证或核验日期。

共享位置函数 MUST 被提供给地图、热力图、飞行和计数复用；它返回合法坐标对或 null，不认证真实精度。明确失败、明确未知坐标系和已知无效位置 MUST 不被伪装为可定位。

#### Scenario: P02-R4-S1 Known and unknown position input

- **GIVEN** 合法数值对且 success=true，或合法数值对但 success 缺省/null
- **WHEN** 按统一坐标约定验证和取位置
- **THEN** 通过且返回数值对，不要求补证明文件，不改变已有状态
- **GIVEN** 两侧都缺失且 success 不为 true，或合法候选对但 success=false
- **THEN** 记录校验通过、取位置返回 null，名单和其他字段保留

#### Scenario: P02-R4-S2 Invalid and contradictory coordinates

- **WHEN** 出现单边数值、NaN/非有限、超出全球范围、0,0，或没有坐标却 success=true
- **THEN** 校验报对应字段错误；位置函数防御性返回 null
- **AND** 调用方明确未知坐标系或点不在提供的有效 bounds 内时不得返回可用位置；不能推测转换或城市边界补救
- **AND** unknown 空间上下文及明确 false 的范围外候选可作为不可定位记录保留并提示；其他范围外声明为错误，非法 bounds 配置不得被忽略

#### Scenario: P02-R4-S3 Duplicate and legacy positions

- **WHEN** 不同餐厅重复坐标，或旧记录没有新增来源认证材料
- **THEN** 重复坐标输出维护提示；不自动删除、降级或要求逐店补签后才绘制
- **AND** 基线内 384 个有效且原 success=true 的坐标保持；18 个原 false 保持不可定位；4 个零点迁移为 null 对，不新增或复制坐标

### Requirement: P02-R5 Price text and currency preservation

合同 SHALL 用可选 price 文本、独立 currency 和已有 price_range 等级表达价格。金额/区间/约数含义 MUST 原样保留，不为当前没有的金额计算需求派生上下界、平均价、精度枚举或计价单位。不要求价格存在、币种存在或补核验材料才允许显示；缺少币种不得默认人民币。

#### Scenario: P02-R5-S1 Mainland Hong Kong and Macau migration

- **WHEN** 迁移 avg_price_cny、avg_price_hkd 及澳门 avg_price/currency
- **THEN** 非空金额文字逐字保留，明确后缀币种/已有币种保留；旧价格字段移除并对账其去向
- **AND** 澳门 MOP 不改为 CNY；有矛盾币种或多个非空金额时迁移失败而不擅自取舍

#### Scenario: P02-R5-S2 Range approximate and missing prices

- **GIVEN** 約 200–400、約 700 以上、约 150、仅等级和完全没有价格的样例
- **WHEN** 规范化并供消费者读取
- **THEN** 区间、下限、约数原文保持；仅等级不变成金额，缺少金额保持缺少
- **AND** 没有数字区间解析、汇率转换、人均或均值推算；币种未知时保留原文

#### Scenario: P02-R5-S3 Display contract boundary

- **WHEN** 现有卡片适配新 price/currency 字段
- **THEN** 有价格读取原文与已知币种，仅等级按等级表示；都没有则省略价格行
- **AND** 不常态显示新增认证提示，不因缺价格隐藏该餐厅其他信息

### Requirement: P02-R6 Actionable read-only validation

项目 SHALL 提供 npm run validate:data，检查现有登记的所有餐厅文件与全部 taxonomy/mappings，并接入 P01 的 check；不创建平行登记或发布工作流。检查 SHALL 使用同一合同并给出 file/record_id/field/code/severity/reason；返回 0 表示无错误（允许维护 warning），1 表示数据错误，2 表示入口使用/执行失败。检查 MUST 不修改输入、不访问真实官网/地图服务。

#### Scenario: P02-R6-S1 Corrupt data and registration omissions

- **WHEN** 隔离数据含坏 JSON、非数组、重复 ID、错误字段/评级/链接、假成功坐标、分类冲突、缺少登记文件或未登记餐厅文件
- **THEN** 检查非零退出并定位问题，不报告整批成功
- **AND** 最小合法记录、可选缺失、空数组和可解释的 OTHER fallback 不被混同为错误；空数组身份来自登记

#### Scenario: P02-R6-S2 Repeatability and shared language boundary

- **WHEN** 对同一输入重复执行检查，并通过 Python boarding 与 TS 校验处理同一 raw/taxonomy/mappings
- **THEN** 派生/诊断语义一致，所有输入字节不变；Python 不另维护分组/价格/字段规则
- **AND** 全量默认入口和 --root 指定数据根读取同一登记，不从文件第一条记录猜年度

#### Scenario: P02-R6-S3 Necessary consumer adaptation only

- **WHEN** 接入新推导类型及运行时解析
- **THEN** 现有名称搜索/卡片读取可选字段不报字符串方法错误；价格读取和空间入口使用共同含义；已有错误通道接收无效载荷
- **AND** P02 不重构 URL/选择/竞态，不新增无 marker 详情面板，不修改 gcj02、定位生命周期或瓦片规则；完整体验由原 P04/P05 验收

### Requirement: P02-R7 Auditable bounded migration

迁移 SHALL 对实际输入逐文件核对身份集合和关键字段去向，解释所有变更。P02 MUST 保留原名称、年度名单元数据、原始 cuisine、venue_type、地址、来源、营业状态及非零候选坐标，不因新增元数据缺失批量修改 true/false 或 active。采集日期未知保持未知，不用迁移日期填充。

#### Scenario: P02-R7-S1 Reconcile all current records

- **GIVEN** 迁移前真实文件清单、文件内 ID 和 guide_url 对照
- **WHEN** 完成价格/mappings/零点与派生分类规范化
- **THEN** 逐文件身份集合无静默新增/删除，所有价格和币种有去向；六条分类冲突及海鮮映射影响、四个零点有逐项结果
- **AND** 当前基线 402 条均保留；原 384 可定位/18 不可定位及全部 status 保持其信息含义；不把这些数量固化为未来上限

#### Scenario: P02-R7-S2 Same-count replacement and unrelated changes

- **WHEN** 对账样例总数相同但 A 被 D 替换，或原 URL/名称/raw cuisine/定位状态被无依据改写
- **THEN** 对账报告差异，不能仅按总数通过或按数字 ID 当作跨年身份
- **AND** 无来源/坐标/价格的记录仍保留；不使用空值填充、假成功或删除记录获得绿色结果

#### Scenario: P02-R7-S3 Handoff and compatibility boundary

- **WHEN** 提交 P02 开发交接
- **THEN** 在现有 tasks/必要 artifact 记录实现范围、上游、逐 R 证据及紧凑对账，合同交给 P03/P04/P05；指南仅更新字段和命令部分
- **AND** 不修改年度路径/catalog、不退役旧公共地址、不发布或增加认证/兼容系统；BC-01 独立待决，开发完成不等于最终验收
