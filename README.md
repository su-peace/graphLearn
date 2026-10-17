# GraphLearn - AI 原生思维导图画布系统 (Local-First Mind Map Canvas)

一款面向复杂技术攻坚与系统化学习的 **AI 原生思维导图画布系统**。系统采用 **全栈 TypeScript 本地优先（Local-First）架构**，具备浏览器静态加载即用（Zero-Install Web SPA）、亚毫秒级 Web Worker 上下文编译器及认知证据阶梯（Epistemic Hierarchy）案卷生成能力。

---

## 🌟 核心特性与技术架构

### 1. 纯前端本地优先与多会话存储（Local-First Multi-Session）
- **多会话无缝切换与管理**：支持创建多个独立思维导图画布会话（空白画布、Linux 虚拟内存实战、高并发 RPC 框架模板等），各会话状态完全隔离。
- **Dexie.js (IndexedDB) 毫秒级持久化**：拓扑结构、节点案卷及流式文本实时落库，意外刷新或断电不丢数据；自动记录最后活跃会话。
- **完整的会话生命周期**：支持会话创建、切换、重命名、一键克隆副本、删除以及搜索过滤。
- 支持单个或多个会话导入/导出 `.canvas.json` 与生成 Markdown 技术复盘报告。


### 2. 认知证据阶梯案卷规范 (Epistemic Hierarchy Prompt Spec)
彻底告别传统伪造的多轮聊天流，通过 `ContextCompilerTS` 生成单轮文档化案卷：
- **Tier 1 - 绝对权威**：`<tier1_authoritative_sources>` 包含手动 Pin 置顶节点与外部挂载的资料切片。
- **Tier 2 - 脉络共识**：`<tier2_canvas_context>` 记录祖先链路共识、已确认硬核不变量与函数签名。
- **反向红线约束**：`<negative_constraints>` 将标记为 🔴 `DEPRECATED`（已证伪）的节点转化为严格避坑警示。
- **主干目标防稀释**：`<root_goal>` 强行锁定根节点大目标，防止多轮深层追问导致语义漂移（满足 TC-01）。

### 3. Web Worker 亚毫秒级上下文编译引擎
- 图拓扑遍历、多父节点 DAG 汇聚、多维加权打分及 Token 装箱算法全部移至 **Web Worker**。
- **200 个节点复杂拓扑编译耗时仅 0.52ms**（实测远低于 5ms 硬约束），画布主线程稳定保持 **60 FPS**。

### 4. 沉浸式双模态交互与流式体验
- **宏观态微缩胶囊 (Capsule Node)**：固定 `240px × 76px`，展示分类标签、状态边框（⚪ `EXPLORING` / 🟢 `VERIFIED` / 🔴 `DEPRECATED`）与 50 字结论。
- **微观态阅读抽屉 (Reading Drawer)**：`42vw` 宽度平滑滑出，呈现完整 Markdown、代码高亮与公式。
- **划词即分支 (Highlight-to-Branch)**：划选文本弹出气泡菜单（`[🌱 追问此概念]`、`[💡 举例]`、`[✏️ 自定义]`），一键生成子节点并开启流式推演。
- **X-Ray 实时光线追踪**：聚焦输入框时，Web Worker 毫秒级计算入选链路，画布节点与连线呈现实线流光/虚线弱光/半透明虚化。
- **溯源角标跳转 (Citation Navigation)**：回复中的 `[Ref: node_id]` 渲染为交互徽章，点击平滑对焦居中并触发 2 秒蓝色脉冲呼吸灯。
- **写后异步流水线**：流式生成结束后，异步提取结构化无损知识卡（`KnowledgeArtifact`：含 50 字结论 + 宏定义/不变量 + 函数签名）。
- **Dagre 自动布局**：一键执行 `@dagrejs/dagre` 自动生成分层对齐思维导图。

---

## 🛠️ 技术栈清单

- **语言与构建**：TypeScript 5.x + Vite 8.x + Tailwind CSS v4
- **画布引擎**：React Flow v12 (`@xyflow/react`)
- **图布局引擎**：`@dagrejs/dagre`
- **并发与算法**：Web Worker API + `js-tiktoken` (cl100k_base)
- **本地存储**：`zustand` + `dexie` (IndexedDB)
- **模型支持**：纯前端 Fetch + ReadableStream（内置本地高保真模拟引擎，支持 OpenAI、DeepSeek、Ollama 等）
- **单元测试与基准**：Vitest

---

## 🚀 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务 (支持 HMR)
npm run dev

# 3. 执行测试用例与基准性能测试
npm test

# 4. 构建生产产物
npm run build
```

---

## 📋 验收用例对照 (Acceptance Verification)

| 用例 ID | 测试场景 | 实现方案 | 自动化测试状态 |
| :---: | :--- | :--- | :---: |
| **TC-01** | 主干目标防稀释验证 | `<root_goal>` 独立容器锁定，无论分支追问深度均不漂移 | ✅ Passed (`npm test`) |
| **TC-02** | 划词即分支零阻力交互 | `FloatingBubbleMenu` + `highlightToBranch` 自动拉线启动流式 | ✅ Implemented |
| **TC-03** | 草稿态隔离与证伪避坑 | 旁系 `exploring` 节点彻底隔离，`deprecated` 注入 `<negative_constraints>` | ✅ Passed (`npm test`) |
| **TC-04** | 外部挂载资料绝对服从 | `ReferenceChunk` 挂载至节点并以 Tier 1 权威最高优先级注入 | ✅ Passed (`npm test`) |
| **TC-05** | 引用角标视口精准对焦 | `CitationPill` 驱动 React Flow `setCenter` 600ms 平滑居中 + 2s 脉冲 | ✅ Implemented |
| **TC-06** | 多父节点汇聚融合 (Merge) | DAG 多父节点拓扑溯源，合并注入 `<tier2_canvas_context>` | ✅ Passed (`npm test`) |
