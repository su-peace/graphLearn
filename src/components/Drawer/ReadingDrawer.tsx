// components/Drawer/ReadingDrawer.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  RotateCw,
  Pin,
  EyeOff,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Trash2,
  Maximize2,
  Minimize2,
  ArrowUp,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { NodeCategory } from '../../types/canvas';
import { CitationPill } from './CitationPill';
import { FloatingBubbleMenu } from './FloatingBubbleMenu';
import { MountedDocsSection } from './MountedDocsSection';

interface ReadingDrawerProps {
  onNavigateToNode?: (nodeId: string) => void;
}

// 可复用的独立代码块组件（带语言标签与一键复制代码按钮）
const CodeBlock: React.FC<{ language?: string; codeString: string }> = ({
  language,
  codeString,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[var(--surface-2)] shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--surface-3)] border-b border-[var(--line-subtle)] text-[11px] font-mono text-[var(--text-3)]">
        <span className="font-semibold uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          type="button"
          className="flex items-center gap-1 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--status-verified)]" strokeWidth={1.6} />
              <span className="text-[var(--status-verified)]">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>复制代码</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono text-[var(--text-1)] selection:bg-[var(--accent-focus)] selection:text-white">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

export const ReadingDrawer: React.FC<ReadingDrawerProps> = ({ onNavigateToNode }) => {
  const isDrawerOpen = useCanvasStore((s) => s.isDrawerOpen);
  const activeNodeId = useCanvasStore((s) => s.activeNodeId);
  const graph = useCanvasStore((s) => s.graph);
  const closeDrawer = useCanvasStore((s) => s.closeDrawer);
  const setNodeStatus = useCanvasStore((s) => s.setNodeStatus);
  const setNodeManualState = useCanvasStore((s) => s.setNodeManualState);
  const setNodeCategory = useCanvasStore((s) => s.setNodeCategory);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const mountReferenceChunk = useCanvasStore((s) => s.mountReferenceChunk);
  const removeReferenceChunk = useCanvasStore((s) => s.removeReferenceChunk);
  const runStreamForNode = useCanvasStore((s) => s.runStreamForNode);
  const isStreaming = useCanvasStore((s) => s.isStreaming);
  const streamingNodeId = useCanvasStore((s) => s.streamingNodeId);
  const streamingText = useCanvasStore((s) => s.streamingText);
  const triggerXrayPreview = useCanvasStore((s) => s.triggerXrayPreview);
  const clearXrayPreview = useCanvasStore((s) => s.clearXrayPreview);
  const addNode = useCanvasStore((s) => s.addNode);
  const setNodeToDeleteId = useCanvasStore((s) => s.setNodeToDeleteId);

  // 侧边栏宽度模式: 标准 (500px), 宽屏舒适 (760px), 沉浸超宽 (960px)
  const [widthMode, setWidthMode] = useState<'standard' | 'wide' | 'ultra'>('wide');

  // 当前主视图标签: 'chat' (推演对话, 核心主角) | 'artifact' (知识卡) | 'docs' (挂载资料) | 'meta' (属性门控)
  const [activeTab, setActiveTab] = useState<'chat' | 'artifact' | 'docs' | 'meta'>('chat');

  const [followupQuery, setFollowupQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);

  // 划词即分支选区状态
  const [selectedText, setSelectedText] = useState('');
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const activeNode = activeNodeId ? graph.nodes[activeNodeId] : null;

  // 划词监听: 全局监听 mouseup，支持框选一句话或词汇快速追问
  const handleSelectionCheck = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }
    const text = selection.toString().trim();
    if (!text || text.length < 1 || text.length > 300) {
      return;
    }

    // 确保选区在侧边栏阅读正文区域内
    if (!contentRef.current || !contentRef.current.contains(selection.anchorNode)) {
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      setSelectedText(text);
      setBubblePosition({
        x: Math.min(window.innerWidth - 160, Math.max(140, rect.left + rect.width / 2)),
        y: Math.max(48, rect.top - 12),
      });
    } catch {
      // 容错处理
    }
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      // 延时让微小拖动选区稳定
      setTimeout(handleSelectionCheck, 10);
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 点击在浮动菜单内部不清除
      if (target.closest('.floating-bubble-menu')) {
        return;
      }
      // 点击外部时收起气泡
      if (selectedText) {
        setSelectedText('');
        setBubblePosition(null);
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [handleSelectionCheck, selectedText]);

  const isStreamingThis = isStreaming && streamingNodeId === activeNode?.id;
  const currentContent = isStreamingThis ? streamingText : activeNode?.aiResponse || '';
  // 使用 React 19 并发特性 useDeferredValue 降低 Markdown AST 解析对主线程的阻塞（必须在所有条件返回前无条件调用）
  const deferredContent = React.useDeferredValue(currentContent);

  if (!isDrawerOpen || !activeNode) return null;

  const handleCopyFull = () => {
    navigator.clipboard.writeText(currentContent || activeNode.userQuery);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupQuery.trim()) return;

    const query = followupQuery.trim();
    setFollowupQuery('');
    clearXrayPreview();

    await addNode({
      title: query.slice(0, 12),
      parentIds: [activeNode.id],
      userQuery: query,
      category: 'concept_qa',
      autoTriggerStream: true,
    });
  };

  // 格式化渲染 Markdown 内容
  const renderFormattedMarkdown = (raw: string) => {
    if (!raw) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center text-[var(--text-3)] gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--line-default)] flex items-center justify-center text-[var(--accent-focus)]">
            <RotateCw className="w-4 h-4" />
          </div>
          <div className="text-sm font-semibold text-[var(--text-1)]">暂无推演内容</div>
          <div className="text-xs text-[var(--text-3)] max-w-sm">
            点击下方按钮即可唤醒模型进行完整认知链路推演并生成结构化知识卡。
          </div>
          <button
            onClick={() => runStreamForNode(activeNode.id)}
            disabled={isStreaming}
            className="mt-2 px-4 py-2 rounded-[8px] bg-[var(--text-1)] hover:opacity-90 text-[var(--surface-1)] font-medium text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>开始深度认知推演</span>
          </button>
        </div>
      );
    }

    const parts = raw.split(/(\[Ref:\s*[^\]]+\])/g);

    return parts.map((part, index) => {
      const refMatch = /\[Ref:\s*([^\]]+)\]/.exec(part);
      if (refMatch) {
        const refId = refMatch[1].trim();
        return (
          <CitationPill
            key={`ref_${index}_${refId}`}
            refId={refId}
            onNavigate={onNavigateToNode}
          />
        );
      }
      return (
        <ReactMarkdown
          key={`md_${index}`}
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              if (isInline) {
                return (
                  <code
                    className="bg-[var(--surface-3)] border border-[var(--line-subtle)] text-[var(--accent-focus)] font-mono text-[12.5px] px-1.5 py-0.5 rounded-[4px] mx-0.5"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <CodeBlock
                  language={match ? match[1] : ''}
                  codeString={String(children).replace(/\n$/, '')}
                />
              );
            },
            pre({ children }) {
              return <div className="not-prose my-3">{children}</div>;
            },
            h1({ children }) {
              return (
                <h1 className="text-lg md:text-xl font-semibold text-[var(--text-1)] mt-6 mb-3 pb-2 border-b border-[var(--line-subtle)] flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[var(--accent-focus)]" />
                  {children}
                </h1>
              );
            },
            h2({ children }) {
              return (
                <h2 className="text-base md:text-lg font-medium text-[var(--text-1)] mt-5 mb-2 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-[var(--line-strong)]" />
                  {children}
                </h2>
              );
            },
            h3({ children }) {
              return (
                <h3 className="text-sm md:text-base font-medium text-[var(--text-1)] mt-4 mb-1.5">
                  {children}
                </h3>
              );
            },
            p({ children }) {
              return (
                <p className="my-2.5 leading-7 text-[var(--text-2)] text-sm md:text-[14.5px] tracking-normal">
                  {children}
                </p>
              );
            },
            ul({ children }) {
              return (
                <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-sm md:text-[14.5px] text-[var(--text-2)] leading-7">
                  {children}
                </ul>
              );
            },
            ol({ children }) {
              return (
                <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-sm md:text-[14.5px] text-[var(--text-2)] leading-7">
                  {children}
                </ol>
              );
            },
            blockquote({ children }) {
              return (
                <blockquote className="border-l-2 border-[var(--line-strong)] bg-[var(--surface-2)] rounded-r-lg px-4 py-2.5 my-3 text-[var(--text-2)] text-sm leading-relaxed italic">
                  {children}
                </blockquote>
              );
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto my-3 border border-[var(--line-default)] rounded-[8px]">
                  <table className="w-full text-xs text-left text-[var(--text-2)] divide-y divide-[var(--line-subtle)]">
                    {children}
                  </table>
                </div>
              );
            },
            th({ children }) {
              return (
                <th className="px-3 py-2 bg-[var(--surface-2)] font-semibold text-[var(--text-1)]">
                  {children}
                </th>
              );
            },
            td({ children }) {
              return <td className="px-3 py-2 border-t border-[var(--line-subtle)] text-[var(--text-2)]">{children}</td>;
            },
          }}
        >
          {part}
        </ReactMarkdown>
      );
    });
  };

  // 计算侧边栏宽度样式
  const widthClasses =
    widthMode === 'ultra'
      ? 'w-[920px] max-w-[95vw]'
      : widthMode === 'wide'
      ? 'w-[740px] max-w-[85vw]'
      : 'w-[520px] max-w-[90vw]';

  return (
    <>
      {/* 划词即分支浮动气泡菜单 */}
      {selectedText && (
        <FloatingBubbleMenu
          selectedText={selectedText}
          position={bubblePosition}
          activeNodeId={activeNode.id}
          onClose={() => {
            setSelectedText('');
            setBubblePosition(null);
          }}
        />
      )}

      {/* 遮罩背景（大屏模式下可点击关闭） */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30 transition-opacity"
        onClick={closeDrawer}
      />

      {/* 现代化 AI 推演手稿与阅读抽屉 */}
      <div
        className={`fixed top-0 right-0 h-full ${widthClasses} glass-elevated border-l border-[var(--line-default)] shadow-2xl z-40 flex flex-col transition-all duration-300 ease-out animate-in slide-in-from-right`}
      >
        {/* 顶部标题与工具控制条 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line-subtle)] bg-[var(--surface-1)]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-[6px] bg-[var(--surface-3)] border border-[var(--line-subtle)] text-[var(--text-3)] font-medium shrink-0">
              {activeNode.id}
            </span>
            <input
              type="text"
              value={activeNode.title}
              onChange={(e) => updateNodeData(activeNode.id, { title: e.target.value })}
              className="text-sm font-semibold text-[var(--text-1)] bg-transparent hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] px-2 py-1 rounded-[8px] border border-transparent focus:border-[var(--line-strong)] outline-none truncate max-w-[200px] sm:max-w-[260px] transition-colors"
              title="点击可直接编辑节点标题"
            />
          </div>

          <div className="flex items-center gap-2 text-[var(--text-3)] shrink-0">
            {/* 3-State Segmented Control (DESIGN.md §5.4) */}
            <div className="flex items-center rounded-[8px] p-0.5 bg-[var(--surface-2)] border border-[var(--line-subtle)] text-[11px]">
              <button
                onClick={() => setNodeStatus(activeNode.id, 'exploring')}
                className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer ${
                  activeNode.status === 'exploring'
                    ? 'bg-[var(--surface-1)] text-[var(--text-1)] shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
                title="标记为探索状态"
              >
                探索
              </button>
              <button
                onClick={() => setNodeStatus(activeNode.id, 'verified')}
                className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer ${
                  activeNode.status === 'verified'
                    ? 'bg-[var(--accent-verified-bg)] text-[var(--accent-verified)] border border-[var(--accent-verified-border)] shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
                title="标记为已验证 (可被跨分支检索)"
              >
                已验证
              </button>
              <button
                onClick={() => setNodeStatus(activeNode.id, 'deprecated')}
                className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer ${
                  activeNode.status === 'deprecated'
                    ? 'bg-[var(--accent-deprecated-bg)] text-[var(--accent-deprecated)] border border-[var(--accent-deprecated-border)] shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
                title="标记为已证伪 (转化为反向避坑约束)"
              >
                已证伪
              </button>
            </div>

            <div className="w-px h-4 bg-[var(--line-subtle)] mx-0.5" />

            {/* 宽度缩放切换 */}
            <button
              onClick={() => {
                if (widthMode === 'standard') setWidthMode('wide');
                else if (widthMode === 'wide') setWidthMode('ultra');
                else setWidthMode('standard');
              }}
              className="p-1.5 rounded-[8px] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
              title={`切换宽度 (当前: ${
                widthMode === 'ultra' ? '超宽' : widthMode === 'wide' ? '宽屏' : '标准'
              })`}
            >
              {widthMode === 'ultra' ? (
                <Minimize2 className="w-4 h-4 text-[var(--accent-focus)]" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* 复制全文 */}
            <button
              onClick={handleCopyFull}
              className="p-1.5 rounded-[8px] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
              title="复制回答全文"
            >
              {copiedAll ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* 重新生成 */}
            <button
              onClick={() => runStreamForNode(activeNode.id)}
              disabled={isStreaming}
              className="p-1.5 rounded-[8px] hover:bg-[var(--surface-2)] hover:text-[var(--accent-focus)] transition-colors disabled:opacity-50 cursor-pointer"
              title="重新向 AI 模型请求推演"
            >
              <RotateCw className={`w-4 h-4 ${isStreamingThis ? 'animate-spin text-[var(--accent-focus)]' : ''}`} />
            </button>

            {/* 删除节点按钮 */}
            <button
              onClick={() => setNodeToDeleteId(activeNode.id)}
              className="p-1.5 rounded-[8px] hover:bg-rose-500/10 hover:text-rose-500 text-[var(--text-3)] transition-colors cursor-pointer"
              title="删除此节点 (支持保留或清理子分支)"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* 关闭侧边栏 */}
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-[8px] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors ml-1 cursor-pointer"
              title="关闭侧边栏 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 导航 Tab 栏 (出版物级下划线 Tabs) */}
        <div className="flex items-center justify-between px-5 bg-[var(--surface-1)]/50 border-b border-[var(--line-subtle)] text-xs shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2.5 border-b-2 font-medium transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-[var(--accent-focus)] text-[var(--text-1)] font-semibold'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              推演手稿
            </button>

            <button
              onClick={() => setActiveTab('artifact')}
              className={`py-2.5 border-b-2 font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'artifact'
                  ? 'border-[var(--accent-focus)] text-[var(--text-1)] font-semibold'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              <span>核心结论</span>
              {activeNode.artifact && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-focus)]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`py-2.5 border-b-2 font-medium transition-all cursor-pointer ${
                activeTab === 'docs'
                  ? 'border-[var(--accent-focus)] text-[var(--text-1)] font-semibold'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              参考切片 ({activeNode.mountedChunks?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('meta')}
              className={`py-2.5 border-b-2 font-medium transition-all cursor-pointer ${
                activeTab === 'meta'
                  ? 'border-[var(--accent-focus)] text-[var(--text-1)] font-semibold'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              认知状态
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-3)] font-mono hidden sm:block">
            Token 估算: ~{activeNode.fullTokens || 0}
          </div>
        </div>

        {/* 主视区内容切换 */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-text cursor-text selection:bg-[var(--accent-focus)]/25"
        >
          {/* TAB 1: 核心推演手稿 (Publication Manuscript View) */}
          {activeTab === 'chat' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* 章节导语 (Proposition Header，DESIGN.md §4.2 抛弃聊天气泡) */}
              <div className="pt-2 pb-5 border-b border-[var(--line-subtle)]">
                <div className="text-[11px] font-mono tracking-wider text-[var(--text-3)] mb-2 uppercase flex items-center justify-between">
                  <span>PROPOSITION // {activeNode.id}</span>
                  <span className="text-[10px] text-[var(--text-3)] font-mono">
                    STATUS: {activeNode.status.toUpperCase()}
                  </span>
                </div>
                <div className="pl-3.5 border-l-2 border-[var(--accent-focus)] text-[16px] font-medium text-[var(--text-1)] leading-relaxed select-text">
                  {activeNode.userQuery}
                </div>
              </div>

              {/* 核心结论速览卡（引导点击切换） */}
              {activeNode.artifact && (
                <div
                  onClick={() => setActiveTab('artifact')}
                  className="p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--line-default)] flex items-center justify-between text-xs text-[var(--text-2)] cursor-pointer hover:border-[var(--line-strong)] transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-focus)] shrink-0" />
                    <span className="font-semibold text-[var(--text-1)] shrink-0">核心结论:</span>
                    <span className="truncate text-[var(--text-2)]">
                      {activeNode.artifact.coreTakeaway}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[var(--accent-focus)] shrink-0">
                    查看无损知识卡 →
                  </span>
                </div>
              )}

              {/* AI 解答区（数字出版物/学术推演排版） */}
              <div className="space-y-4">
                {/* 顶栏推演元信息 */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line-subtle)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono tracking-wider text-[var(--text-3)] uppercase">
                      DERIVATION // AI MANUSCRIPT
                    </span>
                    {isStreamingThis && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-3)] text-[var(--accent-focus)] animate-pulse">
                        正在流式推演...
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-3)] flex items-center gap-1.5">
                    <span>划选任意词句触发</span>
                    <span className="text-[var(--accent-focus)] font-medium">划词即分支</span>
                  </div>
                </div>

                {/* 详细 Markdown 内容 */}
                <div className="text-[var(--text-2)]">
                  {renderFormattedMarkdown(deferredContent)}
                  {isStreamingThis && (
                    <span className="typewriter-cursor" />
                  )}
                </div>

                {/* 回答尾部快捷追问行动按钮 */}
                <div className="mt-8 pt-4 border-t border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-3)] text-[11px]">沿此节点派生新探索：</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFollowupQuery(`针对「${activeNode.title}」的实现边界与极端异常场景深入分析`);
                      }}
                      className="px-2.5 py-1 rounded-[6px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--line-subtle)] text-[11px] transition-colors cursor-pointer"
                    >
                      异常边界
                    </button>
                    <button
                      onClick={() => {
                        setFollowupQuery(`请给出「${activeNode.title}」的最小可运行复现代码演示`);
                      }}
                      className="px-2.5 py-1 rounded-[6px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--line-subtle)] text-[11px] transition-colors cursor-pointer"
                    >
                      代码复现
                    </button>
                    <button
                      onClick={() => {
                        setFollowupQuery(`对比分析「${activeNode.title}」与其他替代技术方案的优缺点`);
                      }}
                      className="px-2.5 py-1 rounded-[6px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--line-subtle)] text-[11px] transition-colors cursor-pointer"
                    >
                      方案权衡
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 结构化无损知识卡 (KnowledgeArtifact) */}
          {activeTab === 'artifact' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-5 rounded-[12px] bg-[var(--surface-2)] border border-[var(--line-default)] flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[var(--line-subtle)]">
                  <span className="font-semibold text-[var(--text-1)] flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-[var(--accent-focus)]" />
                    结构化无损知识卡 (Tier 2 语义骨架)
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-3)] bg-[var(--surface-1)] px-2 py-0.5 rounded-[4px] border border-[var(--line-subtle)]">
                    降级保留率 90%+ | ~{activeNode.artifactTokens || 20} Tokens
                  </span>
                </div>

                {activeNode.artifact ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 font-mono">
                        核心认知结论 (Core Takeaway)
                      </div>
                      <div className="text-sm text-[var(--text-1)] font-medium leading-relaxed bg-[var(--surface-1)] p-3.5 rounded-[8px] border border-[var(--line-subtle)]">
                        {activeNode.artifact.coreTakeaway}
                      </div>
                    </div>

                    {activeNode.artifact.hardInvariants &&
                      activeNode.artifact.hardInvariants.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 font-mono">
                            必须遵守的硬性约束 (Hard Invariants)
                          </div>
                          <div className="space-y-1.5">
                            {activeNode.artifact.hardInvariants.map((inv, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 rounded-[8px] bg-[var(--surface-1)] border border-[var(--line-subtle)] text-[var(--text-2)] font-mono flex items-center gap-2 text-xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-focus)] shrink-0" />
                                <span>{inv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {activeNode.artifact.codeSignatures &&
                      activeNode.artifact.codeSignatures.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 font-mono">
                            精准代码签名 (Code Signatures)
                          </div>
                          <div className="p-3 rounded-[8px] bg-[var(--surface-3)] border border-[var(--line-default)] text-[12px] font-mono text-[var(--text-1)] space-y-1 overflow-x-auto">
                            {activeNode.artifact.codeSignatures.map((sig, idx) => (
                              <div key={idx} className="whitespace-pre">
                                {sig}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--text-3)] text-xs">
                    暂未生成知识卡，请在手稿标签中重新推演。
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 挂载参考资料 (Mounted Docs) */}
          {activeTab === 'docs' && (
            <div className="max-w-3xl mx-auto">
              <MountedDocsSection
                nodeId={activeNode.id}
                chunks={activeNode.mountedChunks || []}
                onAddChunk={(chunk) => mountReferenceChunk(activeNode.id, chunk)}
                onRemoveChunk={(chunkId) => removeReferenceChunk(activeNode.id, chunkId)}
              />
            </div>
          )}

          {/* TAB 4: 属性设置与认识论门控 (Meta & Gate) */}
          {activeTab === 'meta' && (
            <div className="space-y-5 max-w-3xl mx-auto text-xs">
              {/* 认识论状态机 */}
              <div className="p-4 rounded-[12px] bg-[var(--surface-2)] border border-[var(--line-default)] space-y-3">
                <span className="font-semibold text-[var(--text-1)] text-sm block">
                  认识论状态门控 (Epistemic Status)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setNodeStatus(activeNode.id, 'exploring')}
                    className={`p-3 rounded-[8px] flex flex-col items-center gap-2 border transition-all cursor-pointer ${
                      activeNode.status === 'exploring'
                        ? 'bg-[var(--surface-1)] border-[var(--line-strong)] text-[var(--text-1)] shadow-xs'
                        : 'bg-[var(--surface-3)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <HelpCircle className="w-5 h-5 text-[var(--accent-focus)]" />
                    <span className="font-semibold">探索中 (Exploring)</span>
                    <span className="text-[10px] text-[var(--text-3)] text-center">正在验证与演化</span>
                  </button>

                  <button
                    onClick={() => setNodeStatus(activeNode.id, 'verified')}
                    className={`p-3 rounded-[8px] flex flex-col items-center gap-2 border transition-all cursor-pointer ${
                      activeNode.status === 'verified'
                        ? 'bg-[var(--accent-verified-bg)] border-[var(--accent-verified-border)] text-[var(--accent-verified)] shadow-xs'
                        : 'bg-[var(--surface-3)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-emerald-500'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-[var(--accent-verified)]" />
                    <span className="font-semibold">已验证 (Verified)</span>
                    <span className="text-[10px] text-[var(--text-3)] text-center">可作为基石信任</span>
                  </button>

                  <button
                    onClick={() => setNodeStatus(activeNode.id, 'deprecated')}
                    className={`p-3 rounded-[8px] flex flex-col items-center gap-2 border transition-all cursor-pointer ${
                      activeNode.status === 'deprecated'
                        ? 'bg-[var(--accent-deprecated-bg)] border-[var(--accent-deprecated-border)] text-[var(--accent-deprecated)] shadow-xs'
                        : 'bg-[var(--surface-3)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-rose-500'
                    }`}
                  >
                    <AlertOctagon className="w-5 h-5 text-[var(--accent-deprecated)]" />
                    <span className="font-semibold">已证伪 (Deprecated)</span>
                    <span className="text-[10px] text-[var(--text-3)] text-center">已被推翻或废弃</span>
                  </button>
                </div>
              </div>

              {/* 置顶与忽略控制 */}
              <div className="p-4 rounded-[12px] bg-[var(--surface-2)] border border-[var(--line-default)] space-y-3">
                <span className="font-semibold text-[var(--text-1)] text-sm block">
                  上下文编译策略 (Tier 1 Pin / Ignore)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setNodeManualState(
                        activeNode.id,
                        activeNode.manualState === 'pinned' ? 'auto' : 'pinned'
                      )
                    }
                    className={`flex-1 p-3 rounded-[8px] border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeNode.manualState === 'pinned'
                        ? 'bg-[var(--surface-1)] border-[var(--line-strong)] text-[var(--accent-focus)] font-semibold shadow-xs'
                        : 'bg-[var(--surface-3)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                    <span>{activeNode.manualState === 'pinned' ? '已设为 Tier 1 强制置顶' : '设为 Tier 1 置顶'}</span>
                  </button>

                  <button
                    onClick={() =>
                      setNodeManualState(
                        activeNode.id,
                        activeNode.manualState === 'ignored' ? 'auto' : 'ignored'
                      )
                    }
                    className={`flex-1 p-3 rounded-[8px] border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeNode.manualState === 'ignored'
                        ? 'bg-[var(--surface-1)] border-[var(--line-strong)] text-[var(--text-1)] font-semibold shadow-xs'
                        : 'bg-[var(--surface-3)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>{activeNode.manualState === 'ignored' ? '已忽略 (不编译入 Prompt)' : '临时忽略此节点'}</span>
                  </button>
                </div>
              </div>

              {/* 类别标签 */}
              <div className="p-4 rounded-[12px] bg-[var(--surface-2)] border border-[var(--line-default)] space-y-3">
                <span className="font-semibold text-[var(--text-1)] text-sm block">节点分类 (Category)</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'root_goal',
                      'core_conclusion',
                      'code_impl',
                      'concept_qa',
                      'chitchat_debug',
                    ] as NodeCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNodeCategory(activeNode.id, cat)}
                      className={`px-3 py-1.5 rounded-[6px] border text-xs transition-colors cursor-pointer ${
                        activeNode.category === cat
                          ? 'bg-[var(--text-1)] border-[var(--text-1)] text-[var(--surface-1)] font-medium'
                          : 'bg-[var(--surface-3)] border-[var(--line-subtle)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                      }`}
                    >
                      {cat === 'root_goal' && '根目标 (Root)'}
                      {cat === 'core_conclusion' && '核心结论 (Conclusion)'}
                      {cat === 'code_impl' && '代码实现 (Code)'}
                      {cat === 'concept_qa' && '概念追问 (Concept)'}
                      {cat === 'chitchat_debug' && '微调纠错 (Debug)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部悬浮推演舱 (Floating Elevated Input Pod, DESIGN.md §4.3) */}
        <div className="px-5 pb-5 pt-3 bg-gradient-to-t from-[var(--surface-1)] via-[var(--surface-1)]/95 to-transparent shrink-0">
          <form
            onSubmit={handleFollowupSubmit}
            className="flex flex-col gap-2 max-w-4xl mx-auto"
          >
            {/* 浮动输入胶囊容器 */}
            <div className="relative flex items-center rounded-[16px] glass-elevated px-3 py-1.5 border border-[var(--line-default)] focus-within:border-[var(--accent-focus)] focus-within:shadow-[0_0_20px_var(--accent-focus-glow)] transition-all">
              <input
                type="text"
                value={followupQuery}
                onChange={(e) => setFollowupQuery(e.target.value)}
                onFocus={() => triggerXrayPreview(followupQuery)}
                onBlur={() => clearXrayPreview()}
                placeholder="输入推演追问，按 Enter 派生新分支节点..."
                className="w-full py-1.5 px-1 bg-transparent text-sm text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none font-normal"
              />

              <button
                type="submit"
                disabled={!followupQuery.trim() || isStreaming}
                className="w-8 h-8 rounded-full bg-[var(--text-1)] hover:opacity-90 disabled:bg-[var(--surface-3)] disabled:text-[var(--text-3)] text-[var(--surface-1)] font-semibold flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95 ml-2"
                title="发送追问 (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>

            {/* 辅助状态与提示 */}
            <div className="flex items-center justify-between px-2 text-[10px] text-[var(--text-3)] font-mono">
              <span>Enter 自动创建子节点并异步推演</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-focus)]" />
                聚焦时点亮 X-Ray
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
