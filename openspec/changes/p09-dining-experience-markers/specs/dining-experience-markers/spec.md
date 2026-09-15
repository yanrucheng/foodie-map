## ADDED Requirements

### Requirement: P09-R1 Single optional dining category with preserved source facts

系统 SHALL 在既有餐厅合同中增加可选 dining_category，合法值恰为 staple、meat、seafood、dessert_drink、french、chinese、japanese_course、other。缺省/null SHALL 保持未标注；旧 serving_form、venue_type、价格、名称、身份和坐标 MUST 保留原有含义，不自动迁移为新主分类。

#### Scenario: P09-R1-S1 Legal values and independent legacy fields

- **GIVEN** 八个新值、缺省/null，以及只含旧类型字段或新旧字段并存的隔离记录
- **WHEN** 正式 parser、数据工具和界面读取这些记录
- **THEN** 新值按同一合同解析，旧字段保持原值且不产生推断的新值
- **AND** 新主图标只由 dining_category 决定；旧字段在原合同内继续合法

#### Scenario: P09-R1-S2 Invalid category is an actionable dataset error

- **WHEN** dining_category 为空串、unknown、mixed、meal、sweet、kaiseki、数组或数字
- **THEN** 校验报告文件、记录 id 和字段路径，界面进入既有可恢复数据错误态
- **AND** 不把非法值静默变成 other、未标注或某个默认食品类别

#### Scenario: P09-R1-S3 Explicit other is distinguishable from missing

- **GIVEN** 一家显式 other、一家省略字段、一家字段为 null
- **WHEN** 渲染、筛选和汇总
- **THEN** 三者均用通用刀叉，但后两者的详情注明主打体验未标注
- **AND** 数据统计为 other=1、unclassified=2，展示“其他料理”组为 3；不写入补齐值、不增加问号主图标

### Requirement: P09-R2 Fixed shared icons and independent stable cuisine color

系统 SHALL 按 design 的固定八项表选择图标、名称和顺序；React、Leaflet、控件和 Node 诊断 MUST 共享同一权威定义。颜色 SHALL 保持 P08 算法和 cuisine_group 输入，允许碰撞；不能因类别分布、价格或新城市重新分配。

#### Scenario: P09-R2-S1 Same category and same cuisine key remain stable

- **GIVEN** 跨城市、年度、榜单的同一主分类与同一 cuisine_group，以及不同价格/新晋状态
- **WHEN** 排序、过滤、增加另一个类别或切换数据集
- **THEN** 同主分类图形不变，同 key 颜色不变，价格仅影响角标
- **AND** 单个 cuisine_group 可以配合不同主打图标；数据无需填写色值或图标 URL

#### Scenario: P09-R2-S2 Complete local icon support

- **WHEN** 八类在 React 与 Leaflet 渲染，或有展示定义缺失
- **THEN** 八类均能找到正确本地图形，缺失定义由类型/完整性检查暴露
- **AND** SVG 不来自餐厅原文或远程地址，素材来源和许可随本地产物保留

### Requirement: P09-R3 Price grade symbols with no missing-price badge

价格角标 SHALL 只从 price_range 的有效等级派生。解析副本 trim/NFKC 后，1–4 个相同 Unicode 货币符号对应等级 1–4，显示同数量的 ¥。缺失或不可识别时 MUST 不创建角标及占位。源 price_range、price、currency MUST 原样保留，不做金额推算。

#### Scenario: P09-R3-S1 Four grades and regional source symbols

- **GIVEN** ¥ 至 ¥¥¥¥、全角 ￥￥、港澳 $$$，以及 €€ 等相同货币符号等级
- **WHEN** 解析并显示价格
- **THEN** 按符号个数显示 ¥ 至 ¥¥¥¥，各端和诊断使用同一个等级
- **AND** 原文、币种和真实价格不被改写，界面说明符号表示等级而非金额

#### Scenario: P09-R3-S2 Missing or unrecognized source creates no badge

- **GIVEN** price_range 缺省/null/空白、¥150–250、150、五个 ¥、混合 $¥，以及只提供实际金额的记录
- **WHEN** 显示点位
- **THEN** 这些点位均无价格角标元素，无 P—、问号、横线、空框或透明占位
- **AND** missing 与 unrecognized 在数据诊断中分开；实际金额和非标准原文仍可在详情查看

#### Scenario: P09-R3-S3 Grade does not change other visual or filter semantics

