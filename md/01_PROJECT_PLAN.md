# 项目规划与里程碑路线图 (Project Plan & Roadmap)

## 1. 项目定位与核心技术范式
本项目是一款面向复杂技术攻坚与系统化学习的 **AI 原生思维导图画布系统**。
系统全面采用 **全栈 TypeScript 本地优先（Local-First）架构**：
* 摆脱笨重的 Python 运行时与复杂的后端依赖，实现**纯浏览器静态加载即用（Zero-Install Web SPA）**。
* 上下文编译引擎（Context Compiler）与图拓扑算法在 **Web Worker** 中以亚毫秒级（<1ms，实测 200 节点 ~0.5ms）速度执行，保证主画布始终保持 **60 FPS** 丝滑响应。
* 原生支持 **多智能体协同研发（Multi-Agent Orchestration）**：主智能体可自由调用 **Gemini 3.8 Flash** 模型并按模块自定义子智能体并行推进迭代（详见 [AGENTS.md](../AGENTS.md)）。
* 可选通过 **Tauri 2.0 (Rust)** 封装为超轻量（<15MB 安装包、<80MB 内存占用）的跨平台原生桌面应用。

---

## 2. 研发路线与里程碑 (Milestones)

```
[Phase 0: TS 核心算法验证] ──> [Phase 1: 纯前端画布 MVP] ──> [Phase 2: 编译器与工作流] ──> [Phase 3: 拓扑增强与本地优先] ──> [Phase 4: 端侧向量与桌面化]
       (已完成 ✅)                   (已完成 ✅)                   (已完成 ✅)                     (已完成 ✅)                     (演进中 🚀)
```

### Phase 0: 核心算法与端侧模型验证 (已完成 ✅)
* **核心目标：** 验证浏览器端图拓扑算法、Web Worker 线程通信及端侧 Token 计数可行性。
* **交付清单：**
  * `ContextCompilerTS` 单元测试与装箱基准测试（基于 Vitest，200 节点编译耗时 ~0.505ms）。
  * 确立全栈统一的 TypeScript Schema（`src/types/canvas.ts`），配置 `js-tiktoken` 实现浏览器端实时 Token 预算估算。
  * 建立 Web Worker 异步通信客户端（`workerClient.ts`）与主线程降级保护。

### Phase 1: 极简纯前端画布 MVP (已完成 ✅)
* **核心目标：** 交付零门槛、点开即用、无需任何后端服务的 Web 端可视化原型。
* **交付清单：**
  * 基于 React Flow v12 (`@xyflow/react`) 搭建无限画布，支持缩放、平移与视口控制。
  * 集成 `@dagrejs/dagre` 算法，实现一键思维导图自动整齐排列。
  * 实现微缩胶囊节点（`CapsuleNode`）与右侧滑出式 Markdown 阅读抽屉（`ReadingDrawer`，含代码高亮与去气泡化排版）。
  * 纯前端通过 `fetch` + `ReadableStream` 对接云端 API（DeepSeek / SiliconFlow / OpenRouter / OpenAI / Claude）或本地 Ollama (`http://localhost:11434`) 及内置离线高保真仿真引擎实现流式输出。

### Phase 2: 上下文编译器集成与沉浸式工作流 (已完成 ✅)
* **核心目标：** 落地 Context Compiler 2.0，打通低摩擦交互与写后异步流水线。
* **交付清单：**
  * **划词即分支（Highlight-to-Branch）：** 在阅读抽屉划选长文关键词，浮动气泡一键触发派生子节点并启动流式回答。
  * **写后异步流水线：** 节点输出完成后，自动提取结构化无损知识卡（`KnowledgeArtifact`：含 50 字结论 + 硬核不变量 + 函数签名）。
  * **状态机门控：** 支持节点标记为 🟢 `VERIFIED`（允许跨分支检索）与 🔴 `DEPRECATED`（转化为反向避坑约束）。
  * **X-Ray 实时光线追踪：** 聚焦输入框或开启 X-Ray 时，Web Worker 毫秒级返回入选节点，画布对应链路动态发光。

### Phase 3: 自主拓扑连线、溯源交互与多会话持久化 (已完成 ✅)
* **核心目标：** 支持自由 DAG 多父节点融合、精准溯源角标跳转与多会话本地优先存储。
* **交付清单：**
  * **局部资料挂载（Scoped Reference Chunks）：** 支持将 Markdown/文本切片挂载至特定节点，以 Tier 1 绝对权威注入。
  * **溯源跳转（Citation Navigation）：** 回复中的 `[Ref: node_id]` 解析为可交互 Pill 徽章，点击驱动视口 600ms 平滑聚焦并触发 2s 呼吸灯。
  * **用户自定义 DAG 连线与防环引擎：** 支持画布拖拽连线、可交互边一键断开（`InteractiveMindMapEdge`）、跨视口连线弹窗（`ConnectNodesModal`）与 BFS 环路阻断（`graphTopology.ts`）。
  * **本地优先多会话持久化：** 集成 `Dexie.js`（IndexedDB 封装），支持 400ms 防抖保存、多会话切换/克隆/搜索，以及导出 `.canvas.json` 与 Markdown 复盘报告。

### Phase 4: 细粒度撤销重做栈、多格式资产流转与混合重排 (已完成 ✅)
* **核心目标：** 支持高容错拓扑历史回溯、多格式导图资产互通、编译语义关联加权及构建优化。
* **交付清单：**
  * **细粒度 Undo/Redo 历史栈：** 支持节点移动、连线建立/解绑、删除、状态与标题原地修改的 30 步快照回退与重做，支持 `Ctrl+Z` / `Ctrl+Y` 全局热键。
  * **多格式导出引擎 (exportService.ts)：** 支持 Mermaid 流程图源码（含精密光学状态色标与 DAG 拓扑）、OPML 2.0 树形导图（全兼容 MindNode/XMind）以及结构化 Markdown 复盘报告。
  * **上下文编译混合重排 (Hybrid Scoring)：** 亚毫秒级（<0.01ms）内存关键词特征提取与动态 1.1x~1.35x 相关度加权，200 节点 Benchmark 实测仅 0.71ms。
  * **生产构建代码分块 (Rollup manualChunks)：** 主应用入口体积从 6.48MB 降至 190kB，彻底消除大包告警，Oxlint 实现 0 警告 0 错误。

### Phase 5: 端侧全量向量检索与桌面原生分发 (演进中 🚀)
* **核心目标：** 引入 WebGPU 端侧向量嵌入模型与跨平台原生客户端打包。
* **交付清单：**
  * **端侧 WebGPU Embedding：** 引入 `@huggingface/transformers`，在浏览器端加载 `bge-small-zh-v1.5` 执行稠密向量检索。
  * **Tauri 2.0 桌面打包：** 输出 Windows / macOS / Linux 极小体积的原生桌面安装包。

---

## 3. 智能体驱动的研发与优化模式 (Agentic Iteration Model)

在推进 Phase 4 及后续性能优化时，项目采用 **主控智能体 + Gemini 3.8 Flash 子智能体集群** 协同模式：
1. **规划与规范对齐**：主智能体根据需求更新 `md/` 下的设计规范与验收标准。
2. **自定义子智能体并行施工**：通过 `define_subagent` 创建分别负责 `worker/算法`、`components/UI`、`store/db`、`tests/验证` 的子智能体，并在 `invoke_subagent` 中指定 `Model: 'flash'` 并发执行。
3. **自动化门禁合入**：由测试子智能体或主智能体统一运行 `npm test`、`npm run lint` 与 `npm run build`，确保零回归合入。
