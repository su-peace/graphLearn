# 工程架构与技术要求规范 (Engineering Requirements)

## 1. 技术栈选型规范 (All-in-TypeScript)

| 层级 / 模块 | 选型标准 | 选型优势与工程边界 |
| :--- | :--- | :--- |
| **基础语言与构建** | **TypeScript 5.x + Vite 8.x** | 全栈类型安全，毫秒级 HMR，构建产物轻量。 |
| **UI 视图框架** | **React 19 + Tailwind CSS v4** | 声明式组件开发，结合 CSS 变量实现「触感工坊与精密光学」明暗双主题。 |
| **节点图画布引擎** | **@xyflow/react (React Flow v12)** | Web 端图渲染行业标准，原生支持自定义 HTML 节点、自定义可交互边与视口变换。 |
| **图布局与拓扑校验** | **@dagrejs/dagre + graphTopology.ts** | 轻量级分层自动排版 + 自研 BFS 有向无环图（DAG）防环检测与多父节点拓扑管理。 |
| **端侧计算与并发** | **Web Worker API** | 图遍历算法、多维衰减打分、背包 Token 装箱全部移出主线程，杜绝 UI 掉帧。 |
| **Token 计数与向量** | **js-tiktoken (cl100k_base)** | 浏览器端原生运行 Token 预算精准估算（后续可扩展 `@huggingface/transformers` 向量化）。 |
| **本地状态与持久化**| **Zustand + Dexie.js (IndexedDB)** | 本地优先（Local-First），多会话隔离，400ms 防抖落库与强制 Flush 保护。 |
| **代码检查与单元测试**| **Oxlint + Vitest** | 极速静态代码检查（`.oxlintrc.json`）与全套自动化验收测试（`tests/*.test.ts`）。 |

---

## 2. 核心数据结构规范 (TypeScript Schemas)

全系统统一使用同一套 TypeScript 类型模型（定义于 [src/types/canvas.ts](../src/types/canvas.ts)），杜绝序列化断层：

```typescript
// src/types/canvas.ts

export type NodeCategory = 
  | 'root_goal'         // 根节点大问题
  | 'core_conclusion'   // 主干核心推演 / 分支合并结论
  | 'code_impl'         // 代码与技术实现
  | 'concept_qa'        // 名词解释 / 支线追问
  | 'chitchat_debug';   // 闲聊 / 纠错 / 格式微调

export type ManualState = 'auto' | 'pinned' | 'ignored';
export type EpistemicStatus = 'exploring' | 'verified' | 'deprecated';
export type RenderGranularity = 'full' | 'artifact' | 'negative_warn' | 'dropped';

/**
 * 结构化无损知识卡：解决纯文本摘要丢失代码签名和数学边界的问题
 */
export interface KnowledgeArtifact {
  title: string;                  // 10 字以内节点短标题
  category: NodeCategory;
  coreTakeaway: string;           // 50 字以内核心结论
  hardInvariants: string[];       // 宏定义、标志位、约束、边界条件
  codeSignatures: string[];       // 函数签名、结构体头定义
}

/**
 * 挂载到节点的外部资料切片
 */
export interface ReferenceChunk {
  chunkId: string;
  sourceTitle: string;
  content: string;
  embedding?: number[];
  tokens: number;
}

/**
 * 画布核心节点实体
 */
export interface CanvasNodeData {
  id: string;
  title: string;
  parentIds: string[];            // 支持多父节点 DAG 汇聚融合
  userQuery: string;
  aiResponse: string;
  artifact?: KnowledgeArtifact;
  category: NodeCategory;
  manualState: ManualState;
  status: EpistemicStatus;
  embedding?: number[];
  mountedChunks?: ReferenceChunk[];
  fullTokens: number;
  artifactTokens: number;
  position: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
  isStreaming?: boolean;
}

/**
 * 编译完成后的单项投递产物
 */
export interface CompiledItem {
  nodeId: string;
  score: number;
  hopDistance: number | null;
  granularity: RenderGranularity;
  allocatedTokens: number;
}

/**
 * 整张图谱实体
 */
export interface CanvasGraph {
  graphId: string;
  title: string;
  rootNodeId: string;
  nodes: Record<string, CanvasNodeData>;
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}
```

---

## 3. 非功能性指标与性能约束 (NFRs)

1. **渲染帧率与节点吞吐：**
   * 画布在存在 **200 个节点**、**300 条连线**的复杂拓扑下，拖拽平移与缩放必须稳定保持在 **55~60 FPS**。
   * 画布卡片仅作为微缩胶囊渲染，超长文本由阅读抽屉异步挂载，杜绝巨型 DOM 树阻塞渲染流水线。
2. **算法延迟硬约束：**
   * **Context Compiler 编译耗时：** 在 Web Worker 中执行拓扑回溯、多维加权打分与装箱算法，耗时必须小于 **5ms**（实测 200 节点约 `0.505ms`）。
   * **防抖预览延迟：** 用户光标聚焦在提问框触发 X-Ray 预览时，端到端高亮反馈延迟小于 **50ms**。
3. **内存与包体体积限制：**
   * 浏览器 Web 产物 Gzip 压缩后总包体体积控制在 **2.5MB 以内**（不含本地离线缓存的 Embedding 模型权重）。

---

## 4. 多智能体并发工程规范 (Subagent Engineering Guidelines)

当使用 **Gemini 3.8 Flash**（`Model: 'flash'`）及自定义子智能体（`define_subagent` / `invoke_subagent`）对本项目进行并行优化与编码时，必须遵守以下工程准则：

1. **契约先行（Schema-First）**：
   * 跨模块功能开发前，必须先确定 `src/types/canvas.ts` 中的接口定义，禁止各子智能体私自使用 `any` 或在组件内定义冲突的局部类型。
2. **读写作用域隔离（Write-Scope Isolation）**：
   * 并发运行的写权限子智能体必须严格遵循主智能体分配的文件边界（例如将 `src/worker/`、`src/components/`、`src/store/` 拆分为独立子任务），防止文件覆盖。
3. **纯函数与可测试性**：
   * 核心拓扑算法（`graphTopology.ts`）、编译算法（`contextCompiler.ts`）与知识卡提取（`artifactExtractor.ts`）必须保持纯函数无副作用设计，以便子智能体通过 Vitest 在毫秒级完成单元测试验证。
4. **零警告质量门禁**：
   * 子智能体完成代码编写后，必须通过 `npm test`、`npm run lint`（Oxlint）与 `npm run build` 三重门禁校验。
