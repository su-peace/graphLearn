// components/Drawer/CitationPill.tsx
import React from 'react';
import { ExternalLink, Bookmark } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

interface CitationPillProps {
  refId: string;
  onNavigate?: (nodeId: string) => void;
}

export const CitationPill: React.FC<CitationPillProps> = ({ refId, onNavigate }) => {
  const graph = useCanvasStore((s) => s.graph);
  const triggerCitationFocus = useCanvasStore((s) => s.triggerCitationFocus);

  const targetNode = graph.nodes[refId];
  const title = targetNode?.title || refId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerCitationFocus(refId);
    onNavigate?.(refId);
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 mx-1 text-xs font-mono font-medium rounded-full bg-sky-950/80 border border-sky-500/40 text-sky-300 hover:bg-sky-900 hover:border-sky-400 hover:text-sky-100 transition-all cursor-pointer shadow-sm group select-none"
      title={`点击平滑聚焦至节点: ${title}`}
    >
      <Bookmark className="w-3 h-3 text-sky-400 group-hover:scale-110 transition-transform" />
      <span>Ref: {title}</span>
      <ExternalLink className="w-2.5 h-2.5 text-sky-400/70" />
    </button>
  );
};
