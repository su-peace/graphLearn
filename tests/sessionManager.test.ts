// tests/sessionManager.test.ts
import { describe, it, expect } from 'vitest';
import { createBlankGraph, INITIAL_DEMO_GRAPH, RPC_DEMO_GRAPH } from '../src/data/demoGraph';
import type { CanvasGraph } from '../src/types/canvas';

describe('Multi-Session Management Logic Tests', () => {
  it('应当能独立创建不同主题的空白与模板会话', () => {
    const blankGraph = createBlankGraph('Raft 共识算法', '深入推演 Leader 选举与日志复制机制');
    expect(blankGraph.graphId).toMatch(/^graph_/);
    expect(blankGraph.title).toBe('Raft 共识算法');
    expect(blankGraph.nodes[blankGraph.rootNodeId]?.userQuery).toContain('深入推演 Leader 选举');

    expect(INITIAL_DEMO_GRAPH.graphId).toBe('graph_linux_vm');
    expect(RPC_DEMO_GRAPH.graphId).toBe('graph_rpc_framework');
  });

  it('克隆会话应当保持拓扑独立且具备唯一 graphId', () => {
    const original: CanvasGraph = JSON.parse(JSON.stringify(RPC_DEMO_GRAPH));
    const cloned: CanvasGraph = JSON.parse(JSON.stringify(original));
    cloned.graphId = `graph_copy_${Date.now()}`;
    cloned.title = `${original.title} (副本)`;

    expect(cloned.graphId).not.toBe(original.graphId);
    expect(cloned.title).toBe('设计高并发分布式 RPC 框架 (副本)');
    expect(Object.keys(cloned.nodes).length).toBe(Object.keys(original.nodes).length);

    // 修改副本不影响原图
    cloned.nodes['node_new'] = {
      id: 'node_new',
      title: '新克隆分支',
      parentIds: [cloned.rootNodeId],
      userQuery: '测试独立性',
      aiResponse: '',
      category: 'concept_qa',
      manualState: 'auto',
      status: 'exploring',
      fullTokens: 0,
      artifactTokens: 10,
    };

    expect(Object.keys(cloned.nodes).length).toBe(Object.keys(original.nodes).length + 1);
    expect(original.nodes['node_new']).toBeUndefined();
  });
});
