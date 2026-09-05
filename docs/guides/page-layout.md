# DataForge 页面布局与组件术语

> 本文档定义当前 Web 应用中用于描述页面、区域和组件的名称，供产品、设计和开发需求共用。
> 以当前源码为准：路由见 `src/App.tsx`，具体组件见 `src/pages/` 与 `src/components/`。本文只描述可见界面和主要交互，不替代实现细节或数据模型规范。

**一句话**：应用分为**站点页**（项目主页、设置）和**项目工作台**；进入项目后，可折叠且会记住状态的**左侧导航轨**与**顶部工具栏**包围一个随路由变化的**内容页**。

---

## 1. 全局术语

| 术语 | 对应组件/区域 | 用途 |
|---|---|---|
| 站点页 | `HomePage`、`SettingsPage` | 不依赖某个项目的完整页面；使用站点页头部。 |
| 站点页头部 | `SiteHeader` | 站点品牌、Projects / Settings 导航、主题切换、GitHub 链接。 |
| 项目工作台 | `WorkbenchLayout` | `/p/:projectId/*` 下所有项目页的公共外壳。 |
| 导航轨 | `NavRail` | 工作台左侧的持久化可折叠导航。展开（208px）时显示 DataForge Studio 标题和 Data、Import、Generate、Quality、Analytics、Export 标签；折叠（64px）时保留图标与右侧提示。顶部品牌按钮切换状态；底部保留回主页和进入设置的入口。 |
| 顶部工具栏 | `TopBar` | 工作台顶部；显示项目身份和样本数量，并提供任务、撤销/重做、命令面板、主题与 GitHub 控件。 |
| 内容页 | `Outlet` | 导航轨和顶部工具栏以内、随当前项目路由切换的主体区域。各页面自己负责垂直滚动。 |
| 命令面板 | `CommandPalette` | 全局 `Ctrl/Cmd+K` 对话框；用于导航、项目切换、撤销/重做和主题切换。 |
| 活动任务指示器 | `JobIndicator` | 顶部工具栏中的任务下拉框；展示跨项目的进行中批任务、进度、错误数，可取消任务。 |
| 空状态 | `EmptyState` | 数据尚不存在、项目不存在等情况下的替代内容和下一步操作。 |

### 路由与页面归属

| 路由 | 页面名称 | 所属外壳 |
|---|---|---|
| `/` | 项目主页 | 站点页 |
| `/settings` | 设置页 | 站点页 |
| `/p/:projectId/data` | 数据页 | 项目工作台 |
| `/p/:projectId/import` | 导入页 | 项目工作台 |
| `/p/:projectId/generate` | 生成页 | 项目工作台 |
| `/p/:projectId/quality` | 质量页 | 项目工作台 |
| `/p/:projectId/analytics` | 分析页 | 项目工作台 |
| `/p/:projectId/export` | 导出页 | 项目工作台 |

`/p/:projectId` 默认跳转至数据页。未知路由跳转至项目主页。

---

## 2. 站点页

### 2.1 项目主页（`HomePage`）

从上到下：**站点页头部** → **存储提示横幅**（仅在需要时）→ **项目概览区** → **项目区**或**首项目空状态** → **新建项目对话框**。

| 名称 | 组件 | 用途 |
|---|---|---|
| 存储提示横幅 | `StorageBanner` | 浏览器存储尚未持久化时，提示用户启用持久存储；可关闭。 |
| 项目概览区 | 页面内 Hero 区 | 展示产品说明、项目总数和样本总数。需求中可称“主页概览”或“Hero 区”。 |
| 项目区 | 页面内 Projects section | 已有项目时显示标题、创建/演示项目操作和项目卡片网格。 |
| 首项目空状态 | `EmptyState` | 没有项目时，引导“创建项目”或“加载演示项目”。 |
| 项目卡片 | `ProjectCard` | 一个项目的入口；点击进入其数据页。卡片菜单支持重命名和删除。 |
| 新建项目对话框 | `NewProjectDialog` | 填写项目名称、描述、数据集类型及可选目标模型；创建后进入该项目的导入页。 |

### 2.2 设置页（`SettingsPage`）

从上到下为一列**设置分区**：AI Providers、Hugging Face、Storage、Backup、Danger zone、Appearance、About。每个分区由页面内 `Section` 提供标题和说明。

