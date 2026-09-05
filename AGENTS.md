# Repository Guidelines

> 本文档面向 AI Coding Agent：定位正确修改范围、遵循既有模式、避免破坏架构边界。以源码为准，本文是导航缓存。

## Project Overview

DataForge Studio V2 —— 微调数据集工作台。纯浏览器端静态 SPA，**无服务器、无账号、无上传**，数据永不离开用户机器。

核心能力：导入（JSONL/JSON/CSV/Parquet/Excel/PDF/DOCX/Markdown/文本、Hugging Face 数据集、剪贴板）→ 网格编辑 → 质检（17 项检查）→ 去重（MinHash/基准污染筛查）→ 合成数据生成 → 导出（JSONL / Axolotl / TRL / LLaMA-Factory / MS-SWIFT / Unsloth / OpenAI FT）。

技术栈：Vite 8 + React 19 + TypeScript(strict) + Tailwind v4 + Dexie(IndexedDB) + Web Workers(comlink) + zustand + TanStack Query/Table/Virtual。

## Architecture & Data Flow

严格分层，依赖方向自上而下，**engine 层不允许反向依赖 UI/DOM**：

```
main.tsx (Provider + HashRouter 装配)
  └─ App.tsx (路由表 + 全局外壳)
       └─ pages/ (每路由一文件)
            └─ components/ (按业务域分包 + components/ui 设计系统)
                 └─ lib/ (存储/网络/AI/Worker 桥/状态/工具)
                      └─ engine/ (纯逻辑：数据模型、检测、转换、质检、去重、导出)
```

数据流（导入 → 存储 → 编辑 → 质检 → 导出）：

1. `ImportPage` 拿 `File` → `lib/workerClient.importFileToProject` 读 `arrayBuffer()` 后 comlink transfer 给 worker
2. worker 内 `engine/importers.parseFile` 解析 → `engine/detection.detectFormat` → `engine/convert.rowsToExamples` 转规范 `Example`
3. 主线程 `lib/db.bulkAddExamples` 写 IndexedDB（并 touchProject）
4. 读经 `lib/hooks.useFilteredDataset`（useLiveQuery）；写经 `lib/mutations.*`；AI 生成/增强/判分经 `lib/ai/runBatch` 后台批作业
5. 质检/去重走 `lib/workerClient.analyzeExamples/cleanExamples/findDuplicates`（worker 内跑 engine 纯函数）
6. 导出 `engine/exporters.buildExportBundle` + `bundleToZip`（fflate）

**Worker 边界（关键不变量）**：`src/engine/` 全部模块必须「无 DOM、无 React、无运行时副作用」，可同时跑在 Web Worker 和 Node(vitest)。`src/workers/engine.worker.ts` 用 comlink `expose`，主线程 `src/lib/workerClient.ts` 用 `wrap` 得到 `Remote<EngineWorkerApi>`；重活（解析/检测/转换/质检/清洗/去重/计数）一律在 worker 跑，`ArrayBuffer` 零拷贝传入。**修改 engine 时不得引入 `document`/`window`/React。**

**三套状态各司其职，勿混用**：

| 状态 | 工具 | 管什么 |
|---|---|---|
| 持久数据 | Dexie + `useLiveQuery`（`lib/hooks.ts`） | projects/examples/jobs/providers/settings/cache 全部数据 |
| 纯 UI 瞬态 | zustand（`lib/store.ts`、`lib/undo.ts`） | theme/selection/inspectorId/inspectorDirty/命令面板/undo 栈 |
| 网络读 | TanStack Query（仅 2 处） | HF 数据集搜索、provider 模型列表 |

## Key Directories

