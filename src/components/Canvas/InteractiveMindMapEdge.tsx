// components/Canvas/InteractiveMindMapEdge.tsx
import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { X, ArrowRight } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

type InteractiveEdgeProps = EdgeProps & {
  className?: string;
};

export const InteractiveMindMapEdge: React.FC<InteractiveEdgeProps> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  className,
  selected,
}) => {
  const disconnectNodes = useCanvasStore((s) => s.disconnectNodes);
  const graph = useCanvasStore((s) => s.graph);
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const sourceNode = graph.nodes[source];
  const targetNode = graph.nodes[target];

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectNodes(source, target);
  };

  const showControls = isHovered || selected;

  return (
    <g
      className="group/edge cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 隐形加宽交互 Hitbox 路径 (8px)，使得鼠标轻松悬停触发连线浮动胶囊 */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="pointer-events-auto"
      />

      {/* 实际渲染的可见平滑阶梯连线 */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected || isHovered ? 2.2 : 1.5,
          stroke:
            selected || isHovered
              ? 'var(--accent-focus)'
              : style.stroke || 'var(--edge-default)',
        }}
        className={`${className || ''} transition-all duration-200`}
      />

      {/* 连线正中悬浮光学断开微胶囊 */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {showControls ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full glass-elevated border border-[var(--line-strong)] shadow-lg animate-in fade-in zoom-in-95 duration-150 text-[10px] select-none">
              <span
                className="text-[var(--text-3)] font-mono max-w-[80px] truncate"
                title={`${sourceNode?.title || source} ➔ ${targetNode?.title || target}`}
              >
                {sourceNode?.title ? sourceNode.title.slice(0, 5) : '前置'}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-[var(--accent-focus)] shrink-0" />
              <span
                className="text-[var(--text-2)] font-mono max-w-[80px] truncate"
                title={`${sourceNode?.title || source} ➔ ${targetNode?.title || target}`}
              >
                {targetNode?.title ? targetNode.title.slice(0, 5) : '后置'}
              </span>

              <button
                type="button"
                onClick={handleDisconnect}
                className="ml-1 p-0.5 rounded-full hover:bg-rose-500/15 hover:text-rose-500 text-[var(--text-3)] transition-colors cursor-pointer"
                title="断开此关联联系"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </div>
          ) : (
            /* 默认非 Hover 状态下：小巧极简光斑，提示可交互 */
            <div
              className="w-2 h-2 rounded-full bg-[var(--line-strong)] group-hover/edge:bg-[var(--accent-focus)] group-hover/edge:scale-125 transition-all opacity-0 group-hover/edge:opacity-100"
              title="悬停可断开关联"
            />
          )}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
};
