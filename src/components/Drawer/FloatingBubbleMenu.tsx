// components/Drawer/FloatingBubbleMenu.tsx
import React, { useState } from 'react';
import { Sprout, Lightbulb, Zap, Edit3, X, Sparkles } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

interface FloatingBubbleMenuProps {
  selectedText: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  activeNodeId: string;
}

export const FloatingBubbleMenu: React.FC<FloatingBubbleMenuProps> = ({
  selectedText,
  position,
  onClose,
  activeNodeId,
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const highlightToBranch = useCanvasStore((s) => s.highlightToBranch);

  if (!position || !selectedText) return null;

  const handleAction = async (type: 'concept' | 'example' | 'principle' | 'custom') => {
    if (type === 'custom' && !isCustomMode) {
      setIsCustomMode(true);
      setCustomPrompt(`针对「${selectedText}」，探讨其在真实工程系统中的实现细节、边界条件与避坑指南`);
      return;
    }

    if (type === 'principle') {
      await highlightToBranch(
        activeNodeId,
        selectedText,
        'custom',
        `深入剖析「${selectedText}」的底层底层实现原理、性能开销与权衡取舍 (Trade-offs)`
      );
    } else {
      await highlightToBranch(
        activeNodeId,
        selectedText,
        type === 'custom' ? 'custom' : type,
        customPrompt
      );
    }
    onClose();
  };

  const previewSnippet =
    selectedText.length > 28 ? selectedText.slice(0, 28) + '...' : selectedText;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => {
        // 防止点击浮动气泡时浏览器清除光标文本选区
        e.stopPropagation();
      }}
      className="floating-bubble-menu fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 border border-indigo-500/50 rounded-2xl shadow-2xl backdrop-blur-xl p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs text-slate-200 ring-1 ring-white/10"
    >
      {/* 顶部选中文本小徽章 */}
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5 mb-0.5">
        <div className="flex items-center gap-1.5 truncate max-w-[260px]">
          <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="text-slate-400 shrink-0">已选:</span>
          <span className="font-semibold text-sky-300 truncate font-mono">“{previewSnippet}”</span>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          type="button"
          className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!isCustomMode ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleAction('concept')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 hover:text-emerald-100 font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            <span>🌱 追问此概念</span>
          </button>

          <button
            onClick={() => handleAction('example')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900 hover:text-amber-100 font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>💡 举例阐述</span>
          </button>

          <button
            onClick={() => handleAction('principle')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-950/80 border border-violet-500/50 text-violet-300 hover:bg-violet-900 hover:text-violet-100 font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>⚡ 核心原理</span>
          </button>

          <button
            onClick={() => handleAction('custom')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>自定义</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-1 w-72">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>输入追问 prompt（将创建衍生子节点）:</span>
            <button
              onClick={() => setIsCustomMode(false)}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAction('custom');
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">按 Enter 发送</span>
            <button
              onClick={() => handleAction('custom')}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-[11px] shadow-md transition-colors"
            >
              创建分支并推演
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