| 名称 | 组件 | 用途 |
|---|---|---|
| 提供商卡片 | `ProviderCard` | 配置一个自带密钥（BYOK）AI 提供商，包含启用状态、连接信息和连接测试。 |
| Hugging Face 令牌区 | `HfTokenSection` | 保存 Hugging Face 访问令牌，供数据集导入使用。 |
| 存储面板 | `StorageSection` | 显示 IndexedDB 用量与持久化状态；可申请持久存储、清理 AI 响应缓存。 |
| 备份面板 | `BackupSection` | 导出本地备份或导入合并备份；导出的提供商配置不含 API Key。 |
| 危险区 | `DangerZone` | 执行不可逆的本地数据清除操作。 |
| 外观区 | 页面内 Appearance section | 切换明暗主题。 |

---

## 3. 项目工作台的内容页

### 3.1 数据页（`DatasetPage`）

数据页是样本浏览与手工编辑界面。其结构是：**筛选栏** →（存在选中项时）**批量操作栏** → **虚拟化数据表格**；右侧打开一个可调宽度的**样本检查器**。检查器可最大化。筛选条件和当前检查的样本会同步到 URL 参数，便于共享同一视图。

| 名称 | 组件 | 用途 |
|---|---|---|
| 筛选栏 | `FilterBar` | 按搜索词、数据切分、数据集类型、标记和质量问题过滤；也可新建空白样本。 |
| 批量操作栏 | `BulkActionBar` | 对当前表格选中项批量设定 split、标签、标记、已审阅状态或删除；操作可撤销。 |
| 数据表格 | `DataGrid` | 固定行高的虚拟化样本表格，负责显示、选中和打开样本；不是普通静态表格。 |
| 样本检查器 | `InspectorPanel` | 右侧停靠的单条样本编辑面板，含保存、复制、标记、审阅、删除、前后导航和最大化。 |
| 对话编辑器 | `ConversationEditor` / `MessageList` | SFT 样本的消息序列编辑区域。 |
| 消息卡片 | `MessageCard` | 单条消息的编辑单元：角色、内容、顺序、删除，以及 assistant 的 reasoning、loss weight、工具调用等。 |
| 工具调用编辑器 | `ToolCallEditor` | assistant 消息内的单个工具调用，编辑函数名、JSON 参数和 call id。 |
| 偏好编辑器 | `PreferenceEditor` | preference（DPO/ORPO）样本：共享 prompt 与并排的 chosen / rejected 回复，可交换两者。 |
| KTO 编辑器 | `KtoEditor` | KTO 样本：prompt、completion，以及 desirable / undesirable 标签。 |
| RL 编辑器 | `RlEditor` | RL（GRPO / RLVR）样本：prompt 与供奖励函数核对的可验证答案。 |

### 3.2 导入页（`ImportPage`）

导入页由页标题和四个**导入标签页**组成。切换标签页不会丢失正在进行的导入状态。

| 名称 | 组件 | 用途 |
|---|---|---|
| 文件标签页 | `FileDrop` | 拖放或选择文件，显示每个文件的解析、格式识别和转换进度。支持 JSONL、JSON、CSV/TSV、Parquet、Excel、PDF、DOCX、Markdown、文本等。文档文件会交给文档标签页。 |
| 粘贴标签页 | `PasteImport` | 粘贴 JSONL、JSON 或 CSV 文本后解析、识别并转换。 |
| Hugging Face 标签页 | `HfImport` | 搜索或填写 Hub 数据集 ID/URL，选择配置和 split，预览原始行并导入。 |
| 文档标签页 | `DocumentImport` | 将非结构化文档文本直接提取 Q&A，或调用模型按分块生成训练样本。 |
| 导入预览 | `ImportPreview` | 导入转换后的统一确认界面：显示识别结果、警告、跳过/错误、样本预览；确认后才写入项目。 |

### 3.3 生成页（`GeneratePage`）

生成页为单列、依次排列的 AI 操作面板。最上方的**模型选择面板**为吸顶区域，下方所有生成面板共享该选择。

| 名称 | 组件 | 用途 |
|---|---|---|
| 模型选择器 | `ProviderModelPicker` | 选择已配置的 AI 提供商与模型；生成、文档导入等需要 LLM 的区域复用它。 |
| 合成数据面板 | `SyntheticSection` | 通过 Self-Instruct、Evol-Instruct、Persona 或 Magpie-style 生成新样本。 |
| 增强面板 | `EnhanceSection` | 对既有样本进行质量提升、补充 reasoning、扩写、简化、自定义改写等原地增强。 |
| 偏好对生成面板 | `PreferenceSection` | 从 SFT 样本生成候选并排序，创建 chosen / rejected 偏好对。 |
| LLM 评分面板 | `JudgeSection` | 按有用性、正确性和清晰度评估现有样本，写入 0–100 的质量分。 |
| 目标选择器 | `TargetPicker` | AI 操作的对象范围：数据表格当前选中项、项目全部样本或随机样本；可按数据类型限制。 |
| 作业进度 | `JobProgress` | 某个批处理作业的行内进度、完成/失败数、详情与取消操作。 |

