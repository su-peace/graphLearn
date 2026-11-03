// tests/nodeConnection.test.ts
import { describe, it, expect } from 'vitest';
import { INITIAL_DEMO_GRAPH } from '../src/data/demoGraph';
import type { CanvasGraph, CanvasNodeData } from '../src/types/canvas';
import {
  wouldCreateCycle,
  validateNodeConnection,
  getNodeParents,
  getNodeChildren,
  getAvailableParentCandidates,
} from '../src/services/graphTopology';

describe('Node Connection & DAG Cycle Prevention Tests', () => {
  it('正确检测自环 (Self-connection)', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    const validation = validateNodeConnection(graph.nodes, 'node_root', 'node_root');
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toContain('自身');
  });

  it('正确检测已存在的连接 (Duplicate connection)', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // 在初始图中 node_deprecated_flat 的 parentIds 包含 node_root
    const validation = validateNodeConnection(graph.nodes, 'node_root', 'node_deprecated_flat');
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toContain('已存在');
  });

  it('正确检测直接反向环路 (Direct Cycle: B -> A where A -> B already exists)', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // 已有 node_root -> node_deprecated_flat
    // 尝试添加 node_deprecated_flat -> node_root 会形成闭环
    expect(wouldCreateCycle(graph.nodes, 'node_deprecated_flat', 'node_root')).toBe(true);
    const validation = validateNodeConnection(graph.nodes, 'node_deprecated_flat', 'node_root');
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toContain('环路依赖');
  });

  it('正确检测跨越多跳的深层环路 (Deep Multi-hop Cycle: D -> A where A -> B -> C -> D)', () => {
    const testNodes: Record<string, CanvasNodeData> = {
      A: { id: 'A', title: 'Node A', parentIds: [] } as any,
      B: { id: 'B', title: 'Node B', parentIds: ['A'] } as any,
      C: { id: 'C', title: 'Node C', parentIds: ['B'] } as any,
      D: { id: 'D', title: 'Node D', parentIds: ['C'] } as any,
    };

    // A -> B -> C -> D
    // 尝试添加 D -> A 应该被拦截
    expect(wouldCreateCycle(testNodes, 'D', 'A')).toBe(true);
    // 尝试添加 C -> A 应该被拦截
    expect(wouldCreateCycle(testNodes, 'C', 'A')).toBe(true);
    // 尝试添加 D -> B 应该被拦截
    expect(wouldCreateCycle(testNodes, 'D', 'B')).toBe(true);

    // 尝试添加 A -> D (A 已间接是 D 的祖先，但如果直接加一条旁路边 A -> D，仍然是 DAG，不会成环)
    expect(wouldCreateCycle(testNodes, 'A', 'D')).toBe(false);
  });

  it('允许合法的 DAG 分支汇聚 (Multi-parent Convergence / Merge)', () => {
    const testNodes: Record<string, CanvasNodeData> = {
      Root: { id: 'Root', title: 'Root', parentIds: [] } as any,
      Branch1: { id: 'Branch1', title: 'Branch 1', parentIds: ['Root'] } as any,
      Branch2: { id: 'Branch2', title: 'Branch 2', parentIds: ['Root'] } as any,
      MergeNode: { id: 'MergeNode', title: 'Merge Node', parentIds: ['Branch1'] } as any,
    };

    // 允许将 Branch2 连接到 MergeNode (形成两条分支汇聚到同一节点)
    const validation = validateNodeConnection(testNodes, 'Branch2', 'MergeNode');
    expect(validation.isValid).toBe(true);
    expect(wouldCreateCycle(testNodes, 'Branch2', 'MergeNode')).toBe(false);
  });

  it('正确查询节点的父级与子级拓扑列表', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // node_page_fault 在 demoGraph 中有两个父节点: node_tlb 和 node_kern_lock
    const parents = getNodeParents(graph, 'node_page_fault');
    expect(parents.map((p) => p.id)).toContain('node_tlb');
    expect(parents.map((p) => p.id)).toContain('node_pinned_spec');

    const childrenOfRoot = getNodeChildren(graph, 'node_root');
    expect(childrenOfRoot.length).toBeGreaterThan(0);
    expect(childrenOfRoot.map((c) => c.id)).toContain('node_deprecated_flat');
  });

  it('过滤可用前置候选节点，排除成环节点', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // 检查根节点 node_root 的可用前置候选：应该为空或不能包含它的任何后代
    const candidatesForRoot = getAvailableParentCandidates(graph, 'node_root');
    // node_root 的所有后代都不能作为 node_root 的父节点
    const descendantIds = getNodeChildren(graph, 'node_root').map((c) => c.id);
    for (const dId of descendantIds) {
      expect(candidatesForRoot.find((c) => c.id === dId)).toBeUndefined();
    }
  });

  it('模拟断开关联 (Disconnect nodes) 应当正确移除 parentId', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // node_page_fault 有两个父节点: 'node_pinned_spec' 和 'node_tlb'
    expect(graph.nodes['node_page_fault'].parentIds).toContain('node_tlb');

    // 断开 node_tlb -> node_page_fault
    const targetNode = graph.nodes['node_page_fault'];
    targetNode.parentIds = targetNode.parentIds.filter((pid) => pid !== 'node_tlb');

    expect(targetNode.parentIds).not.toContain('node_tlb');
    expect(targetNode.parentIds).toContain('node_pinned_spec');
  });

  it('模拟建立关联 (Connect nodes) 应当将 sourceId 添加至 target 的 parentIds', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // node_branch_exploring 与 node_tlb 之间原本没有连接
    expect(graph.nodes['node_tlb'].parentIds).not.toContain('node_branch_exploring');

    const validation = validateNodeConnection(graph.nodes, 'node_branch_exploring', 'node_tlb');
    expect(validation.isValid).toBe(true);

    graph.nodes['node_tlb'].parentIds.push('node_branch_exploring');
    expect(graph.nodes['node_tlb'].parentIds).toContain('node_branch_exploring');
  });
});
