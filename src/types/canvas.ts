// types/canvas.ts
// 核心数据结构规范 (TypeScript Schemas)

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
  position?: { x: number; y: number };
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

/**
 * 编译器结果与调试产物
 */
export interface CompilationResult {
  compiledPrompt: string;
  items: CompiledItem[];
  totalAllocatedTokens: number;
  executionDurationMs: number;
  xrayNodeStatus: Record<string, RenderGranularity>;
}

/**
 * 编译入参
 */
export interface CompileOptions {
  graph: CanvasGraph;
  activeNodeId: string;
  currentQuery: string;
  tokenBudget?: number;
  semanticWeights?: {
    hopDecay: number;
    categoryWeights: Record<NodeCategory, number>;
  };
}

export type LLMProviderId =
  | 'mock'
  | 'deepseek'
  | 'siliconflow'
  | 'openrouter'
  | 'ollama'
  | 'openai'
  | 'moonshot'
  | 'zhipu'
  | 'claude'
  | 'custom';

/**
 * LLM 服务配置
 */
export interface LLMSettings {
  provider: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  useProxy?: boolean;
}

