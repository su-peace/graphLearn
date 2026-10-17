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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>删除节点确认</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {targetNode.title || nodeToDeleteId}
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                请确认删除策略以及下属分支的处理方式
              </span>
            </div>
          </div>
          <button
            onClick={() => setNodeToDeleteId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* 节点概览 */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              待删除目标
            </span>
            <div className="text-slate-100 font-bold text-sm truncate">
              {targetNode.title}
            </div>
            <div className="text-[11px] text-slate-400 line-clamp-2">
              提问：{targetNode.userQuery}
            </div>
          </div>

          {hasChildren ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                  <span>该节点含有 {directChildren.length} 个直接子分支 (共 {allDescendants.length} 个后代节点)</span>
                </span>
                <span className="text-[11px] text-slate-400">请选择子节点处置方式：</span>
              </div>

              {/* 选项 1: 保留并自动提升父级 (推荐) */}
              <button
                type="button"
                onClick={() => setStrategy('reparent')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  strategy === 'reparent'
                    ? 'bg-indigo-950/70 border-indigo-500 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${strategy === 'reparent' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Link2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100">保留子节点，并自动向上承接 (推荐)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                      脉络不断裂
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    子节点将自动连接到当前节点的父节点；若无上级父节点，则平移连接至根目标。
                  </span>
                </div>
              </button>

              {/* 选项 2: 保留子节点为独立节点 */}
              <button
                type="button"
                onClick={() => setStrategy('isolate')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  strategy === 'isolate'
                    ? 'bg-indigo-950/70 border-indigo-500 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${strategy === 'isolate' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-100">仅删除当前节点，子节点保持孤立</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    仅移除当前节点，子节点依然停留在画布上，不建立向上链接。
                  </span>
                </div>
              </button>

              {/* 选项 3: 连同子节点一起级联删除 */}
              <button
                type="button"
                onClick={() => setStrategy('cascade')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  strategy === 'cascade'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.25)] ring-1 ring-rose-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${strategy === 'cascade' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-rose-300">级联删除整棵子树 (共 {allDescendants.length + 1} 个节点)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                      彻底清除
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    将连同下属所有的子分支、孙分支节点一并彻底永久删除，不可恢复。
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>该节点无下游子分支，删除后不会影响其他节点脉络。</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setNodeToDeleteId(null)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  );
};
