// components/Modals/ConnectNodesModal.tsx
import React, { useState, useMemo } from 'react';
import {
  X,
  Link2,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { validateNodeConnection } from '../../services/graphTopology';
import type { NodeCategory } from '../../types/canvas';

const CATEGORY_NAMES: Record<NodeCategory, string> = {
  root_goal: '核心命题',
  core_conclusion: '核心结论',
  code_impl: '代码实现',
  concept_qa: '概念追问',
  chitchat_debug: '演算排障',
};

const ConnectNodesModalContent: React.FC = () => {
  const closeConnectModal = useCanvasStore((s) => s.closeConnectModal);
  const connectModalSourceId = useCanvasStore((s) => s.connectModalSourceId);
  const connectModalTargetId = useCanvasStore((s) => s.connectModalTargetId);
  const activeNodeId = useCanvasStore((s) => s.activeNodeId);
  const graph = useCanvasStore((s) => s.graph);
  const connectNodes = useCanvasStore((s) => s.connectNodes);

  // 初始化选择项（组件挂载时计算默认值，避免 useEffect 内触发 cascading render）
  const [sourceId, setSourceId] = useState(() => {
    const allNodeIds = Object.keys(graph.nodes);
    return connectModalSourceId || activeNodeId || allNodeIds[0] || '';
  });
  const [targetId, setTargetId] = useState(() => {
    const allNodeIds = Object.keys(graph.nodes);
    const defaultSource = connectModalSourceId || activeNodeId || allNodeIds[0] || '';
    return (
      connectModalTargetId ||
      allNodeIds.find((id) => id !== defaultSource) ||
      ''
    );
  });
  const [searchSource, setSearchSource] = useState('');
  const [searchTarget, setSearchTarget] = useState('');

  const allNodes = useMemo(() => Object.values(graph.nodes), [graph.nodes]);

  const filteredSourceNodes = useMemo(() => {
    if (!searchSource.trim()) return allNodes;
    const q = searchSource.toLowerCase();
    return allNodes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
    );
  }, [allNodes, searchSource]);

  const filteredTargetNodes = useMemo(() => {
    if (!searchTarget.trim()) return allNodes;
    const q = searchTarget.toLowerCase();
    return allNodes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
    );
  }, [allNodes, searchTarget]);

  const validation = useMemo(() => {
    return validateNodeConnection(graph.nodes, sourceId, targetId);
  }, [graph.nodes, sourceId, targetId]);

  const handleSwap = () => {
    const temp = sourceId;
    setSourceId(targetId);
    setTargetId(temp);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validation.isValid) return;

    const res = connectNodes(sourceId, targetId);
    if (res.success) {
      closeConnectModal();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeConnectModal();
    } else if (e.key === 'Enter' && validation.isValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sourceNode = graph.nodes[sourceId];
  const targetNode = graph.nodes[targetId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in select-none"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xl rounded-[16px] glass-elevated border border-[var(--line-default)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-subtle)] bg-[var(--surface-2)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--surface-3)] border border-[var(--line-subtle)] flex items-center justify-center text-[var(--accent-focus)]">
              <Link2 className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-1)] flex items-center gap-2">
                <span>建立节点拓扑联系</span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">
                在有向无环图 (DAG) 中建立前置依赖与后置派生知识输入链路
              </span>
            </div>
          </div>
          <button
            onClick={closeConnectModal}
            className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 关系流向动态预览胶囊 */}
        <div className="px-6 py-4 bg-[var(--surface-1)]/40 border-b border-[var(--line-subtle)]">
          <div className="flex items-center justify-between gap-3">
            {/* 起点节点预览卡 */}
            <div className="flex-1 p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--line-default)] overflow-hidden">
              <div className="text-[10px] uppercase font-mono text-[var(--text-3)] mb-1 flex items-center justify-between">
                <span>前置依赖 (Parent)</span>
                <span className="text-[9px] px-1 rounded bg-[var(--surface-3)]">
                  {sourceNode ? CATEGORY_NAMES[sourceNode.category] : '未选择'}
                </span>
              </div>
              <div
                className="font-medium text-xs text-[var(--text-1)] truncate"
                title={sourceNode?.title || '请选择前置节点'}
              >
                {sourceNode?.title || '请选择前置节点'}
              </div>
            </div>

            {/* 中间指向箭头与调换按钮 */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-3)] hover:text-[var(--accent-focus)] border border-[var(--line-subtle)] transition-all cursor-pointer active:scale-90"
                title="调换连接方向"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--accent-focus)] animate-pulse" />
            </div>

            {/* 目标节点预览卡 */}
            <div className="flex-1 p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--line-default)] overflow-hidden">
              <div className="text-[10px] uppercase font-mono text-[var(--text-3)] mb-1 flex items-center justify-between">
                <span>后置派生 (Child)</span>
                <span className="text-[9px] px-1 rounded bg-[var(--surface-3)]">
                  {targetNode ? CATEGORY_NAMES[targetNode.category] : '未选择'}
                </span>
              </div>
              <div
                className="font-medium text-xs text-[var(--text-1)] truncate"
                title={targetNode?.title || '请选择目标节点'}
              >
                {targetNode?.title || '请选择目标节点'}
              </div>
            </div>
          </div>

          {/* 实时校验状态提示 */}
          <div className="mt-3">
            {validation.isValid ? (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-[8px] border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>连接关系合法，符合有向无环图 (DAG) 拓扑规范</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-[8px] border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validation.reason}</span>
              </div>
            )}
          </div>
        </div>

        {/* 双栏节点挑选器 */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* 选择起点节点 */}
          <div className="space-y-2">
            <label className="font-semibold text-[var(--text-1)] flex items-center justify-between">
              <span>选择起点 (前置节点)</span>
              <span className="text-[10px] font-mono text-[var(--text-3)]">
                共 {filteredSourceNodes.length} 个
              </span>
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-3)]" />
              <input
                type="text"
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                placeholder="搜索起点节点标题或ID..."
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-1)] border border-[var(--line-default)] focus:border-[var(--accent-focus)] rounded-[6px] text-xs outline-none transition-colors"
              />
            </div>

            <div className="h-44 overflow-y-auto space-y-1 p-1 bg-[var(--surface-1)] border border-[var(--line-default)] rounded-[8px]">
              {filteredSourceNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSourceId(node.id)}
                  className={`p-2 rounded-[6px] cursor-pointer flex items-center justify-between transition-colors ${
                    sourceId === node.id
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-fg)] font-medium shadow-xs'
                      : 'hover:bg-[var(--surface-2)] text-[var(--text-2)]'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="block truncate">{node.title}</span>
                    <span className="text-[10px] opacity-70 font-mono">{node.id}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 bg-[var(--surface-3)] text-[var(--text-3)]">
                    {CATEGORY_NAMES[node.category]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 选择目标节点 */}
          <div className="space-y-2">
            <label className="font-semibold text-[var(--text-1)] flex items-center justify-between">
              <span>选择目标 (后置节点)</span>
              <span className="text-[10px] font-mono text-[var(--text-3)]">
                共 {filteredTargetNodes.length} 个
              </span>
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-3)]" />
              <input
                type="text"
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
                placeholder="搜索目标节点标题或ID..."
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-1)] border border-[var(--line-default)] focus:border-[var(--accent-focus)] rounded-[6px] text-xs outline-none transition-colors"
              />
            </div>

            <div className="h-44 overflow-y-auto space-y-1 p-1 bg-[var(--surface-1)] border border-[var(--line-default)] rounded-[8px]">
              {filteredTargetNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setTargetId(node.id)}
                  className={`p-2 rounded-[6px] cursor-pointer flex items-center justify-between transition-colors ${
                    targetId === node.id
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-fg)] font-medium shadow-xs'
                      : 'hover:bg-[var(--surface-2)] text-[var(--text-2)]'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="block truncate">{node.title}</span>
                    <span className="text-[10px] opacity-70 font-mono">{node.id}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 bg-[var(--surface-3)] text-[var(--text-3)]">
                    {CATEGORY_NAMES[node.category]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer 操作栏 */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--line-subtle)] bg-[var(--surface-2)]/40">
          <span className="text-[11px] text-[var(--text-3)]">
            支持一节点连接多个父节点 (Multi-parent DAG 汇聚)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeConnectModal}
              className="px-4 py-2 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--line-subtle)] text-xs font-medium transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!validation.isValid}
              onClick={() => handleSubmit()}
              className="px-4 py-2 rounded-[8px] bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-40 text-[var(--accent-fg)] text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>建立关联</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConnectNodesModal: React.FC = () => {
  const isConnectModalOpen = useCanvasStore((s) => s.isConnectModalOpen);

  if (!isConnectModalOpen) return null;

  return <ConnectNodesModalContent />;
};