```
src/
├─ engine/       纯逻辑层：types 数据模型、registry 模型注册表、detection 格式检测、
│                convert 转换、quality 质检、dedup 去重、templates chat 模板、
│                tokens 计数、importers/ 解析器、exporters/ 导出器
├─ lib/          存储(db)、数据 hooks、写操作(mutations)、AI 操作(ai/)、provider 适配器
│                (providers/)、HF 客户端(hf)、worker 客户端、undo、hotkeys、utils
├─ workers/      引擎 worker（comlink expose engine 纯函数）
├─ components/   UI：ui/ 设计系统、layout/、dataset/、import/、export/ 等业务域分包
├─ pages/        每路由一个文件
├─ main.tsx      SPA 入口（HashRouter + QueryClientProvider）
├─ App.tsx       路由表 + 全局外壳
└─ landing.ts    着陆页入口（仅自托管字体，无 React 逻辑）
scripts/         check-registry.mjs（模型注册表 freshness 检查）
docs/            截图；guides/ 开发者技术文档（data-model 数据模型与角色规范）
.github/         workflows（deploy / registry-check / registry-update）+ dependabot
```

## Development Commands

需 Node 22+ 与 pnpm。

```bash
pnpm install          # 首次
pnpm dev              # 启动 Vite 开发服务器（http://localhost:5173）
pnpm build            # tsc --noEmit && vite build → dist/
pnpm typecheck        # 严格 TS 检查（tsc --noEmit）
pnpm test             # vitest run 单次
pnpm test:watch       # vitest 监听模式
pnpm preview          # 预览构建产物
node scripts/check-registry.mjs   # 模型注册表 freshness 报告（无需 API key）
```

## Code Conventions & Common Patterns

**命名**
- 函数/变量 camelCase（`rowsToExamples`、`buildExportBundle`）
- 组件/接口/类型 PascalCase（`DatasetPage`、`ModelInfo`；接口不加 `I` 前缀）
- 常量 SCREAMING_SNAKE_CASE（`MODEL_REGISTRY`、`DEFAULT_CLEANING`）
- 布尔 `is`/`has` 前缀（`isExportSupported`、`preservesThinking`）
- 文件：`.ts` 逻辑 camelCase，`.tsx` 组件 PascalCase

**类型**（单一真相源 `src/engine/types.ts`）
- 核心类型集中在此：`DatasetType`、`Role`、`Message`、`Example`、`Project`、`ModelInfo`、`SourceFormat`、`FrameworkId`、`ProviderConfig`、`Job` 等
- 子域类型就近声明并导出（`DuplicateGroup`→dedup.ts、`EngineWorkerApi`→workerClient.ts）
- 用 `import type` 消费类型，避免运行时依赖
- 跨模块复用但不想暴露来源时用 `export type { ... } from './x'` 重导出

**错误处理**
- 自定义错误类继承 `Error` 并设 `name`（`HfHubError`、`UnsupportedExportError`、`ProviderHttpError`）
- UI 层 `toast.error(err instanceof Error ? err.message : '...')`
- 导入容错：非法行跳过记入 `ImportResult.errors`（上限 `MAX_IMPORT_ERRORS=20`）
- 批作业单条失败重试一次，二次失败计入 `failed` 但不中断整个 job

**async**
- `async/await` 为主，并行用 `Promise.all`
- 懒加载用 `import()`（`lib/tokensLazy.ts` 动态 import `@/engine/tokens` 避免 2MB tokenizer 进入口包）
- 取消用 `AbortSignal`；批任务 `AbortController` + `runBatch.cancel()`
- worker 方法经 comlink 全部返回 Promise

**依赖注入 seam**：AI 操作（`lib/ai/*`）都接受 `ChatFn`/`MinimalDb` 注入参数，替代真实网络/IndexedDB，供单测使用——**新 AI 操作必须保留此 seam**。

**路径别名**：`@/` → `src/`（tsconfig `paths` + vite `alias` 双处配置）。

## Important Files

