# 工程架构与技术要求规范 (Engineering Requirements)

## 1. 技术栈选型规范 (All-in-TypeScript)

| 层级 / 模块 | 推荐选型 | 选型优势与工程边界 |
| :--- | :--- | :--- |
| **基础语言与构建** | **TypeScript 5.x + Vite 5.x** | 全栈类型安全，毫秒级 HMR，构建产物轻量。 |
| **UI 视图框架** | **React 18/19 + Tailwind CSS** | 声明式组件开发，成熟的高性能生态体系。 |
| **节点图画布引擎** | **@xyflow/react (React Flow v12)** | Web 端图渲染行业标准，原生支持自定义 HTML 节点与视口变换。 |
| **图布局排版** | **@dagrejs/dagre** | 轻量级纯 JS 布局引擎，零配置实现思维导图分层对齐。 |
| **端侧计算与并发** | **Web Worker API** | 图遍历算法、装箱计算、向量余弦检索全部移出主线程，杜绝 UI 掉帧。 |
| **端侧向量与 Token** | **@huggingface/transformers + js-tiktoken** | 浏览器端原生运行 Embedding 模型与 Token 计数，零服务器成本。 |
| **本地状态与持久化**| **Zustand + Dexie.js (IndexedDB)** | 本地优先（Local-First），离线可用，毫秒级读写。 |
| **可选桌面端外壳** | **Tauri 2.0 (Rust)** | 安装包 <15MB，内存开销远低于 Electron，安全调用本地文件系统。 |

---

## 2. 核心数据结构规范 (TypeScript Schemas)

全系统统一使用同一套 TypeScript 类型模型，杜绝前后端接口序列化断层：

```typescript
// types/canvas.ts

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
  embedding?: Float32Array;
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
  embedding?: Float32Array;
  mountedChunks?: ReferenceChunk[];
  fullTokens: number;
  artifactTokens: number;
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
   * **Context Compiler 编译耗时：** 在 Web Worker 中执行拓扑回溯、多维加权打分与装箱算法，耗时必须小于 **5ms**。
   * **防抖预览延迟：** 用户光标聚焦在提问框触发 X-Ray 预览时，端到端高亮反馈延迟小于 **50ms**。
3. **内存与包体体积限制：**
   * 浏览器 Web 产物 Gzip 压缩后总包体体积控制在 **2.5MB 以内**（不含本地离线缓存的 Embedding 模型权重）。
   * 离线 Embedding 模型使用 ONNX 格式存储于 CacheStorage，内存占用控制在 **120MB 以内**。