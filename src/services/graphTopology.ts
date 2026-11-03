// services/graphTopology.ts
// 图扑拓扑与有向无环图 (DAG) 关系校验引擎

import type { CanvasGraph, CanvasNodeData } from '../types/canvas';

/**
 * 校验在图中添加一条从 sourceId 指向 targetId 的有向边（即 targetId 的 parentIds 增加 sourceId）
 * 是否会导致图中出现环路 (Directed Cycle)。
 * 
 * 算法原理：
 * 在有向图中，添加 source -> target 会形成环，当且仅当 target 可以通过已有的有向路径到达 source。
 * 因此从 targetId 出发执行 BFS 遍历下游子孙节点，如果能访问到 sourceId，则说明存在闭环路径。
 */
export function wouldCreateCycle(
  nodes: Record<string, CanvasNodeData>,
  sourceId: string,
  targetId: string
): boolean {
  if (!sourceId || !targetId) return false;
  if (sourceId === targetId) return true;

  const visited = new Set<string>();
  const queue: string[] = [targetId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === sourceId) {
      return true;
    }

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // 寻找当前节点的所有直系下游子节点（即 parentIds 中包含 currentId 的节点）
    for (const node of Object.values(nodes)) {
      if (node.parentIds && node.parentIds.includes(currentId) && !visited.has(node.id)) {
        queue.push(node.id);
      }
    }
  }

  return false;
}

/**
 * 完整校验两个节点之间是否可以建立单向连接 (sourceId -> targetId)
 * sourceId: 前置父节点
 * targetId: 后置子节点
 */
export function validateNodeConnection(
  nodes: Record<string, CanvasNodeData>,
  sourceId: string,
  targetId: string
): { isValid: boolean; reason?: string } {
  if (!sourceId || !targetId) {
    return { isValid: false, reason: '请选择起点节点和目标节点' };
  }

  if (sourceId === targetId) {
    return { isValid: false, reason: '不能将节点与其自身连接' };
  }

  const sourceNode = nodes[sourceId];
  const targetNode = nodes[targetId];

  if (!sourceNode) {
    return { isValid: false, reason: `起点节点 (${sourceId}) 不存在` };
  }

  if (!targetNode) {
    return { isValid: false, reason: `目标节点 (${targetId}) 不存在` };
  }

  if (targetNode.parentIds && targetNode.parentIds.includes(sourceId)) {
    return { isValid: false, reason: `两节点之间已存在连接关系` };
  }

  if (wouldCreateCycle(nodes, sourceId, targetId)) {
    return {
      isValid: false,
      reason: '无法建立连接：两节点之间存在环路依赖，系统仅支持有向无环图 (DAG)',
    };
  }

  return { isValid: true };
}

/**
 * 获取某个节点的所有前置父节点对象列表
 */
export function getNodeParents(
  graph: CanvasGraph,
  nodeId: string
): CanvasNodeData[] {
  const node = graph.nodes[nodeId];
  if (!node || !node.parentIds) return [];
  return node.parentIds
    .map((pid) => graph.nodes[pid])
    .filter((n): n is CanvasNodeData => Boolean(n));
}

/**
 * 获取某个节点的所有后置子节点对象列表
 */
export function getNodeChildren(
  graph: CanvasGraph,
  nodeId: string
): CanvasNodeData[] {
  if (!graph.nodes[nodeId]) return [];
  return Object.values(graph.nodes).filter(
    (n) => n.parentIds && n.parentIds.includes(nodeId)
  );
}

/**
 * 获取可作为指定节点的前置父节点的候选节点列表（排除自身、已有父节点及会导致成环的节点）
 */
export function getAvailableParentCandidates(
  graph: CanvasGraph,
  targetNodeId: string
): CanvasNodeData[] {
  const targetNode = graph.nodes[targetNodeId];
  if (!targetNode) return [];

  const currentParents = new Set(targetNode.parentIds || []);

  return Object.values(graph.nodes).filter((candidate) => {
    if (candidate.id === targetNodeId) return false;
    if (currentParents.has(candidate.id)) return false;
    if (wouldCreateCycle(graph.nodes, candidate.id, targetNodeId)) return false;
    return true;
  });
}

/**
 * 获取可作为指定节点的后置子节点的候选节点列表（排除自身、已有子节点及会导致成环的节点）
 */
export function getAvailableChildCandidates(
  graph: CanvasGraph,
  sourceNodeId: string
): CanvasNodeData[] {
  if (!graph.nodes[sourceNodeId]) return [];

  return Object.values(graph.nodes).filter((candidate) => {
    if (candidate.id === sourceNodeId) return false;
    if (candidate.parentIds && candidate.parentIds.includes(sourceNodeId)) return false;
    if (wouldCreateCycle(graph.nodes, sourceNodeId, candidate.id)) return false;
    return true;
  });
}
