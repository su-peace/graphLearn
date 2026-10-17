// components/Modals/SessionManagerModal.tsx
import React, { useState } from 'react';
import {
  X,
  Plus,
  FolderOpen,
  Copy,
  Trash2,
  Edit2,
  Check,
  Clock,
  Network,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { SessionMeta } from '../../db/database';

export const SessionManagerModal: React.FC = () => {
  const isSessionManagerOpen = useCanvasStore((s) => s.isSessionManagerOpen);
  const setIsSessionManagerOpen = useCanvasStore((s) => s.setIsSessionManagerOpen);
  const sessions = useCanvasStore((s) => s.sessions);
  const currentGraphId = useCanvasStore((s) => s.graph.graphId);
  const switchSession = useCanvasStore((s) => s.switchSession);
  const createNewSession = useCanvasStore((s) => s.createNewSession);
  const renameSession = useCanvasStore((s) => s.renameSession);
  const duplicateSession = useCanvasStore((s) => s.duplicateSession);
  const deleteSession = useCanvasStore((s) => s.deleteSession);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'blank' | 'linux_vm' | 'rpc_concurrency'>('blank');

  if (!isSessionManagerOpen) return null;

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (s: SessionMeta) => {
    setEditingSessionId(s.graphId);
    setEditTitle(s.title);
  };

  const handleSaveRename = async (graphId: string) => {
    if (editTitle.trim()) {
      await renameSession(graphId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createNewSession(newTitle.trim() || undefined, selectedTemplate);
    setNewTitle('');
    setShowCreateForm(false);
  };

  const handleDelete = async (s: SessionMeta) => {
    if (sessions.length <= 1) {
      alert('至少需要保留一个会话！');
      return;
    }
    if (confirm(`确定要永久删除会话「${s.title}」吗？此操作无法撤销。`)) {
      await deleteSession(s.graphId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>思维导图会话管理</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {sessions.length} 个存储会话
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                本地优先存储于 IndexedDB，即开即用、自动实时保存
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建会话</span>
            </button>

            <button
              onClick={() => setIsSessionManagerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 新建会话折叠表单 */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-3 text-xs animate-in slide-in-from-top-2 duration-150"
          >
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>新建思维导图推演画布</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="请输入会话主题（例如：分布式一致性 Raft 算法攻坚）..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />

              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="blank">空白画布</option>
                <option value="linux_vm">预置模板：Linux 虚拟内存实战</option>
                <option value="rpc_concurrency">预置模板：高并发 RPC 框架</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                创建
              </button>
            </div>
          </form>
        )}

        {/* 搜索过滤条 */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between gap-4 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会话标题..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>
          <span className="text-[11px] text-slate-400">
            点击任意会话即可无缝即时切换，状态完全隔离
          </span>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              没有找到匹配的会话
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isCurrent = s.graphId === currentGraphId;
              const isEditing = editingSessionId === s.graphId;

              return (
                <div
                  key={s.graphId}
                  onClick={() => !isCurrent && switchSession(s.graphId)}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-indigo-950/30 border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer'
                  }`}
                >
                  {/* 左侧元信息 */}
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <Network className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="px-2 py-1 text-xs bg-slate-900 border border-indigo-500 rounded text-slate-100 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(s.graphId);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveRename(s.graphId)}
                            className="p-1 rounded bg-indigo-600 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-slate-100 text-xs truncate"
                            title={s.title}
                          >
                            {s.title}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                              当前会话
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Network className="w-3 h-3 text-slate-500" />
                          <span>{s.nodeCount} 个节点</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>更新于 {new Date(s.updatedAt).toLocaleTimeString()}</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {s.graphId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧动作按钮 */}
                  <div
                    className="flex items-center gap-1 text-slate-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isCurrent && (
                      <button
                        onClick={() => switchSession(s.graphId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-600/40 hover:bg-indigo-900 text-indigo-300 text-xs font-medium transition-colors"
                        title="切换到此会话"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>切换</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleStartRename(s)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
                      title="重命名会话"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => duplicateSession(s.graphId)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-indigo-400 transition-colors"
                      title="克隆会话副本"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 transition-colors"
                      title="删除会话"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