- **WHEN** 同一记录仅价格等级变化或缺失
- **THEN** 主图标、菜系色、坐标、分类计数和过滤资格不变，只有角标与价格说明变化
- **AND** 产品不新增 P1–P4 选择器、价格推算或价格筛选控件

### Requirement: P09-R4 Legible marker composition with existing interaction states

地图 SHALL 在固定位置锚点上同时呈现主图标、菜系色、价格、NEW 和选中/焦点。缺失不造成伪信息；辅助徽标不能覆盖主图形、互相遮挡或夺取邻点操作。聚合与位置资格 SHALL 沿用现有合同。

#### Scenario: P09-R4-S1 Four-symbol price with NEW and focus

- **GIVEN** 四个 ¥、is_new=true、选中或键盘焦点同时存在的记录
- **WHEN** 在桌面、窄屏与放大文字/页面后查看及操作点位
- **THEN** 价格、NEW、主图标和外圈均完整可见，NEW 与价格分处独立位置，角标文字具备可测对比
- **AND** 单一记录的可操作目标至少维持约 44px，键盘/触摸能打开同一份详情，不靠 hover 读取必需信息

#### Scenario: P09-R4-S2 Dense points and neutral clusters

- **GIVEN** 密集点、相同坐标点、无可靠坐标点及混合类别/价格
- **WHEN** 聚合、放大、spiderfy 展开和选择
- **THEN** 聚合数字只表示筛选后可定位数量，展开后各点的图形/角标可读且可选择
- **AND** 聚合点不展示某种主打或平均价格，餐厅源坐标不被移动，无位置记录仍可搜索/看详情

### Requirement: P09-R5 One dining filter and consistent consumers

新 UI SHALL 用主打体验替代四类消费形式筛选，并与菜系过滤组合。所有展示类别数量 SHALL 按当前整份城市/年度/榜单数据计算，包含无坐标记录。地图、统计、热力图、图例与详情 MUST 消费一致的记录和语义。

#### Scenario: P09-R5-S1 Other filter and complete-dataset counts

- **GIVEN** 八类、显式 other、未标注和无坐标混合的隔离数据
- **WHEN** 查看类别按钮并组合菜系与主打筛选
- **THEN** 按固定顺序展示有记录的主打类别，默认全部；其他料理过滤包含显式 other 与未标注，筛选按钮只显示类别名和合计数量，筛选区不显示未标注说明
- **AND** 按钮数量按全部收录，地图仅取其中可定位对象，不用定位数替代分类总数

#### Scenario: P09-R5-S2 All unclassified data remains usable

- **WHEN** 全部 dining_category 都缺失的合规名单加载
- **THEN** 页面正常浏览、搜索、选择并显示通用刀叉与菜系色，筛选区显示“全部 N”“其他料理 N”，数据诊断继续单列未标注总数
- **AND** 不显示问号主图标，不推断旧类型，不宣称补标完成，不制造八个空结果按钮

#### Scenario: P09-R5-S3 Search reveal, switching and detail consistency

- **WHEN** 搜索命中被隐藏的记录、再次选中同店，或切换城市/年度/榜单
- **THEN** 按需恢复对应菜系/主打过滤，桌面与移动详情显示相同分类和价格规则
- **AND** 切版同步撤下旧详情与选中圈，不把旧过滤或数据混入新上下文

### Requirement: P09-R6 Honest distribution diagnostics through existing tooling

validate:data SHALL 增加主打类别、未标注和价格等级统计，保留既有来源、旧类型和位置诊断。最大图标组与同图标同价位组 SHALL 按 design 的明确定义、城市×年度×榜单报告。分布和缺失比例 MUST NOT 成为强行补标的阈值。

#### Scenario: P09-R6-S1 Count identities and denominators

- **GIVEN** 包含显式 other、未标注、四种等级、缺价、非标准价格及无坐标的隔离数据
- **WHEN** 查看 CLI JSON/文本结果和 UI 计数
- **THEN** 八个显式类别+unclassified=listed，四等级+missing+unrecognized=listed，UI 八类数之和也等于 listed
- **AND** 无角标组合同时包含 missing/unrecognized，源诊断仍分别保留；空名单比例无 NaN 或假 100%

#### Scenario: P09-R6-S2 No aggregate hides guide concentration

- **GIVEN** 同城星级与必比登的价格/类别分布明显不同
- **WHEN** 汇总分布供数据交接
- **THEN** 每份榜单都保留计数及最大组，城市合并统计不能替代分榜单结果
- **AND** 报告不把价格组合分散称为图标分布变化、屏幕遮挡率或用户辨识率

