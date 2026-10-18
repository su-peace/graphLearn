// components/Modals/DeleteNodeModal.tsx
import React, { useState } from 'react';
import { X, Trash2, GitFork, Link2, AlertTriangle, Layers } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export const DeleteNodeModal: React.FC = () => {
  const graph = useCanvasStore((s) => s.graph);
  const nodeToDeleteId = useCanvasStore((s) => s.nodeToDeleteId);
  const setNodeToDeleteId = useCanvasStore((s) => s.setNodeToDeleteId);
  const deleteNodeWithOptions = useCanvasStore((s) => s.deleteNodeWithOptions);

  const [strategy, setStrategy] = useState<'reparent' | 'cascade' | 'isolate'>('reparent');

  if (!nodeToDeleteId) return null;

  const targetNode = graph.nodes[nodeToDeleteId];
  if (!targetNode) return null;

  // 统计直接子节点与全部后代节点
  const directChildren = Object.values(graph.nodes).filter((n) =>
    n.parentIds?.includes(nodeToDeleteId)
  );

  const getDescendantIds = (rootId: string): string[] => {
    const visited = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const n of Object.values(graph.nodes)) {
        if (n.parentIds?.includes(current) && !visited.has(n.id)) {
          visited.add(n.id);
          queue.push(n.id);
        }
      }
    }
    return Array.from(visited);
  };

  const allDescendants = getDescendantIds(nodeToDeleteId);
  const hasChildren = directChildren.length > 0;

  const handleConfirm = async () => {
    await deleteNodeWithOptions(nodeToDeleteId, strategy);
    setNodeToDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg rounded-[16px] glass-elevated border border-[var(--line-default)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-subtle)] bg-[var(--surface-2)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-1)] flex items-center gap-2">
                <span>删除节点确认</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--line-subtle)]">
                  {targetNode.title || nodeToDeleteId}
                </span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">
                请确认删除策略以及下属分支的处理方式
              </span>
            </div>
          </div>
          <button
            onClick={() => setNodeToDeleteId(null)}
            className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* 节点概览 */}
          <div className="p-3.5 rounded-[10px] bg-[var(--surface-2)] border border-[var(--line-subtle)] flex flex-col gap-1">
            <span className="text-[10px] font-mono font-medium text-[var(--text-3)] uppercase tracking-wider">
              待删除目标
            </span>
            <div className="text-[var(--text-1)] font-semibold text-sm truncate">
              {targetNode.title}
            </div>
            <div className="text-[11px] text-[var(--text-3)] line-clamp-2">
              提问：{targetNode.userQuery}
            </div>
          </div>

          {hasChildren ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[var(--text-2)]">
                <span className="font-medium flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
                  <span>该节点含有 {directChildren.length} 个直接子分支 (共 {allDescendants.length} 个后代节点)</span>
                </span>
                <span className="text-[11px] text-[var(--text-3)]">请选择处置方式：</span>
              </div>

              {/* 选项 1: 保留并自动提升父级 (推荐) */}
              <button
                type="button"
                onClick={() => setStrategy('reparent')}
                className={`w-full p-3 rounded-[10px] border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  strategy === 'reparent'
                    ? 'bg-[var(--surface-2)] border-[var(--accent-focus)] text-[var(--text-1)] shadow-xs'
                    : 'bg-[var(--surface-1)] border-[var(--line-subtle)] text-[var(--text-3)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div className={`p-2 rounded-[6px] shrink-0 mt-0.5 ${strategy === 'reparent' ? 'bg-[var(--accent-focus)] text-[var(--surface-1)]' : 'bg-[var(--surface-3)] text-[var(--text-3)]'}`}>
                  <Link2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--text-1)]">保留子节点，并自动向上承接 (推荐)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      脉络不断裂
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-3)] leading-relaxed">
                    子节点将自动连接到当前节点的父节点；若无上级父节点，则平移连接至根目标。
                  </span>
                </div>
              </button>

              {/* 选项 2: 保留子节点为独立节点 */}
              <button
                type="button"
                onClick={() => setStrategy('isolate')}
                className={`w-full p-3 rounded-[10px] border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  strategy === 'isolate'
                    ? 'bg-[var(--surface-2)] border-[var(--accent-focus)] text-[var(--text-1)] shadow-xs'
                    : 'bg-[var(--surface-1)] border-[var(--line-subtle)] text-[var(--text-3)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div className={`p-2 rounded-[6px] shrink-0 mt-0.5 ${strategy === 'isolate' ? 'bg-[var(--accent-focus)] text-[var(--surface-1)]' : 'bg-[var(--surface-3)] text-[var(--text-3)]'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[var(--text-1)]">仅删除当前节点，子节点保持孤立</span>
                  <span className="text-[11px] text-[var(--text-3)] leading-relaxed">
                    仅移除当前节点，子节点依然停留在画布上，不建立向上链接。
                  </span>
                </div>
              </button>

              {/* 选项 3: 连同子节点一起级联删除 */}
              <button
                type="button"
                onClick={() => setStrategy('cascade')}
                className={`w-full p-3 rounded-[10px] border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  strategy === 'cascade'
                    ? 'bg-rose-500/10 border-rose-500 text-[var(--text-1)] shadow-xs'
                    : 'bg-[var(--surface-1)] border-[var(--line-subtle)] text-[var(--text-3)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div className={`p-2 rounded-[6px] shrink-0 mt-0.5 ${strategy === 'cascade' ? 'bg-rose-600 text-white' : 'bg-[var(--surface-3)] text-[var(--text-3)]'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-rose-500">级联删除整棵子树 (共 {allDescendants.length + 1} 个节点)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      彻底清除
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-3)] leading-relaxed">
                    将连同下属所有的子分支、孙分支节点一并彻底永久删除，不可恢复。
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--text-2)] bg-[var(--surface-2)] p-3 rounded-[10px] border border-[var(--line-subtle)] flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[var(--text-3)] shrink-0" />
              <span>该节点无下游子分支，删除后不会影响其他节点脉络。</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-[var(--line-subtle)] bg-[var(--surface-2)]/30">
          <button
            type="button"
            onClick={() => setNodeToDeleteId(null)}
            className="px-4 py-2 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] font-medium transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-[8px] bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  );
};
