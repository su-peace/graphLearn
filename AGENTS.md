# AGENTS.md — GraphLearn 智能体与子智能体协同研发规范

本文件为 **GraphLearn（AI 原生思维导图画布系统）** 的工作区级 AI 研发与智能体编排准则（Workspace Rule）。当主智能体（Primary Agent）在本项目中执行代码编写、性能优化、架构演进或缺陷修复时，默认加载并遵循以下指引。

---

## 1. 核心授权：自由调用 Gemini 3.8 Flash 与自定义子智能体

在开发、重构与优化 GraphLearn 项目时，主智能体拥有完整的**多智能体自治编排权限**：

1. **自由调用 Gemini 3.8 Flash 模型**：
   * 在调用 `invoke_subagent` 启动子智能体时，可自由将 `Model` 参数显式指定为 `'flash'`（或针对轻量检索/格式校验使用 `'flash_lite'`，复杂架构推演使用 `'inherit'` / `'pro'`），充分利用 **Gemini 3.8 Flash** 的高吞吐、低延迟与高代码生成效率。
   * 在项目内涉及端侧/云端 LLM 特性调试、Prompt 案卷优化或写后知识卡提取（`artifactExtractor`）测试时，同样可优先配置并调用 Gemini Flash 系列模型。
2. **自主定义与派生专属子智能体**：
   * 主智能体可根据任务复杂度，随时通过 `define_subagent` 动态创建职责单一、边界清晰的专属子智能体（Subagents），并通过 `invoke_subagent` 并行或串行派发任务。
   * 子智能体在后台异步执行期间，主智能体遵循**响应式唤醒（Reactive Wakeup）**原则，无需轮询等待，待子智能体完成后自动汇总成果并执行集成验收。

---

## 2. 推荐子智能体角色矩阵 (Subagent Role Matrix)

面对跨模块或多阶段研发任务时，推荐按以下职责边界通过 `define_subagent` 定义并调用子智能体：

| 子智能体 `TypeName` | 推荐 `Role` | 推荐 `Model` | 权限配置 (`EnableWriteTools`) | 核心职责与负责代码域 |
| :--- | :--- | :---: | :---: | :--- |
| `codebase-scout` | 代码库与拓扑调研员 | `'flash'` | `false`（或直接调用内置 `research`） | 快速检索组件依赖、Zustand 状态流转、类型定义与历史规范文档。 |
| `compiler-worker-agent` | 上下文编译与算法工程师 | `'flash'` | `true` | 负责 `src/worker/contextCompiler.ts`、`src/services/graphTopology.ts`、`src/services/tokenEstimator.ts`、`src/services/artifactExtractor.ts`，保障亚毫秒级编译（<5ms）与 DAG 无环拓扑安全。 |
| `canvas-ui-agent` | 画布与光学界面工程师 | `'flash'` | `true` | 负责 `src/components/Canvas/`、`src/components/Drawer/`、`src/components/Modals/` 及 `src/index.css`，严格落实 [md/DESIGN.md](./md/DESIGN.md)「触感工坊与精密光学」设计语言。 |
| `state-storage-agent` | 状态编排与持久化工程师 | `'flash'` | `true` | 负责 `src/store/canvasStore.ts`、`src/db/database.ts`、`src/services/llmService.ts`，维护多会话隔离、400ms 防抖持久化与流式 SSE 稳定输出。 |
| `qa-benchmark-agent` | 自动化测试与基准验证员 | `'flash'` | `true` | 负责 `tests/*.test.ts` 编写与执行，运行 `npm test`、`npm run lint`（Oxlint）与 `npm run build`，严格核验 TC-01 ~ TC-06 验收标准。 |
| `docs-architect-agent` | 架构文档与规范维护员 | `'flash'` | `true` | 负责同步更新 `HANDOVER.md`、`README.md` 与 `md/*.md` 系列规范文档，确保文档与代码实现 100% 对齐。 |

---

## 3. 子智能体协同工作流与派发准则 (Orchestration Workflow)

### 3.1 任务拆解与并行派发
* **文件域隔离原则**：并行启动多个 `EnableWriteTools: true` 的子智能体时，必须在 `Prompt` 中明确划定各自允许修改的文件路径集合（例如：子智能体 A 仅修改 `src/worker/*` 与 `tests/contextCompiler.test.ts`，子智能体 B 仅修改 `src/components/Drawer/*`），防止并发写冲突。
* **工作区隔离选项**：若需探索备选技术方案（如 A/B 布局算法或不同状态结构对比），可在 `invoke_subagent` 中设置 `Workspace: 'share'` 或 `'branch'` 进行隔离验证，择优合入主工作区。

