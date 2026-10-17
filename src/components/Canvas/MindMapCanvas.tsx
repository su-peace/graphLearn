// components/Canvas/MindMapCanvas.tsx
import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { flushSaveGraphToDB } from '../../db/database';
import { CapsuleNode } from './CapsuleNode';
import type { CanvasNodeData } from '../../types/canvas';

const nodeTypes = {
  capsule: CapsuleNode,
};

const MindMapCanvasInternal: React.FC<{
  onRegisterNavigate: (fn: (nodeId: string) => void) => void;
}> = ({ onRegisterNavigate }) => {
  const graph = useCanvasStore((s) => s.graph);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const connectNodes = useCanvasStore((s) => s.connectNodes);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const isXrayActive = useCanvasStore((s) => s.isXrayActive);
  const xrayStatus = useCanvasStore((s) => s.xrayStatus);

  const { setCenter } = useReactFlow();

  // 注册平滑对焦函数 (Citation Navigation: 600ms 平滑动画)
  const navigateToNode = useCallback(
    (nodeId: string) => {
      const node = graph.nodes[nodeId];
      if (node?.position) {
        setCenter(node.position.x + 120, node.position.y + 38, {
          zoom: 1.15,
          duration: 600,
        });
        selectNode(nodeId);
      }
    },
    [graph.nodes, setCenter, selectNode]
  );

  React.useEffect(() => {
    onRegisterNavigate(navigateToNode);
  }, [onRegisterNavigate, navigateToNode]);

  // 将 store 中的节点转换为 React Flow 节点
  const flowNodes: Node[] = useMemo(() => {
    return Object.values(graph.nodes).map((node) => ({
      id: node.id,
      type: 'capsule',
      position: node.position || { x: 0, y: 0 },
      data: node as unknown as Record<string, unknown>,
    }));
  }, [graph.nodes]);

  // 构建 React Flow 边拓扑（根据 parentIds 动态连接）
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    for (const node of Object.values(graph.nodes)) {
      if (node.parentIds && node.parentIds.length > 0) {
        for (const parentId of node.parentIds) {
          if (graph.nodes[parentId]) {
            const edgeId = `e_${parentId}_${node.id}`;
            const targetXray = xrayStatus[node.id];
            const sourceXray = xrayStatus[parentId];

            let edgeClass = '';
            if (isXrayActive) {
              if (targetXray === 'full' && sourceXray === 'full') {
                edgeClass = 'edge-solid-glow';
              } else if (
                (targetXray === 'artifact' || sourceXray === 'artifact') &&
                targetXray !== 'dropped' &&
                sourceXray !== 'dropped'
              ) {
                edgeClass = 'edge-artifact-glow';
              } else {
                edgeClass = 'edge-dimmed';
              }
            }

            edges.push({
              id: edgeId,
              source: parentId,
              target: node.id,
              type: 'smoothstep',
              animated: isXrayActive && targetXray === 'full',
              className: edgeClass,
            });
          }
        }
      }
    }

    return edges;
  }, [graph.nodes, isXrayActive, xrayStatus]);

  // 处理连线事件 (多父节点 DAG 汇聚)
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        connectNodes(connection.source, connection.target);
      }
    },
    [connectNodes]
  );

  // 拖拽节点更新坐标（内存更新 + 防抖落库）
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id) {
          updateNodeData(change.id, { position: change.position }, 'debounced');
        }
      }
    },
    [updateNodeData]
  );

  // 拖拽停止时立即持久化
  const handleNodeDragStop = useCallback(() => {
    flushSaveGraphToDB();
  }, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => {
          // 点击空白区域取消高亮但保留活跃节点
        }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultViewport={graph.viewport}
        className="bg-[#090d16]"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#1e293b" />
        <Controls className="!bg-slate-900/90 !border-slate-800 !rounded-xl overflow-hidden !shadow-xl [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            const d = n.data as unknown as CanvasNodeData;
            if (d?.status === 'verified') return '#10b981';
            if (d?.status === 'deprecated') return '#f43f5e';
            return '#64748b';
          }}
          className="!bg-slate-900/80 !border-slate-800 !rounded-xl overflow-hidden shadow-2xl !bottom-4 !left-4"
          maskColor="rgba(9, 13, 22, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};

export const MindMapCanvas: React.FC<{
  onRegisterNavigate: (fn: (nodeId: string) => void) => void;
}> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInternal {...props} />
    </ReactFlowProvider>
  );
};
