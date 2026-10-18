// components/Drawer/FloatingBubbleMenu.tsx
import React, { useState } from 'react';
import { HelpCircle, FileText, Cpu, Edit3, X } from 'lucide-react';
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
      setCustomPrompt(`针对「${selectedText}」，探讨其在真实工程系统中的实现细节、边界条件与权衡`);
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
    selectedText.length > 26 ? selectedText.slice(0, 26) + '...' : selectedText;

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
      className="floating-bubble-menu fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3 glass-elevated rounded-2xl shadow-xl p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs text-[var(--text-1)]"
    >
      {/* 顶部选中文本微徽章 */}
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-[var(--text-3)] border-b border-[var(--line-subtle)] pb-1 mb-0.5">
        <div className="flex items-center gap-1.5 truncate max-w-[260px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-focus)] shrink-0" />
          <span className="truncate font-mono">“{previewSnippet}”</span>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          type="button"
          className="p-0.5 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          title="关闭"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.6} />
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[var(--text-2)]" strokeWidth={1.6} />
            <span>追问概念</span>
          </button>

          <button
            onClick={() => handleAction('example')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--text-2)]" strokeWidth={1.6} />
            <span>举例阐述</span>
          </button>

          <button
            onClick={() => handleAction('principle')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[var(--text-2)]" strokeWidth={1.6} />
            <span>底层机理</span>
          </button>

          <button
            onClick={() => handleAction('custom')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-3)] hover:opacity-90 text-[var(--text-1)] font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[var(--text-2)]" strokeWidth={1.6} />
            <span>自定义</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-1 w-72">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-3)]">
            <span>输入追问命题 (派生子节点):</span>
            <button
              onClick={() => setIsCustomMode(false)}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X className="w-3 h-3" strokeWidth={1.6} />
            </button>
          </div>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface-2)] border border-[var(--line-default)] rounded-xl text-[var(--text-1)] focus:outline-none focus:border-[var(--line-strong)] leading-relaxed resize-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAction('custom');
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-3)] font-mono">Enter 确认</span>
            <button
              onClick={() => handleAction('custom')}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="px-3 py-1 bg-[var(--accent-primary)] text-[var(--accent-fg)] rounded-lg font-medium text-[11px] shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
            >
              派生并推演
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
