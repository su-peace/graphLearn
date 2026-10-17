// tests/nodeDeletion.test.ts
import { describe, it, expect } from 'vitest';
import { INITIAL_DEMO_GRAPH } from '../src/data/demoGraph';
import type { CanvasGraph } from '../src/types/canvas';

describe('Node Deletion with Strategies Tests', () => {
  it('reparent 模式应当将子节点的 parentIds 指向被删节点的父节点', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    // 在初始 DEMO 图中，node_deprecated_flat 的 parentIds 是 ['node_root']
    // node_branch_exploring 的 parentIds 是 ['node_deprecated_flat']
    const targetNodeId = 'node_deprecated_flat';
    const childNodeId = 'node_branch_exploring';
    const targetNode = graph.nodes[targetNodeId];
    const parents = targetNode.parentIds; // ['node_root']

    expect(graph.nodes[childNodeId].parentIds).toContain(targetNodeId);

    // 执行 reparent 逻辑
    const newNodes = { ...graph.nodes };
    delete newNodes[targetNodeId];

    for (const child of Object.values(newNodes)) {
      if (child.parentIds?.includes(targetNodeId)) {
        const remaining = child.parentIds.filter((p) => p !== targetNodeId);
        const combined = Array.from(new Set([...remaining, ...parents]));
        child.parentIds = combined.length > 0 ? combined : [graph.rootNodeId];
      }
    }

    expect(newNodes[targetNodeId]).toBeUndefined();
    expect(newNodes[childNodeId].parentIds).toContain('node_root');
    expect(newNodes[childNodeId].parentIds).not.toContain(targetNodeId);
  });

  it('cascade 模式应当递归删除全部子孙节点', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    const targetNodeId = 'node_deprecated_flat';

    const newNodes = { ...graph.nodes };
    const toDelete = new Set<string>([targetNodeId]);
    const queue = [targetNodeId];
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

    expect(newNodes[targetNodeId]).toBeUndefined();
    expect(newNodes['node_branch_exploring']).toBeUndefined();
    expect(newNodes['node_root']).toBeDefined();
  });
});
