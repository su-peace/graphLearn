// store/canvasStore.ts
import { create } from 'zustand';
import type {
  CanvasGraph,
  CanvasNodeData,
  EpistemicStatus,
  LLMSettings,
  ManualState,
  NodeCategory,
  ReferenceChunk,
  RenderGranularity,
} from '../types/canvas';
import { INITIAL_DEMO_GRAPH, RPC_DEMO_GRAPH, createBlankGraph } from '../data/demoGraph';
import { calculateDagreLayout } from '../services/graphLayout';
import { compilerClient } from '../worker/workerClient';
import { streamLLMResponse } from '../services/llmService';
import { extractArtifactFromContent } from '../services/artifactExtractor';
import { estimateTokens, estimateTokensFast } from '../services/tokenEstimator';
import {
  loadGraphFromDB,
  loadLatestGraph,
  loadLastActiveSessionId,
  loadSettingsFromDB,
  saveGraphToDB,
  saveGraphToDBDebounced,
  saveLastActiveSessionId,
  saveSettingsToDB,
  listAllSessions,
  deleteGraphFromDB,
  type SessionMeta,
} from '../db/database';

interface CanvasState {
  graph: CanvasGraph;
  activeNodeId: string | null;
  sessions: SessionMeta[];
  isSessionManagerOpen: boolean;
  isDrawerOpen: boolean;
  isStreaming: boolean;
  streamingNodeId: string | null;
  streamingText: string;
  isXrayActive: boolean;
  xrayStatus: Record<string, RenderGranularity>;
  compiledPrompt: string;
  compiledDurationMs: number;
  highlightedNodeId: string | null;
  isSettingsOpen: boolean;
  isInspectorOpen: boolean;
  llmSettings: LLMSettings;
  toastMessage: string | null;
  theme: 'light' | 'dark';
  layoutVersion: number;
  isCreateNodeOpen: boolean;
  createNodeParentId: string | null;

