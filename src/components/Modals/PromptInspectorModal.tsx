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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                认知证据阶梯案卷检查器 (Epistemic Hierarchy Prompt Spec)
              </h2>
              <span className="text-[11px] text-slate-400">
                当前对焦节点：{activeNode?.title || activeNodeId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              <Clock className="w-3 h-3" />
              <span>耗时: {compiledDurationMs || '<1'}ms</span>
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制 XML'}</span>
            </button>

            <button
              onClick={() => setIsInspectorOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 说明横条 */}
        <div className="px-6 py-2.5 bg-indigo-950/30 border-b border-indigo-900/40 text-[11px] text-indigo-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              已将多轮伪造聊天流编译为单轮案卷：严格划分 Tier 1 绝对权威、Tier 2 脉络共识与反向红线约束。
            </span>
          </div>
        </div>

        {/* XML 视图 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/90 font-mono text-xs leading-relaxed text-slate-300">
          <pre className="whitespace-pre-wrap select-text">
            {compiledPrompt ||
              '<!-- 暂无已编译的提示词，请在阅读抽屉中聚焦输入框或点击重新生成以触发编译 -->'}
          </pre>
        </div>
      </div>
    </div>
  );
};