### 3.2 子智能体 Prompt 编写模板
调用 `invoke_subagent` 时，传入的 `Prompt` 应包含以下四要素：
1. **明确目标（Goal）**：具体要实现的功能、优化指标或修复的缺陷。
2. **上下文与规范引用（Specs）**：指明需先阅读的规范文件（如 `md/DESIGN.md`、`md/02_ENGINEERING_REQUIREMENTS.md`、`src/types/canvas.ts`）。
3. **文件边界（Scope）**：明确允许创建或修改的源码及测试文件路径。
4. **交付与自检要求（Deliverables）**：要求子智能体完成修改后运行相关检查并返回改动摘要、关键符号位置及验证结果。

---

## 4. 项目架构红线与质量门禁 (Architectural Invariants)

无论是主智能体还是任何子智能体，在编写与优化本项目时必须严守以下工程红线：

1. **认知证据阶梯协议不可破坏（Epistemic Hierarchy）**：
   * `<root_goal>` 必须始终独立锚定在编译案卷顶部（TC-01）；
   * 旁系未验证草稿（`exploring`）严禁跨分支泄漏，已证伪节点（`deprecated`）必须转化为 `<negative_constraints>` 反向红线（TC-03）；
   * 挂载资料切片（`ReferenceChunk`）与手动置顶节点（`pinned`）必须注入 `<tier1_authoritative_sources>`（TC-04）；
   * 支持多父节点 DAG 汇聚融合（Multi-parent Merge）且严禁产生有向环路（TC-06）。
2. **主线程 60 FPS 与 Worker 亚毫秒级编译**：
   * 任何复杂图遍历、Token 估算与上下文装箱逻辑必须保留在 Web Worker（`src/worker/`）内执行，200 节点编译耗时必须 `< 5ms`。
   * 画布节点 `CapsuleNode` 保持轻量级渲染，长文本 Markdown 与代码高亮仅在 `ReadingDrawer` 中按需挂载。
3. **「触感工坊与精密光学」视觉规范（[md/DESIGN.md](./md/DESIGN.md)）**：
   * 全面使用 `src/index.css` 定义的双主题语义变量（`--bg-canvas`、`--glass-*`、`--surface-*`、`--text-*`、`--status-*`）；
   * 保持光学毛玻璃（`.glass` / `.glass-elevated`）与克制工业色标，严禁引入廉价蓝紫霓虹渐变或闪烁特效。
4. **合并前强制验证门禁**：
   * 任何代码改动交付前，必须通过以下三项检查：
     ```bash
     npm test        # 全部 Vitest 单元测试与性能基准通过
     npm run lint    # Oxlint 零警告/零错误
     npm run build   # TypeScript 严格类型检查与 Vite 生产打包通过
     ```

---

## 5. 指引性文档导航索引 (Documentation Index)

* **[HANDOVER.md](./HANDOVER.md)**：项目全景交接文档（系统架构、源码文件映射、已完成里程碑、智能体编排与演进路线）。
* **[README.md](./README.md)**：项目快速概览、核心特性、启动命令与验收矩阵。
* **[md/01_PROJECT_PLAN.md](./md/01_PROJECT_PLAN.md)**：项目阶段规划、里程碑路线图与智能体迭代模式。
* **[md/02_ENGINEERING_REQUIREMENTS.md](./md/02_ENGINEERING_REQUIREMENTS.md)**：全栈 TypeScript 架构规范、核心 Schema 与非功能性指标（NFRs）。
* **[md/03_DESIGN_SPECIFICATIONS.md](./md/03_DESIGN_SPECIFICATIONS.md)**：认知证据阶梯协议、双模态交互与节点拓扑连线行为规范。
* **[md/04_ACCEPTANCE_CRITERIA.md](./md/04_ACCEPTANCE_CRITERIA.md)**：TC-01 ~ TC-06 核心功能验收标准与量化质量指标。
* **[md/DESIGN.md](./md/DESIGN.md)**：「Tactile Studio & Optical Glass · 触感工坊与精密光学」前端视觉与多端交互规范。