#### Scenario: P09-R6-S3 Missing and unsupported grades remain visible data gaps

- **WHEN** 名单存在高比例未标注/other 或非标准价格文本
- **THEN** 合法缺失不逐店警告、不导致比例门禁失败，非标准价格按既有诊断机制定位/汇总且保留原文
- **AND** 非法类别仍为 error，不通过弱化 schema 或将未知全部写成 other 消除问题

### Requirement: P09-R7 One runbook and evidence-based data onboarding

来源 runbook SHALL 固定八类语义、食品主打优先、宽口径日式会席的证据要求、复合标签边界、other/缺失区别与独立源价格。boarding SHALL 继续只改变 cuisine_group；接入指南和仓库技能入口 MUST 指向同一语义规范。

#### Scenario: P09-R7-S1 Correct primary-experience judgments

- **GIVEN** 综合法餐、明确意面主轴的意餐、明确鱼鲜主打的中餐、涮羊肉、甜品套餐、日本料理泛称、多道和食及“本帮菜/点心”复合标签
- **WHEN** 接入 Agent 按 runbook 判断
- **THEN** 先采用有依据的食品主打，再采用综合料理分类；日本料理泛称和复合点心词本身不够证明具体类别
- **AND** 不以所在城市、星级、价格、单道菜或希望均分数量作替代依据；证据不足留空

#### Scenario: P09-R7-S2 Boarding preserves new fields and prices

- **GIVEN** 带新分类、旧字段、价格原文及额外事实的输入和已存在输出
- **WHEN** 对既有 board.py 执行 dry-run、正常生成及失败场景
- **THEN** 仅 cuisine_group 按完整 raw 映射改变，其他字段原样透传，dry-run 无写入，失败不破坏输入/已有输出
- **AND** 完整记录由正式合同再校验；不加入 Python 或浏览器中的第二份主打推理规则

#### Scenario: P09-R7-S3 New city or year works through catalog

- **WHEN** 在隔离目录通过正式 catalog、taxonomy/mappings、年度数据接入新城市或新年度
- **THEN** 原有命令与页面能发现、校验、筛选并显示八类和价格，不改城市业务分支或手写颜色
- **AND** 交接按榜单给出分类/价格分布、证据不足项和字段对账，官方覆盖状态不因标签补齐升级

### Requirement: P09-R8 Offline, safety and release coherence

图标与角标 SHALL 随本地产物离线可用；所有来源文本 MUST 继续按既有安全规则渲染。升级/回滚 SHALL 沿用 P07 整包与摘要一致性，不混读新旧字段、样式或图标资源。

#### Scenario: P09-R8-S1 Local assets and safe text

- **GIVEN** 八类、价格和包含特殊字符/恶意 HTML 的名称、原始菜系及价格文本
- **WHEN** React/Leaflet 查看详情并进入已有缓存的离线场景
- **THEN** 本地图形/角标可用且来源文本不执行 HTML，外链继续由既有 URL 规则校验
- **AND** 不请求图标 CDN，不用数据字段作为 SVG/path/颜色/角标 HTML

#### Scenario: P09-R8-S2 Existing client upgrade and rollback

- **WHEN** 使用受控的完整 A/B 产物演练升级与回滚
- **THEN** 类别、价格、图标、数据和壳匹配同一版本，合法链接与既有 JSON 地址保留
- **AND** 不清空缓存绕过问题，不拼接两份构建，不为本包建立永久兼容层或部署权限

### Requirement: P09-R9 Separate implementation acceptance from production annotation

开发交付 SHALL 提供 P09-R1–R8 的实现和验证证据，并启用准确的 runbook/指南支持状态。设计样例、隔离测试和正式数据补标 MUST 分开报告；本包开发不应改写原有正式餐厅事实或既有未提交数据工作。

#### Scenario: P09-R9-S1 Honest handoff with unchanged formal facts

- **WHEN** 开发 Agent 交付本包
- **THEN** tasks 列出真实运行命令、结果、产物与未解决项；框架通过和独立验收由各自负责人记录
- **AND** 正式数据的已有字段与身份/价格/坐标未被本包改写，预览的 413 条试分未被当作迁移输入，现有未提交修订得到保留
- **AND** 新字段尚未补标的数量如实报告，未补标时不声称真实图标分布已改善；发布与真实补标另行执行
