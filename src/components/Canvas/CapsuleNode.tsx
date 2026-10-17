// components/Canvas/CapsuleNode.tsx
import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Pin, Paperclip, CheckCircle2, AlertOctagon, HelpCircle, Trash2 } from 'lucide-react';
import type { CanvasNodeData, NodeCategory } from '../../types/canvas';
import { useCanvasStore } from '../../store/canvasStore';

const CATEGORY_COLORS: Record<NodeCategory, { bg: string; text: string; label: string }> = {
  root_goal: { bg: 'bg-amber-500/20', text: 'text-amber-300 border-amber-500/40', label: '目标' },
  core_conclusion: { bg: 'bg-blue-500/20', text: 'text-blue-300 border-blue-500/40', label: '结论' },
  code_impl: { bg: 'bg-violet-500/20', text: 'text-violet-300 border-violet-500/40', label: '代码' },
  concept_qa: { bg: 'bg-cyan-500/20', text: 'text-cyan-300 border-cyan-500/40', label: '概念' },
  chitchat_debug: { bg: 'bg-zinc-500/20', text: 'text-zinc-300 border-zinc-500/40', label: '调整' },
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

  // 状态边框规范
  let borderStyle = 'border-slate-700 bg-slate-900/90';
  if (nodeData.status === 'verified') {
    borderStyle = 'border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.25)] bg-slate-900/95';
  } else if (nodeData.status === 'deprecated') {
    borderStyle = 'border-rose-400/80 border-dashed bg-rose-950/20';
  } else {
    borderStyle = 'border-slate-600/70 bg-slate-900/90';
  }

  // X-Ray 预览视觉语言
  let xrayClass = '';
  if (isXrayActive) {
    if (xrayStatus === 'full') {
      xrayClass = 'ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.7)] scale-[1.03] z-20';
    } else if (xrayStatus === 'artifact') {
      xrayClass = 'ring-2 ring-purple-400/80 border-dashed shadow-[0_0_10px_rgba(168,85,247,0.4)] z-10';
    } else if (xrayStatus === 'negative_warn') {
      xrayClass = 'ring-2 ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)] z-10';
    } else if (xrayStatus === 'dropped') {
      xrayClass = 'opacity-25 blur-[0.2px] scale-[0.98]';
    }
  }

  const categoryMeta = CATEGORY_COLORS[nodeData.category] || CATEGORY_COLORS.concept_qa;
  const takeaway =
    nodeData.artifact?.coreTakeaway ||
    nodeData.userQuery ||
    '点击展开阅读抽屉查看详细推演...';

  return (
    <div
      onClick={() => selectNode(id)}
      className={`group relative w-[240px] h-[76px] rounded-lg border p-2 transition-all duration-200 select-none cursor-pointer flex flex-col justify-between overflow-hidden backdrop-blur-md ${borderStyle} ${
        selected || isActive ? 'ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : ''
      } ${isTargetOfCitation ? 'citation-target-pulse ring-4 ring-sky-400' : ''} ${xrayClass}`}
    >

      {/* 输入 Handle (左侧，允许多父连接) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      {/* 顶部元信息栏 */}
      <div className="flex items-center justify-between gap-1 text-[11px] leading-none mb-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className={`px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 ${categoryMeta.bg} ${categoryMeta.text}`}
          >
            {categoryMeta.label}
          </span>
          <span className="font-semibold text-slate-200 truncate max-w-[110px]" title={nodeData.title}>
            {nodeData.title || '探索节点'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {nodeData.manualState === 'pinned' && (
            <span title="Tier 1 强制置顶权威">
              <Pin className="w-3 h-3 text-amber-400 fill-amber-400/40" />
            </span>
          )}
          {nodeData.mountedChunks && nodeData.mountedChunks.length > 0 && (
            <span title={`挂载了 ${nodeData.mountedChunks.length} 个资料切片`}>
              <Paperclip className="w-3 h-3 text-sky-400" />
            </span>
          )}
          {nodeData.status === 'verified' && (
            <span title="已验证 (可跨分支检索)">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </span>
          )}
          {nodeData.status === 'deprecated' && (
            <span title="已证伪 (转换为反向避坑约束)">
              <AlertOctagon className="w-3 h-3 text-rose-400" />
            </span>
          )}
          {nodeData.status === 'exploring' && (
            <span title="探索草稿态">
              <HelpCircle className="w-3 h-3 text-slate-400" />
            </span>
          )}
          {!isRoot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-all ml-0.5 cursor-pointer text-slate-500 hover:scale-110"
              title="删除此节点"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>


      {/* 正文 2 行截断的 50 字核心结论 */}
      <div
        className="text-[11px] leading-tight text-slate-300/90 line-clamp-2 overflow-hidden flex-1"
        title={takeaway}
      >
        {isStreamingHere ? (
          <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            正在流式生成推演...
          </span>
        ) : (
          takeaway
        )}
      </div>

      {/* 输出 Handle (右侧) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
});

CapsuleNode.displayName = 'CapsuleNode';

