// components/Modals/PromptInspectorModal.tsx
import React, { useState } from 'react';
import { X, Copy, Check, FileCode2, Clock, Zap } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export const PromptInspectorModal: React.FC = () => {
  const isInspectorOpen = useCanvasStore((s) => s.isInspectorOpen);
  const setIsInspectorOpen = useCanvasStore((s) => s.setIsInspectorOpen);
  const compiledPrompt = useCanvasStore((s) => s.compiledPrompt);
  const compiledDurationMs = useCanvasStore((s) => s.compiledDurationMs);
  const activeNodeId = useCanvasStore((s) => s.activeNodeId);
  const graph = useCanvasStore((s) => s.graph);

  const [copied, setCopied] = useState(false);

  if (!isInspectorOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeNode = activeNodeId ? graph.nodes[activeNodeId] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-[16px] glass-elevated border border-[var(--line-default)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-subtle)] bg-[var(--surface-2)]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--surface-3)] border border-[var(--line-default)] flex items-center justify-center text-[var(--accent-focus)] shadow-xs">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-1)] flex items-center gap-2">
                <span>认知证据阶梯案卷检查器</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--line-subtle)]">
                  Epistemic Hierarchy Spec
                </span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">
                当前对焦节点：{activeNode?.title || activeNodeId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-[6px] bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--line-subtle)]">
              <Clock className="w-3 h-3 text-[var(--text-3)]" />
              <span>耗时: {compiledDurationMs || '<1'}ms</span>
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[6px] bg-[var(--text-1)] hover:opacity-90 text-[var(--surface-1)] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制 XML'}</span>
            </button>

            <button
              onClick={() => setIsInspectorOpen(false)}
              className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 说明横条 */}
        <div className="px-6 py-2.5 bg-[var(--surface-2)] border-b border-[var(--line-subtle)] text-[11px] text-[var(--text-2)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[var(--accent-focus)] shrink-0" />
            <span>
              已将多轮伪造聊天流编译为单轮案卷：严格划分 Tier 1 绝对权威、Tier 2 脉络共识与反向红线约束。
            </span>
          </div>
        </div>

        {/* XML 视图 */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface-3)] font-mono text-xs leading-relaxed text-[var(--text-2)] selection:bg-[var(--accent-focus)]/25">
          <pre className="whitespace-pre-wrap select-text font-mono">
            {compiledPrompt ||
              '<!-- 暂无已编译的提示词，请在阅读抽屉中聚焦输入框或点击重新生成以触发编译 -->'}
          </pre>
        </div>
      </div>
    </div>
  );
};
