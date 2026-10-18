// components/Drawer/CitationPill.tsx
import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

interface CitationPillProps {
  refId: string;
  onNavigate?: (nodeId: string) => void;
}

export const CitationPill: React.FC<CitationPillProps> = ({ refId, onNavigate }) => {
  const graph = useCanvasStore((s) => s.graph);
  const triggerCitationFocus = useCanvasStore((s) => s.triggerCitationFocus);
  const [showPreview, setShowPreview] = useState(false);

  const targetNode = graph.nodes[refId];
  const title = targetNode?.title || refId;
  const takeaway =
    targetNode?.artifact?.coreTakeaway ||
    targetNode?.userQuery ||
    '点击平移对焦至该节点拓扑位置';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerCitationFocus(refId);
    onNavigate?.(refId);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <button
        onClick={handleClick}
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 mx-1 text-xs font-mono font-medium rounded-md bg-[var(--surface-2)] border border-[var(--line-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--line-strong)] transition-all cursor-pointer shadow-xs select-none active:scale-95"
        title={`跳转至节点: ${title}`}
      >
        <ArrowUpRight className="w-3 h-3 text-[var(--text-3)]" strokeWidth={1.6} />
        <span className="truncate max-w-[140px]">{title}</span>
      </button>

      {/* 悬停卡片即时预览 (DESIGN.md §5.5) */}
      {showPreview && targetNode && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 glass-elevated rounded-xl shadow-xl z-50 text-left pointer-events-none block animate-in fade-in zoom-in-95 duration-150">
          <span className="flex items-center justify-between gap-1.5 text-[11px] font-semibold text-[var(--text-1)] mb-1 border-b border-[var(--line-subtle)] pb-1">
            <span className="truncate">{title}</span>
            <span className="text-[9px] font-mono text-[var(--text-3)] font-normal uppercase">
              {targetNode.category}
            </span>
          </span>
          <span className="text-[11.5px] leading-relaxed text-[var(--text-2)] line-clamp-3 block font-normal">
            {takeaway}
          </span>
        </span>
      )}
    </span>
  );
};