| 文件 | 职责 |
|---|---|
| `src/engine/types.ts` | 规范数据模型唯一真相源（零依赖、零 DOM） |
| `src/engine/registry.ts` | 模型注册表（`MODEL_REGISTRY` + `DEFAULT_MODEL_ID` + 查询助手） |
| `src/engine/importers/index.ts` | 文件导入公开入口（`parseFile`） |
| `src/engine/exporters/index.ts` | 导出打包公开入口（`buildExportBundle`） |
| `src/workers/engine.worker.ts` | comlink `expose(engineWorkerApi)` |
| `src/lib/workerClient.ts` | Worker 契约 `EngineWorkerApi` + lazy 单例 `getEngineWorker()` |
| `src/lib/db.ts` | Dexie 库（6 表）+ 便捷查询/批量写/级联删除 |
| `src/lib/mutations.ts` | 全部写操作（统一 touchProject 刷 updatedAt） |
| `src/lib/hooks.ts` | `useLiveQuery` 数据 hooks |
| `src/lib/ai/runner.ts` | 批作业运行器 + 响应缓存 + `ChatFn`/`MinimalDb` seam |
| `src/App.tsx` | 路由表（见下） |
| `vite.config.ts` | 构建 + 测试配置 + `@` alias + 双入口 |
| `scripts/check-registry.mjs` | 注册表 freshness 检查（`SHIPPED` 映射须与 `exporters/readme.ts` 同步） |

**路由清单**（HashRouter）：`/`(HomePage)、`/settings`(SettingsPage)、`/p/:projectId`(WorkbenchLayout 外壳) 下嵌套 `data`/`import`/`generate`/`quality`/`analytics`/`export`。

## Runtime/Tooling Preferences

- **运行时**：Node ≥ 22；`engines.node >=22.0.0`
- **包管理器**：pnpm（`packageManager: pnpm@9.15.1`），lockfile 为 `pnpm-lock.yaml`；CI 用 `--frozen-lockfile`
- **模块**：`type: module`（ESM）
- **TypeScript**：`strict` + `noUnusedLocals` + `noUnusedParameters` + `verbatimModuleSyntax`（import type 强制）+ `moduleResolution: bundler`
- **构建**：Vite 8；生产 `base = /dataforge/`（可用 `DATAFORGE_BASE` 覆盖）；`build.target: es2022`
- **双入口**：`index.html`（营销着陆页，挂 `/src/landing.ts`）+ `app.html`（SPA，挂 `/src/main.tsx`）——改路由/脚本挂载点注意区分二者
- **部署**：GitHub Pages（Hash 路由 + `public/.nojekyll`），`dist/` 为产物
- **UI**：Tailwind v4（`@tailwindcss/vite`）；Radix UI 原语 + `components/ui` 自建设计系统（`cn = clsx + twMerge` 在 `lib/utils.ts`）

## Testing & QA

- **框架**：Vitest 4；配置在 `vite.config.ts` 的 `test` 块（无独立配置文件）：`environment: 'node'`、`include: ['src/**/*.test.ts']`、`globals: false`
- **位置**：测试与源码同目录共存（`src/engine/tokens.ts` ↔ `src/engine/tokens.test.ts`），共 14 个 `.test.ts`（约 557 用例）；无 `__tests__/`、无 `.spec.ts`、无 `.test.tsx`
- **写法约定**：每个测试文件显式 `import { describe, expect, it } from 'vitest'`（globals 关闭，勿用全局 describe/it/expect）
- **mock 约定**：网络用 `vi.stubGlobal('fetch', ...)` + `beforeEach/afterEach` 清理；模块 mock 用 `vi.hoisted` + `vi.mock`；AI 层走注入 seam（`dbOverride`/`chatFn`）而非真实网络
- **测试数据**：无 fixtures 目录，测试文件顶部内联工厂函数/常量
- **覆盖边界**：只测 engine/lib 纯 TS 模块；**无 UI/组件/worker/zustand 测试**——改纯逻辑加测试，改 UI 用浏览器驱动验证
- 聚合测试模式：`providers/`、`importers/`、`exporters/`、`ai/` 各一个测试文件覆盖整个子目录

## 关键注意项

- engine 模块头部注释统一声明「No DOM, no React — safe in Web Workers and Node (vitest)」——**保持此不变量**
- 数据写经 `mutations.ts`、读经 `hooks.ts`，勿绕过直接操作 db（除已存在的 db 便捷函数）
- API key 存 IndexedDB（`settings` 表），**绝不存 localStorage**
- `scripts/check-registry.mjs` 的 `SHIPPED` 映射与 `src/engine/exporters/readme.ts` 的框架版本号必须**同步更新**（脚本内注释「Update together」）
- 修改导出器/注册表会触发 CI 月度报告；`registry-update.yml` 依赖可选 `ANTHROPIC_API_KEY` secret