### 3.4 质量页（`QualityPage`）

质量页是从上到下的四个工具面板；没有样本时显示“Nothing to check yet”空状态。

| 名称 | 组件 | 用途 |
|---|---|---|
| 质量扫描面板 | `ScanSection` | 在 worker 中检查全部样本，保存质量分和问题摘要。 |
| 清洗面板 | `CleanSection` | 配置文本清洗规则；先预览样本影响，再对全量数据应用。 |
| 去重面板 | `DedupSection` | 查找精确和近似重复组；每组保留最早样本，可批量删除其余项。 |
| 基准污染筛查面板 | `DecontaminateSection` | 使用 n-gram 与基准测试集进行逐字污染筛查；可标记或删除命中样本。 |

### 3.5 分析页（`AnalyticsPage`）

分析页是只读的项目数据仪表板；没有样本时显示“Nothing to measure yet”空状态。

| 名称 | 组件 | 用途 |
|---|---|---|
| 统计卡片行 | `StatCard` × 4 | 显示样本数、总 token、平均轮数、已评分比例；token 未计算时这里提供计算操作。 |
| 构成区 | `BarList` | 三个横向条形列表：按数据集类型、数据切分和消息角色统计。 |
| Token 分布图 | `Histogram` | 按 token 区间显示竖向柱状分布。 |
| 覆盖率区 | 页面内 Coverage section | 显示 reasoning、工具调用、已审阅、已标记、已评分样本所占比例。 |
| 质量分布区 | `BarList` | 已有评分时，按质量分区间展示分布。 |
| 热门标签区 | `BarList` | 有标签时，展示出现次数最多的标签。 |

### 3.6 导出页（`ExportPage`）

导出页依次提供：**框架选择网格** → **导出选项面板** → **导出预览** → **下载操作栏**。没有样本时显示“Nothing to export yet”空状态。

| 名称 | 组件 | 用途 |
|---|---|---|
| 框架选择网格 | `FrameworkCard` 列表 | 选择 JSONL、Axolotl、TRL、LLaMA-Factory、MS-SWIFT、Unsloth 或 OpenAI FT 等目标格式；不支持当前数据类型的卡片会禁用。 |
| 导出选项面板 | `ExportOptionsPanel` | 选择目标模型、自动分配 train/validation/test、是否拆分文件、是否包含 system / reasoning、以及先前 thinking 的处理方式。 |
| 导出预览 | `ExportPreview` | 使用首批样本实时生成结果，按输出文件分标签展示，便于导出前检查。 |
| 下载操作栏 | 页面内 Download section | 汇总将导出的样本、跳过的其他类型样本和 token 估计，并下载 ZIP。 |

---

## 4. 需求描述建议

优先使用本文的正式名称，避免含义不明确的“那个页面”“右边栏”“列表”等表达。

| 不推荐说法 | 推荐说法 |
|---|---|
| “右边编辑区” | “数据页的样本检查器（`InspectorPanel`）” |
| “数据列表” | “虚拟化数据表格（`DataGrid`）” |
| “左侧菜单” | “项目工作台的导航轨（`NavRail`）” |
| “顶部菜单” | “顶部工具栏（`TopBar`）”；站点页则称“站点页头部（`SiteHeader`）” |
| “导入确认弹窗” | “导入预览（`ImportPreview`）”；它是页面内面板，不是对话框。 |
| “生成的进度条” | “作业进度（`JobProgress`）”；跨项目入口则是“活动任务指示器（`JobIndicator`）”。 |
| “数据编辑弹窗” | “样本检查器”；它是停靠面板，可最大化。 |
| “质量工具” | 指定“质量扫描 / 清洗 / 去重 / 基准污染筛查”中的一个面板。 |

示例：

- “在**数据页的筛选栏**增加按标签过滤，不改变**虚拟化数据表格**的列结构。”
- “让**导出页的导出预览**在不支持当前数据类型时，说明应切换哪个**框架选择卡片**。”
- “在**生成页的增强面板**中，复用现有**目标选择器**，不要新建另一套选择范围控件。”
