// services/graphLayout.ts
import dagre from '@dagrejs/dagre';
import type { CanvasNodeData } from '../types/canvas';

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

/**
 * 基于 Dagre 算法对画布节点进行自动分层排列（默认从左到右 LR 思维导图结构）
 */
export function calculateDagreLayout(
  nodes: Record<string, CanvasNodeData>,
  options: LayoutOptions = {}
): Record<string, { x: number; y: number }> {
  const {
    direction = 'LR',
    nodeWidth = 260,
    nodeHeight = 90,
    nodeSep = 50,
    rankSep = 100,
  } = options;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // 添加所有节点
  for (const node of Object.values(nodes)) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  // 根据 parentIds 添加有向边
  for (const node of Object.values(nodes)) {
    if (node.parentIds && node.parentIds.length > 0) {
      for (const parentId of node.parentIds) {
        if (nodes[parentId]) {
          g.setEdge(parentId, node.id);
        }
      }
    }
  }

  try {
    dagre.layout(g);
  } catch (err) {
    console.warn('Dagre layout error, skipping graph relayout:', err);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of Object.values(nodes)) {
    const nodeWithPos = g.node(node.id);
    if (
      nodeWithPos &&
      typeof nodeWithPos.x === 'number' &&
      typeof nodeWithPos.y === 'number' &&
      !isNaN(nodeWithPos.x) &&
      !isNaN(nodeWithPos.y)
    ) {
      // dagre 返回的是中心点坐标，React Flow 需要左上角坐标
      positions[node.id] = {
        x: Math.round(nodeWithPos.x - nodeWidth / 2),
        y: Math.round(nodeWithPos.y - nodeHeight / 2),
      };
    } else {
      positions[node.id] = node.position || { x: 0, y: 0 };
    }
  }

  return positions;
}
