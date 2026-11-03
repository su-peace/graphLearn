// tests/undoRedo.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCanvasStore } from '../src/store/canvasStore';
import { INITIAL_DEMO_GRAPH } from '../src/data/demoGraph';
import type { CanvasGraph } from '../src/types/canvas';

describe('useCanvasStore Undo / Redo History Stack Tests', () => {
  beforeEach(() => {
    // 屏蔽 Node 环境缺少 IndexedDB 触发的非致命 DB 日志
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // 每次测试前重置 Store 状态为干净的初始 DEMO 图谱
    const initialGraph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    useCanvasStore.setState({
      graph: initialGraph,
      activeNodeId: initialGraph.rootNodeId,
      historyPast: [],
      historyFuture: [],
      canUndo: false,
      canRedo: false,
      isStreaming: false,
      toastMessage: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始状态下 canUndo 为 false，canRedo 为 false', () => {
    const state = useCanvasStore.getState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.historyPast).toHaveLength(0);
    expect(state.historyFuture).toHaveLength(0);
  });

  it('执行 addNode 拓扑变更后 canUndo 变为 true，调用 undo() 恢复并使 canRedo 变为 true', async () => {
    const initialNodeCount = Object.keys(useCanvasStore.getState().graph.nodes).length;

    const newNodeId = await useCanvasStore.getState().addNode({
      title: '新增探索节点',
      parentIds: [useCanvasStore.getState().graph.rootNodeId],
      userQuery: '测试 Undo/Redo 的节点',
    });

    // 验证新节点已添加
    expect(Object.keys(useCanvasStore.getState().graph.nodes).length).toBe(initialNodeCount + 1);
    expect(useCanvasStore.getState().graph.nodes[newNodeId]).toBeDefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 调用 undo()，恢复回前一状态
    useCanvasStore.getState().undo();

    expect(Object.keys(useCanvasStore.getState().graph.nodes).length).toBe(initialNodeCount);
    expect(useCanvasStore.getState().graph.nodes[newNodeId]).toBeUndefined();
    expect(useCanvasStore.getState().canUndo).toBe(false);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    // 调用 redo()，重新应用状态
    useCanvasStore.getState().redo();

    expect(Object.keys(useCanvasStore.getState().graph.nodes).length).toBe(initialNodeCount + 1);
    expect(useCanvasStore.getState().graph.nodes[newNodeId]).toBeDefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);
  });

  it('执行 updateNodeTitle 与 setNodeStatus 后 canUndo 变为 true，且支持撤销与重做', () => {
    const targetId = 'node_page_fault';
    const originalTitle = useCanvasStore.getState().graph.nodes[targetId].title;
    const newTitle = '深入剖析缺页异常链路';

    // 1. 更新标题
    useCanvasStore.getState().updateNodeTitle(targetId, newTitle);
    expect(useCanvasStore.getState().graph.nodes[targetId].title).toBe(newTitle);
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 2. 撤销修改标题
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().graph.nodes[targetId].title).toBe(originalTitle);
    expect(useCanvasStore.getState().canUndo).toBe(false);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    // 3. 重做修改标题
    useCanvasStore.getState().redo();
    expect(useCanvasStore.getState().graph.nodes[targetId].title).toBe(newTitle);
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 4. 修改状态 (verified -> deprecated)
    useCanvasStore.getState().setNodeStatus(targetId, 'deprecated');
    expect(useCanvasStore.getState().graph.nodes[targetId].status).toBe('deprecated');

    // 5. 撤销状态
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().graph.nodes[targetId].status).toBe('verified');
  });

  it('执行 connectNodes 与 disconnectNodes 拓扑连线变更后支持撤销与重做', () => {
    const sourceId = 'node_deprecated_flat';
    const targetId = 'node_pinned_spec';

    // 初始状态下不存在该连接
    expect(useCanvasStore.getState().graph.nodes[targetId].parentIds).not.toContain(sourceId);

    // 1. 建立拓扑连接
    const res = useCanvasStore.getState().connectNodes(sourceId, targetId);
    expect(res.success).toBe(true);
    expect(useCanvasStore.getState().graph.nodes[targetId].parentIds).toContain(sourceId);
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 2. 撤销连接 (undo)
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().graph.nodes[targetId].parentIds).not.toContain(sourceId);
    expect(useCanvasStore.getState().canUndo).toBe(false);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    // 3. 重做连接 (redo)
    useCanvasStore.getState().redo();
    expect(useCanvasStore.getState().graph.nodes[targetId].parentIds).toContain(sourceId);
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 4. 断开连接 (disconnectNodes)
    useCanvasStore.getState().disconnectNodes(sourceId, targetId);
    expect(useCanvasStore.getState().graph.nodes[targetId].parentIds).not.toContain(sourceId);

    // 5. 撤销断开连接 (undo)
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().graph.nodes[targetId].parentIds).toContain(sourceId);
  });

  it('执行 deleteNodeWithOptions 删除节点后支持完整撤销与重做', async () => {
    const targetId = 'node_branch_exploring';
    expect(useCanvasStore.getState().graph.nodes[targetId]).toBeDefined();

    // 1. 删除节点
    await useCanvasStore.getState().deleteNodeWithOptions(targetId, 'isolate');
    expect(useCanvasStore.getState().graph.nodes[targetId]).toBeUndefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 2. 撤销删除 (undo)
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().graph.nodes[targetId]).toBeDefined();
    expect(useCanvasStore.getState().canUndo).toBe(false);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    // 3. 重做删除 (redo)
    useCanvasStore.getState().redo();
    expect(useCanvasStore.getState().graph.nodes[targetId]).toBeUndefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);
  });

  it('多次连续操作连续 undo 与连续 redo 的状态一致性', async () => {
    const initialKeys = Object.keys(useCanvasStore.getState().graph.nodes).sort();

    // 连续执行 3 次变更
    const id1 = await useCanvasStore.getState().addNode({
      title: '第 1 步',
      parentIds: ['node_root'],
      userQuery: 'Q1',
    });

    const id2 = await useCanvasStore.getState().addNode({
      title: '第 2 步',
      parentIds: [id1],
      userQuery: 'Q2',
    });

    const id3 = await useCanvasStore.getState().addNode({
      title: '第 3 步',
      parentIds: [id2],
      userQuery: 'Q3',
    });

    expect(useCanvasStore.getState().historyPast.length).toBe(3);
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);

    // 连续撤销 3 次
    useCanvasStore.getState().undo(); // 撤销 id3
    expect(useCanvasStore.getState().graph.nodes[id3]).toBeUndefined();
    expect(useCanvasStore.getState().graph.nodes[id2]).toBeDefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    useCanvasStore.getState().undo(); // 撤销 id2
    expect(useCanvasStore.getState().graph.nodes[id2]).toBeUndefined();
    expect(useCanvasStore.getState().graph.nodes[id1]).toBeDefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    useCanvasStore.getState().undo(); // 撤销 id1
    expect(useCanvasStore.getState().graph.nodes[id1]).toBeUndefined();
    expect(useCanvasStore.getState().canUndo).toBe(false);
    expect(useCanvasStore.getState().canRedo).toBe(true);

    // 回退到初始完全一致状态
    expect(Object.keys(useCanvasStore.getState().graph.nodes).sort()).toEqual(initialKeys);

    // 连续重做 3 次
    useCanvasStore.getState().redo(); // 恢复 id1
    expect(useCanvasStore.getState().graph.nodes[id1]).toBeDefined();
    expect(useCanvasStore.getState().graph.nodes[id2]).toBeUndefined();

    useCanvasStore.getState().redo(); // 恢复 id2
    expect(useCanvasStore.getState().graph.nodes[id2]).toBeDefined();
    expect(useCanvasStore.getState().graph.nodes[id3]).toBeUndefined();

    useCanvasStore.getState().redo(); // 恢复 id3
    expect(useCanvasStore.getState().graph.nodes[id3]).toBeDefined();
    expect(useCanvasStore.getState().canUndo).toBe(true);
    expect(useCanvasStore.getState().canRedo).toBe(false);
  });

  it('在 undo 后执行新的操作会清空 historyFuture (分支切断)', async () => {
    const idA = await useCanvasStore.getState().addNode({
      title: '分支 A',
      parentIds: ['node_root'],
      userQuery: 'QA',
    });

    expect(useCanvasStore.getState().canUndo).toBe(true);

    // 撤销分支 A
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().canRedo).toBe(true);
    expect(useCanvasStore.getState().historyFuture.length).toBe(1);

    // 执行新操作，添加分支 B
    const idB = await useCanvasStore.getState().addNode({
      title: '分支 B',
      parentIds: ['node_root'],
      userQuery: 'QB',
    });

    // historyFuture 应该被清空，canRedo 为 false
    expect(useCanvasStore.getState().historyFuture.length).toBe(0);
    expect(useCanvasStore.getState().canRedo).toBe(false);
    expect(useCanvasStore.getState().graph.nodes[idB]).toBeDefined();
    expect(useCanvasStore.getState().graph.nodes[idA]).toBeUndefined();

    // 再次 undo 应当撤销分支 B，回到起点
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().graph.nodes[idB]).toBeUndefined();
    expect(useCanvasStore.getState().canRedo).toBe(true);
  });

  it('在 isStreaming 为 true 时应安全拦截并忽略 undo 与 redo 触发', async () => {
    await useCanvasStore.getState().addNode({
      title: '推演中节点',
      parentIds: ['node_root'],
      userQuery: 'Q',
    });
    expect(useCanvasStore.getState().canUndo).toBe(true);

    const nodeCountBefore = Object.keys(useCanvasStore.getState().graph.nodes).length;

    // 模拟流式生成中
    useCanvasStore.setState({ isStreaming: true });

    // 尝试调用 undo，应被忽略
    useCanvasStore.getState().undo();
    expect(Object.keys(useCanvasStore.getState().graph.nodes).length).toBe(nodeCountBefore);

    // 退出流式状态后可正常 undo
    useCanvasStore.setState({ isStreaming: false });
    useCanvasStore.getState().undo();
    expect(Object.keys(useCanvasStore.getState().graph.nodes).length).toBe(nodeCountBefore - 1);
  });
});
