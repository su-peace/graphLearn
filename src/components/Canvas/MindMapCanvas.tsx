// components/Canvas/MindMapCanvas.tsx
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize, MapPin, Eye } from 'lucide-react';
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
  const theme = useCanvasStore((s) => s.theme);
  const layoutVersion = useCanvasStore((s) => s.layoutVersion);

  const [showMiniMap, setShowMiniMap] = useState(false);

  const { setCenter, zoomIn, zoomOut, fitView } = useReactFlow();

  // 监听整理排版版本，自动平滑自适应视野 (FitView Animation)
  useEffect(() => {
    if (layoutVersion > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.25, duration: 500 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [layoutVersion, fitView]);

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

  // 将 store 中的节点转换为 React Flow 节点（明确指定 width/height 便于鹰眼精确绘制）
  const flowNodes: Node[] = useMemo(() => {
    return Object.values(graph.nodes).map((node) => ({
      id: node.id,
      type: 'capsule',
      position: node.position || { x: 0, y: 0 },
      data: node as unknown as Record<string, unknown>,
      width: 240,
      height: 80,
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
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.25}
          color="var(--bg-dot)"
        />

        {/* 鹰眼导图 (按需浮现，高精度全局缩略图) */}
        {showMiniMap && (
          <MiniMap
            zoomable
            pannable
            nodeBorderRadius={4}
            nodeStrokeWidth={1}
            nodeStrokeColor={theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'}
            nodeColor={(n) => {
              const d = n.data as unknown as CanvasNodeData;
              if (d?.status === 'verified') return '#10B981';
              if (d?.status === 'deprecated') return '#F43F5E';
              if (d?.category === 'root_goal') return theme === 'dark' ? '#38BDF8' : '#D97757';
              return theme === 'dark' ? '#475569' : '#A1A1AA';
            }}
            maskColor={theme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.08)'}
            maskStrokeColor={theme === 'dark' ? '#38BDF8' : '#D97757'}
            maskStrokeWidth={2}
            className="!rounded-xl overflow-hidden !shadow-2xl !bottom-16 !left-4 animate-in fade-in zoom-in-95 duration-200 border border-[var(--line-default)]"
            style={{
              width: 240,
              height: 160,
              backgroundColor: theme === 'dark' ? '#121418' : '#FFFFFF',
            }}
          />
        )}
      </ReactFlow>

      {/* 底部左侧：优雅微型悬浮视口工具胶囊 */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 p-1 rounded-full glass shadow-sm text-[var(--text-2)]">
        <button
          onClick={() => zoomIn({ duration: 300 })}
          className="p-1.5 rounded-full hover:bg-[var(--surface-3)] hover:text-[var(--text-1)] transition-all cursor-pointer active:scale-90"
          title="放大画布"
        >
          <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.6} />
        </button>

        <button
          onClick={() => zoomOut({ duration: 300 })}
          className="p-1.5 rounded-full hover:bg-[var(--surface-3)] hover:text-[var(--text-1)] transition-all cursor-pointer active:scale-90"
          title="缩小画布"
        >
          <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.6} />
        </button>

        <div className="w-px h-3.5 bg-[var(--line-default)] mx-0.5" />

        <button
          onClick={() => fitView({ padding: 0.25, duration: 400 })}
          className="p-1.5 rounded-full hover:bg-[var(--surface-3)] hover:text-[var(--text-1)] transition-all cursor-pointer active:scale-90"
          title="自适应全局视野"
        >
          <Maximize className="w-3.5 h-3.5" strokeWidth={1.6} />
        </button>

        <div className="w-px h-3.5 bg-[var(--line-default)] mx-0.5" />

        <button
          onClick={() => setShowMiniMap((prev) => !prev)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
            showMiniMap
              ? 'bg-[var(--accent-primary)] text-[var(--accent-fg)] shadow-sm'
              : 'hover:bg-[var(--surface-3)] text-[var(--text-3)] hover:text-[var(--text-1)]'
          }`}
          title="切换鹰眼缩略图"
        >
          <MapPin className="w-3 h-3" strokeWidth={1.6} />
          <span>鹰眼</span>
        </button>
      </div>

      {/* X-Ray 光线追踪激活时的动态图例 (极简小胶囊) */}
      {isXrayActive && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-full glass shadow-sm text-[11px] text-[var(--text-2)] animate-in fade-in slide-in-from-bottom-2">
          <span className="font-semibold text-[var(--accent-xray)] flex items-center gap-1">
            <Eye className="w-3 h-3 text-[var(--accent-xray)]" strokeWidth={1.6} />
            <span>透视:</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-xray)] inline-block" />
            完整
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-[var(--text-2)] inline-block" />
            知识卡
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--status-deprecated)] inline-block" />
            避坑
          </span>
          <span className="flex items-center gap-1 text-[var(--text-4)]">
            <span className="w-2 h-2 rounded-full border border-[var(--line-strong)] inline-block" />
            舍弃
          </span>
        </div>
      )}
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
