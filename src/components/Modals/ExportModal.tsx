// src/components/Modals/ExportModal.tsx
// 多格式导出模态弹窗：支持 Mermaid、OPML 2.0、Markdown 报告、JSON 档案

import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  FileCode,
  GitFork,
  FileText,
  FileJson,
  Info,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  exportToMermaid,
  exportToOPML,
  exportToMarkdown,
  exportToJSON,
} from '../../services/exportService';

type ExportFormat = 'mermaid' | 'opml' | 'markdown' | 'json';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useCanvasStore((s) => s.isExportModalOpen);
  const closeExportModal = useCanvasStore((s) => s.closeExportModal);
  const graph = useCanvasStore((s) => s.graph);

  const [activeTab, setActiveTab] = useState<ExportFormat>('mermaid');
  const [copied, setCopied] = useState(false);

  // 安全清洗文件名
  const cleanTitle = useMemo(() => {
    return (graph.title || '思维导图').trim().replace(/[\s/\\:*?"<>|]+/g, '_');
  }, [graph.title]);

  // 计算四种格式导出内容
  const exportedContents = useMemo(() => {
    if (!isExportModalOpen) {
      return { mermaid: '', opml: '', markdown: '', json: '' };
    }
    return {
      mermaid: exportToMermaid(graph),
      opml: exportToOPML(graph),
      markdown: exportToMarkdown(graph),
      json: exportToJSON(graph),
    };
  }, [graph, isExportModalOpen]);

  const tabConfigs = useMemo(() => {
    return {
      mermaid: {
        id: 'mermaid' as ExportFormat,
        name: 'Mermaid 图表',
        icon: GitFork,
        extension: 'mmd',
        mimeType: 'text/vnd.mermaid',
        badge: '流程图 · .mmd',
        filename: `${cleanTitle}.mmd`,
        desc: '标准流程图源码，附带节点认知状态着色与父子边拓扑。适用于 GitHub README、Notion、Obsidian 或 Mermaid Live Editor 嵌入渲染。',
        content: exportedContents.mermaid,
      },
      opml: {
        id: 'opml' as ExportFormat,
        name: 'OPML 导图',
        icon: FileCode,
        extension: 'opml',
        mimeType: 'text/x-opml',
        badge: '思维导图 · .opml',
        filename: `${cleanTitle}.opml`,
        desc: '规范 OPML 2.0 格式，保留递归层级与节点详细注解（_note）。可一键导入 MindNode、XMind、MindManager、OmniOutliner 等桌面导图。',
        content: exportedContents.opml,
      },
      markdown: {
        id: 'markdown' as ExportFormat,
        name: 'Markdown 报告',
        icon: FileText,
        extension: 'md',
        mimeType: 'text/markdown',
        badge: '架构复盘 · .md',
        filename: `${cleanTitle}_推演报告.md`,
        desc: '包含根目标、各推演脉络、知识卡结论汇总与反向避坑列表的系统级复盘手稿，适于知识库沉淀与团队评审。',
        content: exportedContents.markdown,
      },
      json: {
        id: 'json' as ExportFormat,
        name: 'JSON 档案',
        icon: FileJson,
        extension: 'json',
        mimeType: 'application/json',
        badge: '原生工程 · .json',
        filename: `${cleanTitle}.canvas.json`,
        desc: 'GraphLearn 原生工程档案，保留全部节点拓扑、认知状态、资料切片与视口信息，支持完整重新导入。',
        content: exportedContents.json,
      },
    };
  }, [cleanTitle, exportedContents]);

  const currentTab = tabConfigs[activeTab];

  if (!isExportModalOpen) return null;

  // 一键复制
  const handleCopy = () => {
    navigator.clipboard.writeText(currentTab.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 一键下载文件
  const handleDownload = () => {
    const blob = new Blob([currentTab.content], { type: `${currentTab.mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentTab.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 统计指标
  const lineCount = currentTab.content.split('\n').length;
  const charCount = currentTab.content.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="w-full max-w-4xl max-h-[88vh] rounded-[18px] glass-elevated border border-[var(--line-default)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-1)]">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-subtle)] bg-[var(--surface-2)]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--surface-3)] border border-[var(--line-default)] flex items-center justify-center text-[var(--accent-focus)] shadow-xs">
              <Share2 className="w-4.5 h-4.5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                <span>导出图谱档案与推演报告</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--line-subtle)]">
                  Multi-Format Exporter
                </span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">
                当前图谱：{graph.title} ({Object.keys(graph.nodes).length} 个节点)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeExportModal}
              className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
              title="关闭弹窗 (Esc)"
            >
              <X className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* 格式切换 Tab 栏 (DESIGN.md 触感工坊胶囊按钮) */}
        <div className="px-6 py-3 bg-[var(--surface-1)] border-b border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--line-subtle)] text-xs">
            {(Object.values(tabConfigs) as typeof currentTab[]).map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCopied(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-fg)] shadow-xs font-semibold'
                      : 'hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* 格式指标 */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-3)]">
            <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--line-subtle)]">
              {currentTab.badge}
            </span>
            <span>{lineCount} 行</span>
            <span>·</span>
            <span>{(charCount / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        {/* 格式用途简述条 */}
        <div className="px-6 py-2.5 bg-[var(--surface-2)] border-b border-[var(--line-subtle)] text-[11px] text-[var(--text-2)] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[var(--accent-focus)] shrink-0" strokeWidth={1.8} />
          <span className="truncate">{currentTab.desc}</span>
        </div>

        {/* 代码/文本预览区 (等宽字体与细致滚动条) */}
        <div className="flex-1 overflow-auto p-5 bg-[var(--surface-3)]/60 font-mono text-xs leading-relaxed text-[var(--text-2)] selection:bg-[var(--accent-focus)]/25">
          <pre className="whitespace-pre font-mono select-text">
            <code>{currentTab.content}</code>
          </pre>
        </div>

        {/* 底部操作工具栏 */}
        <div className="px-6 py-3.5 bg-[var(--surface-1)] border-t border-[var(--line-subtle)] flex items-center justify-between">
          <div className="text-[11px] text-[var(--text-3)] truncate max-w-sm hidden sm:block">
            目标文件名：<span className="font-mono text-[var(--text-2)]">{currentTab.filename}</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* 一键复制按钮 */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                copied
                  ? 'bg-[var(--status-verified-bg)] border-[var(--status-verified)] text-[var(--status-verified)] shadow-xs'
                  : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border-[var(--line-default)] text-[var(--text-1)]'
              } active:scale-95`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--status-verified)]" strokeWidth={2} />
                  <span>已复制到剪贴板</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>一键复制源码</span>
                </>
              )}
            </button>

            {/* 下载文件按钮 */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--accent-fg)] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>下载 {currentTab.extension.toUpperCase()} 文件</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