  // Actions
  init: () => Promise<void>;
  setToastMessage: (msg: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  openCreateNodeModal: (parentId?: string | null) => void;
  closeCreateNodeModal: () => void;

  selectNode: (nodeId: string | null) => void;
  closeDrawer: () => void;
  openDrawer: (nodeId: string) => void;
  updateNodeData: (
    nodeId: string,
    patch: Partial<CanvasNodeData>,
    persistMode?: 'immediate' | 'debounced' | 'none'
  ) => void;
  setNodeStatus: (nodeId: string, status: EpistemicStatus) => void;
  setNodeManualState: (nodeId: string, manualState: ManualState) => void;
  setNodeCategory: (nodeId: string, category: NodeCategory) => void;
  addNode: (params: {
    title?: string;
    parentIds: string[];
    userQuery: string;
    category?: NodeCategory;
    autoTriggerStream?: boolean;
  }) => Promise<string>;
  connectNodes: (sourceId: string, targetId: string) => void;
  deleteNode: (nodeId: string) => void;
  nodeToDeleteId: string | null;
  setNodeToDeleteId: (id: string | null) => void;
  deleteNodeWithOptions: (
    nodeId: string,
    strategy: 'reparent' | 'cascade' | 'isolate'
  ) => Promise<void>;

  mountReferenceChunk: (nodeId: string, chunk: ReferenceChunk) => void;

  removeReferenceChunk: (nodeId: string, chunkId: string) => void;
  triggerXrayPreview: (query?: string) => Promise<void>;
  clearXrayPreview: () => void;
  autoLayout: () => void;
  highlightToBranch: (
    parentNodeId: string,
    keyword: string,
    promptType: 'concept' | 'example' | 'custom',
    customPrompt?: string
  ) => Promise<void>;
  triggerCitationFocus: (nodeId: string) => void;
  runStreamForNode: (nodeId: string, queryOverride?: string) => Promise<void>;
  setIsSettingsOpen: (open: boolean) => void;
  setIsInspectorOpen: (open: boolean) => void;
  setIsSessionManagerOpen: (open: boolean) => void;
  updateSettings: (settings: Partial<LLMSettings>) => void;
  resetToDemo: () => void;
  exportGraphJson: () => string;
  importGraphJson: (json: string) => boolean;
  exportMarkdownReport: () => string;

  // Multi-session management actions
  refreshSessionList: () => Promise<void>;
  switchSession: (graphId: string) => Promise<void>;
  createNewSession: (
    title?: string,
    templateType?: 'blank' | 'linux_vm' | 'rpc_concurrency'
  ) => Promise<string>;
  renameSession: (graphId: string, newTitle: string) => Promise<void>;
  duplicateSession: (graphId: string) => Promise<string>;
  deleteSession: (graphId: string) => Promise<void>;
}

const DEFAULT_SETTINGS: LLMSettings = {
  provider: 'mock',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
  temperature: 0.3,
  maxTokens: 2048,
  useProxy: true,
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  graph: INITIAL_DEMO_GRAPH,
  activeNodeId: 'node_page_fault',
  sessions: [],
  isSessionManagerOpen: false,
  isDrawerOpen: false,
  isStreaming: false,
  streamingNodeId: null,
  streamingText: '',
  isXrayActive: false,
  xrayStatus: {},
  compiledPrompt: '',
  compiledDurationMs: 0,
  highlightedNodeId: null,
  isSettingsOpen: false,
  isInspectorOpen: false,
  llmSettings: DEFAULT_SETTINGS,
  toastMessage: null,
  nodeToDeleteId: null,
  layoutVersion: 0,
  isCreateNodeOpen: false,
  createNodeParentId: null,
  theme: (typeof window !== 'undefined' && (localStorage.getItem('gl_theme') as 'light' | 'dark')) || 'dark',

  openCreateNodeModal: (parentId?: string | null) =>
    set({ isCreateNodeOpen: true, createNodeParentId: parentId ?? null }),

  closeCreateNodeModal: () =>
    set({ isCreateNodeOpen: false, createNodeParentId: null }),

  setTheme: (t: 'light' | 'dark') => {
    localStorage.setItem('gl_theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: t });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setNodeToDeleteId: (id: string | null) => set({ nodeToDeleteId: id }),

  setToastMessage: (msg: string | null) => {

    set({ toastMessage: msg });
    if (msg) {
      setTimeout(() => {
        if (get().toastMessage === msg) {
          set({ toastMessage: null });
        }
      }, 5000);
    }
  },

  init: async () => {
    // 同步明暗主题 class
    const initialTheme = get().theme;
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      const savedSettings = await loadSettingsFromDB();
      if (savedSettings && savedSettings.apiKey) {
        set({ llmSettings: savedSettings });
      } else {
        set({ llmSettings: DEFAULT_SETTINGS });
        await saveSettingsToDB(DEFAULT_SETTINGS);
      }


      // 确保初始预置演示会话写入数据库（首次加载）
      const existingSessions = await listAllSessions();
      if (existingSessions.length === 0) {
        await saveGraphToDB(INITIAL_DEMO_GRAPH);
        await saveGraphToDB(RPC_DEMO_GRAPH);
      }

      // 读取最后活跃的会话
      const lastActiveId = await loadLastActiveSessionId();
      let activeGraph: CanvasGraph | undefined;

      if (lastActiveId) {
        activeGraph = await loadGraphFromDB(lastActiveId);
      }
      if (!activeGraph) {
        activeGraph = await loadLatestGraph();
      }

      if (activeGraph && Object.keys(activeGraph.nodes || {}).length > 0) {
        set({
          graph: activeGraph,
          activeNodeId: activeGraph.rootNodeId,
        });
      } else {
        set({
          graph: INITIAL_DEMO_GRAPH,
          activeNodeId: INITIAL_DEMO_GRAPH.rootNodeId,
        });
      }

      await get().refreshSessionList();
    } catch (e) {
      console.error('[Store] Init failed:', e);
    }
  },

  refreshSessionList: async () => {
    try {
      const list = await listAllSessions();
      set({ sessions: list });
    } catch (e) {
      console.error('[Store] refreshSessionList failed:', e);
    }
  },

  switchSession: async (graphId: string) => {
    const { graph, isStreaming } = get();
    if (isStreaming) {
      alert('当前正在流式推演中，请等待生成完毕后再切换会话。');
      return;
    }

    if (graph.graphId === graphId) {
      set({ isSessionManagerOpen: false });
      return;
    }

    // 先保存当前会话
    await saveGraphToDB(graph);

    const targetGraph = await loadGraphFromDB(graphId);
    if (!targetGraph) {
      alert('未找到该会话数据！');
      return;
    }

    await saveLastActiveSessionId(graphId);

    set({
      graph: targetGraph,
      activeNodeId: targetGraph.rootNodeId,
      isDrawerOpen: false,
      isXrayActive: false,
      xrayStatus: {},
      isSessionManagerOpen: false,
    });

    await get().refreshSessionList();
  },

  createNewSession: async (title, templateType = 'blank') => {
    const { graph } = get();
    // 保存当前会话
    await saveGraphToDB(graph);

    let newGraph: CanvasGraph;
    if (templateType === 'linux_vm') {
      newGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
      newGraph.graphId = `graph_vm_${Date.now()}`;
      newGraph.title = title || 'Linux 虚拟内存实战';
      newGraph.createdAt = Date.now();
      newGraph.updatedAt = Date.now();
    } else if (templateType === 'rpc_concurrency') {
      newGraph = JSON.parse(JSON.stringify(RPC_DEMO_GRAPH));
      newGraph.graphId = `graph_rpc_${Date.now()}`;
      newGraph.title = title || '高并发 RPC 框架推演';
      newGraph.createdAt = Date.now();
      newGraph.updatedAt = Date.now();
    } else {
      newGraph = createBlankGraph(
        title || '新探索图谱',
        '针对复杂系统的架构设计、核心边界与关键实现展开推演'
      );
    }

    await saveGraphToDB(newGraph);
    await saveLastActiveSessionId(newGraph.graphId);

    set({
      graph: newGraph,
      activeNodeId: newGraph.rootNodeId,
      isDrawerOpen: false,
      isXrayActive: false,
      xrayStatus: {},
      isSessionManagerOpen: false,
    });

    await get().refreshSessionList();
    return newGraph.graphId;
  },

  renameSession: async (graphId: string, newTitle: string) => {
    const { graph } = get();
    if (!newTitle.trim()) return;

    if (graph.graphId === graphId) {
      const updatedGraph = { ...graph, title: newTitle.trim(), updatedAt: Date.now() };
      set({ graph: updatedGraph });
      await saveGraphToDB(updatedGraph);
    } else {
      const target = await loadGraphFromDB(graphId);
      if (target) {
        target.title = newTitle.trim();
        target.updatedAt = Date.now();
        await saveGraphToDB(target);
      }
    }

    await get().refreshSessionList();
  },

  duplicateSession: async (graphId: string) => {
    const target = await loadGraphFromDB(graphId);
    if (!target) return '';

    const clonedGraph: CanvasGraph = JSON.parse(JSON.stringify(target));
    clonedGraph.graphId = `graph_copy_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    clonedGraph.title = `${target.title} (副本)`;
    clonedGraph.createdAt = Date.now();
    clonedGraph.updatedAt = Date.now();

    await saveGraphToDB(clonedGraph);
    await get().refreshSessionList();
    return clonedGraph.graphId;
  },

  deleteSession: async (graphId: string) => {
    const { graph, sessions } = get();
    if (sessions.length <= 1) {
      alert('至少需要保留一个会话！');
      return;
    }

    await deleteGraphFromDB(graphId);

    // 如果删除的是当前会话，自动切换到下一个可用会话
    if (graph.graphId === graphId) {
      const remaining = sessions.filter((s) => s.graphId !== graphId);
      if (remaining.length > 0) {
        await get().switchSession(remaining[0].graphId);
      }
    }

    await get().refreshSessionList();
  },

  selectNode: (nodeId: string | null) => {
    set({
      activeNodeId: nodeId,
      isDrawerOpen: Boolean(nodeId),
    });
  },

  closeDrawer: () => {
    set({ isDrawerOpen: false });
  },

  openDrawer: (nodeId: string) => {
    set({
      activeNodeId: nodeId,
      isDrawerOpen: true,
    });
  },

  updateNodeData: (
    nodeId: string,
    patch: Partial<CanvasNodeData>,
    persistMode: 'immediate' | 'debounced' | 'none' = 'debounced'
  ) => {
    const { graph } = get();
    const node = graph.nodes[nodeId];
    if (!node) return;

    const updatedNode: CanvasNodeData = {
      ...node,
      ...patch,
      fullTokens:
        patch.aiResponse !== undefined
          ? estimateTokensFast(patch.aiResponse)
          : node.fullTokens,
    };

    const updatedGraph: CanvasGraph = {
      ...graph,
      updatedAt: Date.now(),
      nodes: {
        ...graph.nodes,
        [nodeId]: updatedNode,
      },
    };

    set({ graph: updatedGraph });
    if (persistMode === 'immediate') {
      saveGraphToDB(updatedGraph);
    } else if (persistMode === 'debounced') {
      saveGraphToDBDebounced(updatedGraph, 400);
    }
  },

  setNodeStatus: (nodeId: string, status: EpistemicStatus) => {
    get().updateNodeData(nodeId, { status }, 'immediate');
  },

  setNodeManualState: (nodeId: string, manualState: ManualState) => {
    get().updateNodeData(nodeId, { manualState }, 'immediate');
  },

  setNodeCategory: (nodeId: string, category: NodeCategory) => {
    get().updateNodeData(nodeId, { category }, 'immediate');
  },

  addNode: async (params) => {
    const { graph } = get();
    const id = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const category = params.category || 'concept_qa';
    const title = params.title || params.userQuery.slice(0, 10) || '新探索节点';

    // 计算放置坐标（在首个父节点右方）
    let posX = 400;
    let posY = 200;
    const parentId = params.parentIds[0];
    if (parentId && graph.nodes[parentId]?.position) {
      const p = graph.nodes[parentId].position!;
      posX = p.x + 320;
      posY = p.y + (Math.random() * 80 - 40);
    }

    const newNode: CanvasNodeData = {
      id,
      title,
      parentIds: params.parentIds,
      userQuery: params.userQuery,
      aiResponse: '',
      category,
      manualState: 'auto',
      status: 'exploring',
      fullTokens: 0,
      artifactTokens: 20,
      position: { x: posX, y: posY },
      artifact: {
        title,
        category,
        coreTakeaway: '正在推演生成中...',
        hardInvariants: [],
        codeSignatures: [],
      },
    };

    const updatedGraph: CanvasGraph = {
      ...graph,
      updatedAt: Date.now(),
      nodes: {
        ...graph.nodes,
        [id]: newNode,
      },
    };

    set({
      graph: updatedGraph,
      activeNodeId: id,
      isDrawerOpen: true,
    });

    saveGraphToDB(updatedGraph);

    if (params.autoTriggerStream) {
      setTimeout(() => {
        get().runStreamForNode(id, params.userQuery);
      }, 50);
    }

    return id;
  },

  connectNodes: (sourceId: string, targetId: string) => {
    const { graph } = get();
    const targetNode = graph.nodes[targetId];
    if (!targetNode || sourceId === targetId) return;

    if (targetNode.parentIds.includes(sourceId)) return;

    const updatedParentIds = [...targetNode.parentIds, sourceId];
    get().updateNodeData(targetId, { parentIds: updatedParentIds });
  },

  deleteNode: (nodeId: string) => {
    const { graph } = get();
    if (nodeId === graph.rootNodeId) {
      alert('根节点为思维导图的主干大目标，不可删除！');
      return;
    }
    const children = Object.values(graph.nodes).filter((n) => n.parentIds?.includes(nodeId));
    if (children.length > 0) {
      set({ nodeToDeleteId: nodeId });
    } else {
      get().deleteNodeWithOptions(nodeId, 'isolate');
    }
  },

  deleteNodeWithOptions: async (nodeId, strategy) => {
    const { graph, activeNodeId } = get();
    if (nodeId === graph.rootNodeId) {
      alert('根节点不可删除！');
      return;
    }

    const targetNode = graph.nodes[nodeId];
    if (!targetNode) return;

    const parents = targetNode.parentIds || [];
    const fallbackParent = parents.length > 0 ? parents : [graph.rootNodeId];

    const newNodes = { ...graph.nodes };

    if (strategy === 'cascade') {
      // 级联删除全部子孙节点
      const toDelete = new Set<string>([nodeId]);
      const queue = [nodeId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const n of Object.values(newNodes)) {
          if (n.parentIds?.includes(curr) && !toDelete.has(n.id)) {
            toDelete.add(n.id);
            queue.push(n.id);
          }
        }
      }
      for (const id of toDelete) {
        delete newNodes[id];
      }
      for (const id of Object.keys(newNodes)) {
        newNodes[id] = {
          ...newNodes[id],
          parentIds: (newNodes[id].parentIds || []).filter((p) => !toDelete.has(p)),
        };
      }
    } else if (strategy === 'reparent') {
      // 保留子节点并提升连接至当前节点的父节点
      delete newNodes[nodeId];
      for (const id of Object.keys(newNodes)) {
        if (newNodes[id].parentIds?.includes(nodeId)) {
          const filtered = newNodes[id].parentIds.filter((p) => p !== nodeId);
          const merged = Array.from(new Set([...filtered, ...fallbackParent]));
          newNodes[id] = {
            ...newNodes[id],
            parentIds: merged,
          };
        }
      }
    } else {
      // isolate: 仅删除当前节点，子节点保持孤立
      delete newNodes[nodeId];
      for (const id of Object.keys(newNodes)) {
        if (newNodes[id].parentIds?.includes(nodeId)) {
          newNodes[id] = {
            ...newNodes[id],
            parentIds: newNodes[id].parentIds.filter((p) => p !== nodeId),
          };
        }
      }
    }

    const updatedGraph: CanvasGraph = {
      ...graph,
      updatedAt: Date.now(),
      nodes: newNodes,
    };

    set({
      graph: updatedGraph,
      activeNodeId: newNodes[activeNodeId || ''] ? activeNodeId : graph.rootNodeId,
      nodeToDeleteId: null,
    });

    saveGraphToDB(updatedGraph);
  },


  mountReferenceChunk: (nodeId: string, chunk: ReferenceChunk) => {
    const { graph } = get();
    const node = graph.nodes[nodeId];
    if (!node) return;

    const mounted = [...(node.mountedChunks || []), chunk];
    get().updateNodeData(nodeId, { mountedChunks: mounted });
  },

  removeReferenceChunk: (nodeId: string, chunkId: string) => {
    const { graph } = get();
    const node = graph.nodes[nodeId];
    if (!node) return;

    const mounted = (node.mountedChunks || []).filter((c) => c.chunkId !== chunkId);
    get().updateNodeData(nodeId, { mountedChunks: mounted });
  },

  triggerXrayPreview: async (query?: string) => {
    const { graph, activeNodeId } = get();
    if (!activeNodeId) return;

    const currentQuery = query || graph.nodes[activeNodeId]?.userQuery || '';

    try {
      const result = await compilerClient.compile({
        graph,
        activeNodeId,
        currentQuery,
      });

      set({
        isXrayActive: true,
        xrayStatus: result.xrayNodeStatus,
        compiledPrompt: result.compiledPrompt,
        compiledDurationMs: result.executionDurationMs,
      });
    } catch (e) {
      console.error('[Store] X-Ray preview failed:', e);
    }
  },

  clearXrayPreview: () => {
    set({
      isXrayActive: false,
      xrayStatus: {},
    });
  },

  autoLayout: () => {
    const { graph } = get();
    const positions = calculateDagreLayout(graph.nodes, {
      direction: 'LR',
      nodeWidth: 260,
      nodeHeight: 90,
      nodeSep: 60,
      rankSep: 110,
    });

    const updatedNodes = { ...graph.nodes };
    for (const [id, pos] of Object.entries(positions)) {
      if (updatedNodes[id]) {
        updatedNodes[id] = {
          ...updatedNodes[id],
          position: pos,
        };
      }
    }

    const updatedGraph = {
      ...graph,
      nodes: updatedNodes,
      updatedAt: Date.now(),
    };

    set((state) => ({
      graph: updatedGraph,
      layoutVersion: state.layoutVersion + 1,
    }));
    saveGraphToDB(updatedGraph);
  },

  highlightToBranch: async (parentNodeId, keyword, promptType, customPrompt) => {
    let query = `请详细解释概念「${keyword}」的机理与实现`;
    let title = keyword.slice(0, 10);

    if (promptType === 'example') {
      query = `请给出关于「${keyword}」的具体代码示例与生产实践场景`;
      title = `${keyword.slice(0, 7)}示例`;
    } else if (promptType === 'custom' && customPrompt) {
      query = customPrompt;
      title = keyword.slice(0, 10);
    }

    await get().addNode({
      title,
      parentIds: [parentNodeId],
      userQuery: query,
      category: 'concept_qa',
      autoTriggerStream: true,
    });
  },

  triggerCitationFocus: (nodeId: string) => {
    set({ highlightedNodeId: nodeId });
    setTimeout(() => {
      set((s) => (s.highlightedNodeId === nodeId ? { highlightedNodeId: null } : {}));
    }, 2200);
  },

  runStreamForNode: async (nodeId: string, queryOverride?: string) => {
    const { graph, llmSettings } = get();
    const node = graph.nodes[nodeId];
    if (!node) return;

    const query = queryOverride || node.userQuery;

    // 1. 编译案卷
    const compileRes = await compilerClient.compile({
      graph,
      activeNodeId: nodeId,
      currentQuery: query,
    });

    set({
      isStreaming: true,
      streamingNodeId: nodeId,
      streamingText: '',
      compiledPrompt: compileRes.compiledPrompt,
      compiledDurationMs: compileRes.executionDurationMs,
      xrayStatus: compileRes.xrayNodeStatus,
      isXrayActive: true,
    });

    let currentResponse = '';
    let lastRenderTime = 0;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      await streamLLMResponse(
        compileRes.compiledPrompt,
        llmSettings,
        {
          onChunk: (delta) => {
            currentResponse += delta;
            const now = performance.now();
            // 节流合并 UI 渲染，至少间隔 35ms 派发一次，极大降低 React 重绘开销，同时消除高频 DB 写入
            if (now - lastRenderTime > 35) {
              lastRenderTime = now;
              set({ streamingText: currentResponse });
            } else if (!throttleTimer) {
              throttleTimer = setTimeout(() => {
                throttleTimer = null;
                lastRenderTime = performance.now();
                set({ streamingText: currentResponse });
              }, 35);
            }
          },
          onFinish: (full) => {
            if (throttleTimer) {
              clearTimeout(throttleTimer);
              throttleTimer = null;
            }

            // 写后异步流水线：抽取无损知识卡
            const artifact = extractArtifactFromContent({
              title: node.title,
              category: node.category,
              userQuery: query,
              aiResponse: full,
            });

            // 一次性更新节点数据并立即持久化落库
            get().updateNodeData(
              nodeId,
              {
                aiResponse: full,
                artifact,
                status: node.status === 'deprecated' ? 'deprecated' : 'verified',
                artifactTokens: estimateTokens(
                  `${artifact.coreTakeaway} ${artifact.hardInvariants.join(' ')} ${artifact.codeSignatures.join(' ')}`
                ),
              },
              'immediate'
            );

            set({
              isStreaming: false,
              streamingNodeId: null,
              streamingText: '',
              isXrayActive: false,
            });
          },
          onError: (err) => {
            if (throttleTimer) {
              clearTimeout(throttleTimer);
              throttleTimer = null;
            }
            const errMsg = err instanceof Error ? err.message : String(err);
            const errorMarkdown = `> ❌ **[大模型推理调用异常]**：${errMsg}\n>\n> 💡 **解决建议**：\n> 1. 请点击顶部 **「模型设置」** 检查 API Key 是否有效，或点击「测试模型连接」排查故障；\n> 2. 若调用云端模型，请确保开启了 **「本地开发跨域代理 (Bypass CORS)」**；\n> 3. 若使用本地 Ollama，请确认终端已执行并启动了模型：\`ollama run ${llmSettings.model || 'deepseek-r1:8b'}\`；\n> 4. 亦可在顶部模型切换中一键选择 **「离线仿真引擎」** 零门槛即开即用。`;
            get().updateNodeData(nodeId, { aiResponse: errorMarkdown }, 'immediate');
            set({
              isStreaming: false,
              streamingNodeId: null,
              streamingText: '',
              isXrayActive: false,
              toastMessage: `调用失败: ${errMsg.slice(0, 60)}...`,
            });
          },
        }
      );
    } catch (e: unknown) {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      const errMsg = e instanceof Error ? e.message : String(e);
      const errorMarkdown = `> ❌ **[大模型推理调用异常]**：${errMsg}\n>\n> 💡 **解决建议**：\n> 1. 请点击顶部 **「模型设置」** 检查 API Key、Base URL 与 Model 标识；\n> 2. 点击「测试模型连接」按钮验证连通性；\n> 3. 随时可在顶部一键切回 **「离线仿真引擎」** 快速推演。`;
      get().updateNodeData(nodeId, { aiResponse: errorMarkdown }, 'immediate');
      set({
        isStreaming: false,
        streamingNodeId: null,
        streamingText: '',
        isXrayActive: false,
        toastMessage: `调用失败: ${errMsg.slice(0, 60)}...`,
      });
    }
  },


  setIsSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
  },

  setIsInspectorOpen: (open: boolean) => {
    set({ isInspectorOpen: open });
  },

  setIsSessionManagerOpen: (open: boolean) => {
    set({ isSessionManagerOpen: open });
    if (open) {
      get().refreshSessionList();
    }
  },

  updateSettings: (patch: Partial<LLMSettings>) => {
    const updated = { ...get().llmSettings, ...patch };
    set({ llmSettings: updated });
    saveSettingsToDB(updated);
  },

  resetToDemo: () => {
    set({
      graph: INITIAL_DEMO_GRAPH,
      activeNodeId: 'node_page_fault',
      isDrawerOpen: true,
      isXrayActive: false,
      xrayStatus: {},
    });
    saveGraphToDB(INITIAL_DEMO_GRAPH);
    get().refreshSessionList();
  },

  exportGraphJson: () => {
    const { graph } = get();
    return JSON.stringify(graph, null, 2);
  },

  importGraphJson: (json: string) => {
    try {
      const parsed = JSON.parse(json) as CanvasGraph;
      if (parsed && parsed.nodes && parsed.rootNodeId) {
        // 如果导入的 ID 与现有冲突，更新 updatedAt
        parsed.updatedAt = Date.now();
        saveGraphToDB(parsed);

        set({
          graph: parsed,
          activeNodeId: parsed.rootNodeId,
          isDrawerOpen: false,
        });

        get().refreshSessionList();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  exportMarkdownReport: () => {
    const { graph } = get();
    let md = `# ${graph.title} - 知识复盘报告\n\n`;
    md += `> 生成时间：${new Date().toLocaleString()}\n`;
    md += `> 节点总数：${Object.keys(graph.nodes).length} | 根节点：${graph.nodes[graph.rootNodeId]?.title || graph.rootNodeId}\n\n`;

    md += `## 1. 核心推演脉络\n\n`;
    for (const node of Object.values(graph.nodes)) {
      md += `### [${node.category.toUpperCase()}] ${node.title} (${node.status})\n`;
      md += `- **提问**：${node.userQuery}\n`;
      if (node.artifact) {
        md += `- **核心结论**：${node.artifact.coreTakeaway}\n`;
        if (node.artifact.hardInvariants.length > 0) {
          md += `- **硬核不变量**：${node.artifact.hardInvariants.join(', ')}\n`;
        }
        if (node.artifact.codeSignatures.length > 0) {
          md += `- **代码签名**：\n\`\`\`c\n${node.artifact.codeSignatures.join('\n')}\n\`\`\`\n`;
        }
      }
      md += `\n**详细推演解答**：\n${node.aiResponse || '（暂无回答）'}\n\n---\n\n`;
    }

    return md;
  },
}));
