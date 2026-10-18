// components/Modals/CreateNodeModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  GitFork,
  Sparkles,
  Layers,
  Code2,
  FileQuestion,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { NodeCategory } from '../../types/canvas';

const CATEGORY_OPTIONS: { id: NodeCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'concept_qa', label: '概念追问', icon: FileQuestion },
  { id: 'code_impl', label: '代码实现', icon: Code2 },
  { id: 'core_conclusion', label: '方案权衡', icon: Zap },
  { id: 'chitchat_debug', label: '微调排障', icon: Layers },
];

const PROMPT_SHORTCUTS = [
  { label: '技术机理', query: '请深入剖析其底层设计机理、核心数据流与关键逻辑' },
  { label: '代码复现', query: '请给出工业级最小可运行复现代码演示与关键流程' },
  { label: '方案权衡', query: '对比分析该技术与替代方案的优缺点与适用场景' },
  { label: '异常避坑', query: '深度剖析在高并发或极端异常场景下的排障与避坑指南' },
];

export const CreateNodeModal: React.FC = () => {
  const isCreateNodeOpen = useCanvasStore((s) => s.isCreateNodeOpen);
  const closeCreateNodeModal = useCanvasStore((s) => s.closeCreateNodeModal);
  const createNodeParentId = useCanvasStore((s) => s.createNodeParentId);
  const activeNodeId = useCanvasStore((s) => s.activeNodeId);
  const graph = useCanvasStore((s) => s.graph);
  const addNode = useCanvasStore((s) => s.addNode);

  const [title, setTitle] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [category, setCategory] = useState<NodeCategory>('concept_qa');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [autoTriggerStream, setAutoTriggerStream] = useState(true);

  // 初始化父节点选择器
  useEffect(() => {
    if (isCreateNodeOpen) {
      const rootNode = Object.values(graph.nodes).find((n) => n.category === 'root_goal');
      const defaultParent = createNodeParentId || activeNodeId || rootNode?.id || '';
      setSelectedParentId(defaultParent);
      setTitle('');
      setUserQuery('');
      setCategory('concept_qa');
      setAutoTriggerStream(true);
    }
  }, [isCreateNodeOpen, createNodeParentId, activeNodeId, graph.nodes]);

  if (!isCreateNodeOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    const finalQuery =
      userQuery.trim() || `关于「${title.trim()}」的技术机理与设计权衡是什么？`;
    const parentIds = selectedParentId ? [selectedParentId] : [];

    await addNode({
      title: title.trim(),
      parentIds,
      userQuery: finalQuery,
      category,
      autoTriggerStream,
    });

    closeCreateNodeModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      closeCreateNodeModal();
    }
  };

  const allNodesList = Object.values(graph.nodes);

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
              <Plus className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-1)] flex items-center gap-2">
                <span>新建推演命题节点</span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">
                向当前认知导图派生新的探索分支并生成结构化知识卡
              </span>
            </div>
          </div>
          <button
            onClick={closeCreateNodeModal}
            className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* 节点标题 */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--text-1)] flex items-center gap-1.5">
              <span>节点命题标题</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：页表结构与多级分页机制..."
              className="w-full px-3.5 py-2.5 bg-[var(--surface-1)] border border-[var(--line-default)] focus:border-[var(--accent-focus)] rounded-[8px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none text-sm transition-colors"
              autoFocus
              required
            />
          </div>

          {/* 核心推演问题/目标 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                <span>核心推演问题 / 探索目标</span>
              </label>
              <span className="text-[10px] text-[var(--text-3)] font-mono">
                留空则自动根据标题生成
              </span>
            </div>
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="例如：请深入解释 x86-64 架构下 4 级页表（PML4/PDPT/PD/PT）的物理地址映射流程与 TLB 命中加速机理..."
              rows={3}
              className="w-full px-3.5 py-2 bg-[var(--surface-1)] border border-[var(--line-default)] focus:border-[var(--accent-focus)] rounded-[8px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none text-xs leading-relaxed resize-none transition-colors"
            />

            {/* 快捷问题模板 Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[var(--text-3)] mr-0.5">常用提示：</span>
              {PROMPT_SHORTCUTS.map((sc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setUserQuery(sc.query)}
                  className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--line-subtle)] text-[10px] transition-colors cursor-pointer"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* 关联父节点与分类选择 (双栏排版) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* 上级父节点 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
                <span>上级承接节点 (Parent)</span>
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--line-default)] focus:border-[var(--accent-focus)] rounded-[8px] text-[var(--text-1)] outline-none text-xs cursor-pointer"
              >
                <option value="">(无父级 - 作为独立根节点)</option>
                {allNodesList.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || n.id} ({n.id})
                  </option>
                ))}
              </select>
            </div>

            {/* 节点分类 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
                <span>节点分类 (Category)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORY_OPTIONS.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-2 py-1.5 rounded-[6px] border text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--text-1)] border-[var(--text-1)] text-[var(--surface-1)] font-medium shadow-xs'
                          : 'bg-[var(--surface-1)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 自动推演选项 */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--line-subtle)]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoTriggerStream}
                onChange={(e) => setAutoTriggerStream(e.target.checked)}
                className="w-4 h-4 accent-[var(--accent-focus)] rounded cursor-pointer"
              />
              <span className="text-[11px] text-[var(--text-2)] font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
                <span>创建后立即启动 AI 异步认知推演</span>
              </span>
            </label>
            <span className="text-[10px] text-[var(--text-3)] font-mono">
              Ctrl + Enter 快速提交
            </span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line-subtle)]">
            <button
              type="button"
              onClick={closeCreateNodeModal}
              className="px-4 py-2 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] font-medium transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 rounded-[8px] bg-[var(--text-1)] hover:opacity-90 disabled:opacity-50 text-[var(--surface-1)] font-medium shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} />
              <span>创建推演节点</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
