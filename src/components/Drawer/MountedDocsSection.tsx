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
      className="p-4 bg-[var(--surface-2)] border border-[var(--line-default)] rounded-[12px] flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-1)]">
          <Paperclip className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
          <span>挂载外部资料切片 (Tier 1 绝对权威)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--surface-1)] text-[var(--text-3)] rounded border border-[var(--line-subtle)]">
            {chunks.length} 篇
          </span>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[var(--surface-3)] hover:bg-[var(--surface-1)] border border-[var(--line-default)] text-[var(--text-1)] rounded-[6px] font-medium transition-colors cursor-pointer"
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
        <div className="text-[11px] text-[var(--text-3)] py-4 text-center border border-dashed border-[var(--line-default)] rounded-[8px]">
          拖入 Markdown / 文本文件挂载至此节点（以最高 Tier 1 权重进入上下文）
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {chunks.map((c) => (
            <div
              key={c.chunkId}
              className="flex items-start justify-between gap-2 p-2.5 rounded-[8px] bg-[var(--surface-1)] border border-[var(--line-subtle)] text-xs text-[var(--text-2)] hover:border-[var(--line-strong)] transition-colors"
            >
              <div className="flex items-start gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-[var(--accent-focus)] shrink-0 mt-0.5" />
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-1)] truncate">{c.sourceTitle}</span>
                    <span className="text-[10px] font-mono text-[var(--text-3)] shrink-0">~{c.tokens} Tokens</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-3)] line-clamp-1 font-mono">
                    {c.content.slice(0, 70)}...
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveChunk(c.chunkId)}
                className="text-[var(--text-3)] hover:text-rose-500 p-1 rounded shrink-0 transition-colors cursor-pointer"
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
