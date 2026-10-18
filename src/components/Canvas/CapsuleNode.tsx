// components/Canvas/CapsuleNode.tsx
import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Pin, Paperclip, Trash2 } from 'lucide-react';
import type { CanvasNodeData, NodeCategory } from '../../types/canvas';
import { useCanvasStore } from '../../store/canvasStore';

const CATEGORY_MAP: Record<
  NodeCategory,
  { stripColor: string; label: string }
> = {
  root_goal: {
    stripColor: 'bg-[var(--status-pinned)]',
    label: '核心命题',
  },
  core_conclusion: {
    stripColor: 'bg-blue-600 dark:bg-blue-400',
    label: '结论',
  },
  code_impl: {
    stripColor: 'bg-indigo-600 dark:bg-indigo-400',
    label: '实现',
  },
  concept_qa: {
    stripColor: 'bg-teal-600 dark:bg-teal-400',
    label: '辨析',
  },
  chitchat_debug: {
    stripColor: 'bg-zinc-500 dark:bg-zinc-400',
    label: '演算',
  },
};

export const CapsuleNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const isActive = useCanvasStore((s) => s.activeNodeId === id);
  const isXrayActive = useCanvasStore((s) => s.isXrayActive);
  const xrayStatus = useCanvasStore((s) => s.xrayStatus[id]);
  const isTargetOfCitation = useCanvasStore((s) => s.highlightedNodeId === id);
  const isStreamingHere = useCanvasStore((s) => s.streamingNodeId === id);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const isRoot = useCanvasStore((s) => s.graph.rootNodeId === id);

  const categoryMeta = CATEGORY_MAP[nodeData.category] || CATEGORY_MAP.concept_qa;
  const isDeprecated = nodeData.status === 'deprecated';
  const isVerified = nodeData.status === 'verified';

  // 精密圆角卡片边框与背景材质 (DESIGN.md §5.2)
  let borderClass = 'border-[var(--line-default)]';
  let bgClass = 'bg-[var(--surface-1)]/90';

  if (isRoot) {
    borderClass = 'border-[var(--status-pinned)] shadow-sm';
  } else if (isVerified) {
    borderClass = 'border-[var(--status-verified)] shadow-sm';
    bgClass = 'bg-gradient-to-b from-[var(--status-verified-bg)] to-[var(--surface-1)]';
  } else if (isDeprecated) {
    borderClass = 'border-[var(--status-deprecated)] border-dashed';
    bgClass = 'bg-[var(--surface-1)]/75 opacity-75';
  }

  // 选中态聚焦环
  const selectionClass =
    selected || isActive
      ? 'border-[var(--text-1)] ring-3 ring-[var(--line-default)] scale-[1.01]'
      : 'hover:border-[var(--line-strong)]';

  // X-Ray 透视逻辑
  let xrayClass = '';
  if (isXrayActive) {
    if (xrayStatus === 'full') {
      xrayClass = 'border-[var(--accent-xray)] ring-2 ring-[var(--accent-xray)]/30 scale-[1.02] z-20';
    } else if (xrayStatus === 'artifact') {
      xrayClass = 'border-dashed border-[var(--text-2)] z-10';
    } else if (xrayStatus === 'negative_warn') {
      xrayClass = 'border-[var(--status-deprecated)] ring-2 ring-[var(--status-deprecated)]/30 z-10';
    } else if (xrayStatus === 'dropped') {
      xrayClass = 'opacity-20 scale-[0.98] pointer-events-none';
    }
  }

  const takeaway =
    nodeData.artifact?.coreTakeaway ||
    nodeData.userQuery ||
    '点击展开阅读抽屉查看详细推演...';

  return (
    <div
      onClick={() => selectNode(id)}
      className={`group relative ${
        isRoot ? 'w-[260px] h-[86px]' : 'w-[240px] h-[80px]'
      } rounded-[12px] border px-3 py-2.5 transition-all duration-200 select-none cursor-pointer flex flex-col justify-between overflow-hidden backdrop-blur-md ${borderClass} ${bgClass} ${selectionClass} ${
        isTargetOfCitation ? 'citation-target-pulse ring-2 ring-[var(--accent-focus)]' : ''
      } ${isStreamingHere ? 'node-streaming-breathe' : ''} ${xrayClass}`}
    >
      {/* 输入连接点 (Handle) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 hover:!w-2.5 hover:!h-2.5 !bg-[var(--line-strong)] hover:!bg-[var(--text-1)] !border-none transition-all"
      />

      {/* 顶部信息行：类别微色条 + 标题 + 几何状态指示器 */}
      <div className="flex items-center justify-between gap-1 leading-none mb-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {/* 左上角 3px x 12px 垂直圆角微色条 */}
          <div className={`w-[3px] h-[12px] rounded-full shrink-0 ${categoryMeta.stripColor}`} />
          <span className="text-[11px] font-medium text-[var(--text-3)] shrink-0">
            {categoryMeta.label}
          </span>
          <span
            className={`text-[13px] font-semibold text-[var(--text-1)] truncate max-w-[125px] ${
              isDeprecated ? 'line-through text-[var(--text-3)]' : ''
            }`}
            title={nodeData.title}
          >
            {nodeData.title || '探索节点'}
          </span>
        </div>

        {/* 右上角纯几何状态图标 (零 Emoji) */}
        <div className="flex items-center gap-1 shrink-0 text-[var(--text-3)]">
          {nodeData.manualState === 'pinned' && (
            <span title="已置顶参考">
              <Pin className="w-3 h-3 text-[var(--status-pinned)] fill-current" strokeWidth={1.6} />
            </span>
          )}
          {nodeData.mountedChunks && nodeData.mountedChunks.length > 0 && (
            <span title={`挂载了 ${nodeData.mountedChunks.length} 个资料切片`}>
              <Paperclip className="w-3 h-3 text-[var(--text-3)]" strokeWidth={1.6} />
            </span>
          )}

          {/* 纯几何状态标识 (DESIGN.md §5.2) */}
          {isVerified && (
            <span title="已验证" className="text-[var(--status-verified)]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" fill="currentColor" fillOpacity="0.15" />
                <path d="M3.5 6.2L5 7.7L8.5 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          {isDeprecated && (
            <span title="已证伪" className="text-[var(--status-deprecated)]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 9L9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
          )}
          {nodeData.status === 'exploring' && !isRoot && (
            <span title="探索中" className="text-[var(--status-exploring)]">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" />
              </svg>
            </span>
          )}

          {/* 删除按钮 (仅 Hover 显示) */}
          {!isRoot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-[var(--status-deprecated)] p-0.5 rounded transition-all ml-0.5 cursor-pointer text-[var(--text-4)]"
              title="删除此节点"
            >
              <Trash2 className="w-3 h-3" strokeWidth={1.6} />
            </button>
          )}
        </div>
      </div>

      {/* 正文：2 行截断的核心摘要 */}
      <div
        className="text-[11.5px] leading-[1.45] text-[var(--text-3)] line-clamp-2 overflow-hidden flex-1 font-normal"
        title={takeaway}
      >
        {isStreamingHere ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-1)] font-mono text-[11px]">
            <span>推演中</span>
            <span className="typewriter-cursor" />
          </span>
        ) : (
          takeaway
        )}
      </div>

      {/* 输出连接点 (Handle) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 hover:!w-2.5 hover:!h-2.5 !bg-[var(--line-strong)] hover:!bg-[var(--text-1)] !border-none transition-all"
      />
    </div>
  );
});

CapsuleNode.displayName = 'CapsuleNode';
