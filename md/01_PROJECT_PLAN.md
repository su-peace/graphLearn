# 项目规划与里程碑路线图 (Project Plan & Roadmap)

## 1. 项目定位与核心技术范式
本项目是一款面向复杂技术攻坚与系统化学习的 **AI 原生思维导图画布系统**。
系统全面转向 **全栈 TypeScript 本地优先（Local-First）架构**：
* 摆脱笨重的 Python 运行时与复杂的后端依赖，实现**纯浏览器静态加载即用（Zero-Install Web SPA）**。
* 上下文编译引擎（Context Compiler）与图拓扑算法在 **Web Worker** 中以亚毫秒级（<1ms）速度执行，保证主画布始终保持 **60 FPS** 丝滑响应。
* 可选通过 **Tauri 2.0 (Rust)** 封装为超轻量（<15MB 安装包、<80MB 内存占用）的跨平台原生桌面应用。

---

## 2. 研发路线与里程碑 (Milestones)

```
[Phase 0: TS 核心算法验证] ──> [Phase 1: 纯前端画布 MVP] ──> [Phase 2: 编译器与工作流] ──> [Phase 3: 端侧 RAG 与桌面化]
       (Week 1)                     (Week 2-3)                    (Week 4-5)                    (Week 6)
```

### Phase 0: 核心算法与端侧模型验证 (Week 1)
* **核心目标：** 验证浏览器端图拓扑算法、Web Worker 线程通信及端侧 Token 计数与向量嵌入可行性。
* **交付清单：**
  * `ContextCompilerTS` 单元测试与装箱基准测试（基于 Vitest）。
  * 引入 `@huggingface/transformers`，验证浏览器端通过 WebAssembly/WebGPU 加载 `bge-small-zh-v1.5`（~40MB）执行向量化。
  * 确立全栈统一的 TypeScript Schema，配置 `js-tiktoken` 实现浏览器端实时 Token 预算估算。

### Phase 1: 极简纯前端画布 MVP (Week 2 - Week 3)
* **核心目标：** 交付零门槛、点开即用、无需任何后端服务的 Web 端可视化原型。
* **交付清单：**
  * 基于 React Flow v12 (`@xyflow/react`) 搭建无限画布，支持缩放、平移与视口控制。
  * 集成 `@dagrejs/dagre` 算法，实现一键思维导图自动整齐排列。
  * 实现微缩胶囊节点（Capsule Node）与右侧滑出式 Markdown 阅读抽屉（含代码高亮）。
  * 纯前端通过 `fetch` + `ReadableStream` 对接云端 API（OpenAI / DeepSeek / Claude）或本地 Ollama (`http://localhost:11434`) 实现流式输出。

### Phase 2: 上下文编译器集成与沉浸式工作流 (Week 4 - Week 5)
* **核心目标：** 落地 Context Compiler 2.0，打通低摩擦交互与写后异步流水线。
* **交付清单：**
  * **划词即分支（Highlight-to-Branch）：** 在阅读抽屉划选长文关键词，浮动气泡一键触发派生子节点并启动流式回答。
  * **写后异步 Worker：** 节点输出完成后，触发轻量小模型异步提取结构化无损知识卡（`KnowledgeArtifact`：含 50 字结论 + 硬核不变量 + 函数签名）。
  * **状态机门控：** 支持节点标记为 🟢 `VERIFIED`（允许跨分支检索）与 🔴 `DEPRECATED`（转化为反向避坑约束）。
  * **X-Ray 实时光线追踪：** 聚焦输入框时，Web Worker 毫秒级返回入选节点，画布对应链路动态发光。

### Phase 3: 端侧 Scoped RAG、溯源交互与桌面分发 (Week 6)
* **核心目标：** 资料局部挂载、溯源角标跳转与生产级持久化发布。
* **交付清单：**
  * **端侧局部 RAG：** 拖入 PDF/Markdown 文件，纯前端解析分块并在浏览器向量化，连线绑定到特定节点生效。
  * **溯源跳转（Citation Navigation）：** 回复中的 `[Ref: node_id]` 解析为可交互 Pill 徽章，点击驱动视口平滑聚焦并触发呼吸灯。
  * **本地优先持久化：** 集成 `Dexie.js`（IndexedDB 封装），自动实时保存；支持导出 `.canvas.json` 与 Markdown 复盘报告。
  * **Tauri 2.0 桌面打包：** 输出 Windows / macOS / Linux 极小体积的原生桌面安装包。