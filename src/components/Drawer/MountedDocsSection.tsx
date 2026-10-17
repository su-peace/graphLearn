// components/Drawer/MountedDocsSection.tsx
import React, { useRef } from 'react';
import { Paperclip, Plus, Trash2, FileText } from 'lucide-react';
import type { ReferenceChunk } from '../../types/canvas';
import { estimateTokens } from '../../services/tokenEstimator';

interface MountedDocsSectionProps {
  nodeId: string;
  chunks: ReferenceChunk[];
  onAddChunk: (chunk: ReferenceChunk) => void;
  onRemoveChunk: (chunkId: string) => void;
}

export const MountedDocsSection: React.FC<MountedDocsSectionProps> = ({
  chunks,
  onAddChunk,
  onRemoveChunk,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const chunkId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const tokens = estimateTokens(content);

      onAddChunk({
        chunkId,
        sourceTitle: file.name,
        content,
        tokens,
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const chunkId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const tokens = estimateTokens(content);

      onAddChunk({
        chunkId,
        sourceTitle: file.name,
        content,
        tokens,
      });
    };
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
          <Paperclip className="w-3.5 h-3.5" />
          <span>挂载外部资料切片 (Tier 1 绝对权威)</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-300 rounded border border-sky-800">
            {chunks.length} 篇
          </span>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="flex items-center gap-1 px-2 py-1 text-[11px] bg-sky-950/70 border border-sky-600/50 hover:bg-sky-900 text-sky-200 rounded font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>添加文档</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.json,.c,.h,.ts,.rs"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {chunks.length === 0 ? (
        <div className="text-[11px] text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-lg">
          拖入 Markdown / 文本文件挂载至此节点（以最高 Tier 1 权重进入上下文）
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
          {chunks.map((c) => (
            <div
              key={c.chunkId}
              className="flex items-start justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-1.5 overflow-hidden">
                <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-200 truncate">{c.sourceTitle}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">~{c.tokens} Tokens</span>
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                    {c.content.slice(0, 70)}...
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveChunk(c.chunkId)}
                className="text-slate-500 hover:text-rose-400 p-1 rounded shrink-0 transition-colors"
                title="移除该切片"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
