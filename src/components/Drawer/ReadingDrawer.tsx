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
  Send,
  Zap,
  Share2,
  Trash2,
  Maximize2,
  Minimize2,
  MessageSquare,
  Paperclip,
  Sliders,
  Sparkles,
  Bot,
  User,
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
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#070b14] shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
        <span className="text-sky-400 font-semibold uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          type="button"
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制代码</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono text-emerald-300/90 selection:bg-indigo-600 selection:text-white">
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
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 gap-3">
          <Bot className="w-10 h-10 text-slate-600 animate-pulse" />
          <div className="text-sm font-medium text-slate-300">暂无推演内容</div>
          <div className="text-xs text-slate-500 max-w-sm">
            点击下方按钮即可唤醒模型进行完整认知链路推演并生成结构化知识卡。
          </div>
          <button
            onClick={() => runStreamForNode(activeNode.id)}
            disabled={isStreaming}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
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
                    className="bg-slate-900 border border-slate-800 text-sky-300 font-mono text-[13px] px-1.5 py-0.5 rounded mx-0.5"
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
              return <div className="not-prose">{children}</div>;
            },
            h1({ children }) {
              return (
                <h1 className="text-lg md:text-xl font-bold text-slate-100 mt-5 mb-2.5 pb-1 border-b border-slate-800/80 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-indigo-500" />
                  {children}
                </h1>
              );
            },
            h2({ children }) {
              return (
                <h2 className="text-base md:text-lg font-bold text-sky-200 mt-4 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-sky-500" />
                  {children}
                </h2>
              );
            },
            h3({ children }) {
              return (
                <h3 className="text-sm md:text-base font-semibold text-slate-200 mt-3 mb-1.5">
                  {children}
                </h3>
              );
            },
            p({ children }) {
              return (
                <p className="my-2.5 leading-7 text-slate-200 text-sm md:text-[14.5px] tracking-wide">
                  {children}
                </p>
              );
            },
            ul({ children }) {
              return (
                <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-sm md:text-[14.5px] text-slate-200 leading-7">
                  {children}
                </ul>
              );
            },
            ol({ children }) {
              return (
                <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-sm md:text-[14.5px] text-slate-200 leading-7">
                  {children}
                </ol>
              );
            },
            blockquote({ children }) {
              return (
                <blockquote className="border-l-4 border-indigo-500 bg-indigo-950/20 rounded-r-xl px-4 py-2.5 my-3 text-slate-300 text-sm leading-relaxed">
                  {children}
                </blockquote>
              );
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto my-3 border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left text-slate-300 divide-y divide-slate-800">
                    {children}
                  </table>
                </div>
              );
            },
            th({ children }) {
              return (
                <th className="px-3 py-2 bg-slate-900 font-semibold text-slate-200">
                  {children}
                </th>
              );
            },
            td({ children }) {
              return <td className="px-3 py-2 border-t border-slate-800/50">{children}</td>;
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
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 transition-opacity"
        onClick={closeDrawer}
      />

      {/* 现代化 AI 聊天与推演侧边栏 */}
      <div
        className={`fixed top-0 right-0 h-full ${widthClasses} bg-[#0b101b] border-l border-slate-800/90 shadow-2xl z-40 flex flex-col transition-all duration-300 ease-out animate-in slide-in-from-right`}
      >
        {/* 顶部标题与工具控制条 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-semibold shrink-0">
              {activeNode.id}
            </span>
            <input
              type="text"
              value={activeNode.title}
              onChange={(e) => updateNodeData(activeNode.id, { title: e.target.value })}
              className="text-sm font-bold text-slate-100 bg-transparent hover:bg-slate-800/60 focus:bg-slate-800 px-2 py-1 rounded-lg border border-transparent focus:border-slate-700 outline-none truncate max-w-[280px]"
              title="点击可直接编辑节点标题"
            />
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
            {/* 宽度缩放切换 */}
            <button
              onClick={() => {
                if (widthMode === 'standard') setWidthMode('wide');
                else if (widthMode === 'wide') setWidthMode('ultra');
                else setWidthMode('standard');
              }}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
              title={`切换宽度 (当前: ${
                widthMode === 'ultra' ? '超宽' : widthMode === 'wide' ? '宽屏' : '标准'
              })`}
            >
              {widthMode === 'ultra' ? (
                <Minimize2 className="w-4 h-4 text-sky-400" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* 复制全文 */}
            <button
              onClick={handleCopyFull}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
              title="复制 AI 回答全文"
            >
              {copiedAll ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* 重新生成 */}
            <button
              onClick={() => runStreamForNode(activeNode.id)}
              disabled={isStreaming}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-sky-400 transition-colors disabled:opacity-50"
              title="重新向 AI 模型请求推演"
            >
              <RotateCw className={`w-4 h-4 ${isStreamingThis ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* 删除节点按钮 */}
            <button
              onClick={() => setNodeToDeleteId(activeNode.id)}
              className="p-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
              title="删除此节点 (支持保留或清理子分支)"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* 关闭侧边栏 */}
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors ml-1"
              title="关闭侧边栏 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 导航 Tab 栏：将核心推演对话置于主视区，知识卡与资料切片独立分流 */}
        <div className="flex items-center justify-between px-5 bg-slate-900/50 border-b border-slate-800/80 text-xs shrink-0">
          <div className="flex items-center gap-1 py-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>💬 推演对话</span>
            </button>

            <button
              onClick={() => setActiveTab('artifact')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'artifact'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>结构化知识卡</span>
              {activeNode.artifact && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'docs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              <span>参考切片 ({activeNode.mountedChunks?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('meta')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'meta'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>认知状态</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Token 估算: ~{activeNode.fullTokens || 0}
          </div>
        </div>

        {/* 主视区内容切换 */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-text cursor-text selection:bg-indigo-600/40 selection:text-indigo-100"
        >
          {/* TAB 1: 核心推演对话 (Chat View) */}
          {activeTab === 'chat' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* 用户提问气泡 */}
              <div className="flex items-start gap-3 justify-end select-text">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600/90 to-indigo-800/90 text-white p-4 shadow-xl border border-indigo-500/40">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-indigo-200 mb-1.5 pb-1 border-b border-indigo-400/20">
                    <span className="font-semibold flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>我的提问</span>
                    </span>
                    <span className="font-mono text-[10px] text-indigo-300">
                      ID: {activeNode.id}
                    </span>
                  </div>
                  <div className="text-sm md:text-[15px] font-medium leading-relaxed whitespace-pre-wrap select-text">
                    {activeNode.userQuery}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* 知识卡就绪小条（引导点击切换） */}
              {activeNode.artifact && (
                <div
                  onClick={() => setActiveTab('artifact')}
                  className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200 cursor-pointer hover:bg-amber-950/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold">核心结论:</span>
                    <span className="truncate max-w-[420px] text-amber-100/90">
                      {activeNode.artifact.coreTakeaway}
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-400 underline shrink-0">
                    查看无损知识卡 →
                  </span>
                </div>
              )}

              {/* AI 回答气泡（主体：宽敞、高对比度、呼吸感极佳的排版） */}
              <div className="flex items-start gap-3 select-text">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-900/70 border border-slate-800/90 p-5 md:p-6 shadow-2xl relative">
                  {/* AI 回答顶部信息栏 */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI 深度推演解答</span>
                      </span>
                      {isStreamingThis && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950 border border-sky-500/50 text-sky-300 animate-pulse">
                          正在流式生成中...
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-700/50">
                      <span>💡 提示：划选任意词句可触发</span>
                      <span className="text-emerald-400 font-semibold">划词即分支</span>
                    </div>
                  </div>

                  {/* 详细 Markdown 内容 */}
                  <div className="prose prose-invert max-w-none">
                    {renderFormattedMarkdown(deferredContent)}
                    {isStreamingThis && (
                      <span className="inline-block w-2 h-4 ml-1 bg-sky-400 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* 回答尾部快捷追问行动按钮 */}
                  <div className="mt-6 pt-4 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 text-[11px]">快速沿此节点派生新探索：</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFollowupQuery(`针对「${activeNode.title}」的实现边界与极端异常场景深入分析`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        ⚡ 异常边界
                      </button>
                      <button
                        onClick={() => {
                          setFollowupQuery(`请给出「${activeNode.title}」的最小可运行复现代码演示`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        💻 代码复现
                      </button>
                      <button
                        onClick={() => {
                          setFollowupQuery(`对比分析「${activeNode.title}」与其他替代技术方案的优缺点`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        ⚖️ 方案权衡
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 结构化无损知识卡 (KnowledgeArtifact) */}
          {activeTab === 'artifact' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/50 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-indigo-900/40">
                  <span className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-amber-400" />
                    结构化无损知识卡 (Tier 2 语义骨架)
                  </span>
                  <span className="text-[11px] text-slate-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                    降级保留率 90%+ | ~{activeNode.artifactTokens || 20} Tokens
                  </span>
                </div>

                {activeNode.artifact ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                        核心认知结论 (Core Takeaway)
                      </div>
                      <div className="text-sm text-slate-100 font-medium leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                        🎯 {activeNode.artifact.coreTakeaway}
                      </div>
                    </div>

                    {activeNode.artifact.hardInvariants &&
                      activeNode.artifact.hardInvariants.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">
                            必须遵守的硬性约束 (Hard Invariants)
                          </div>
                          <div className="space-y-1.5">
                            {activeNode.artifact.hardInvariants.map((inv, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 rounded-lg bg-indigo-950/50 border border-indigo-700/60 text-indigo-200 font-mono flex items-center gap-2 text-xs"
                              >
                                <span>🔒</span>
                                <span>{inv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {activeNode.artifact.codeSignatures &&
                      activeNode.artifact.codeSignatures.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">
                            精准代码签名 (Code Signatures)
                          </div>
                          <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800 text-[12px] font-mono text-emerald-400 space-y-1 overflow-x-auto">
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
                  <div className="text-center py-8 text-slate-400 text-xs">
                    暂未生成知识卡，请在对话标签中重新推演。
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
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 text-sm block">
                  认识论状态门控 (Epistemic Status)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setNodeStatus(activeNode.id, 'exploring')}
                    className={`p-3 rounded-xl flex flex-col items-center gap-2 border transition-all ${
                      activeNode.status === 'exploring'
                        ? 'bg-slate-800 border-indigo-500 text-slate-100 shadow-md ring-1 ring-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                    <span className="font-semibold">探索中 (Exploring)</span>
                    <span className="text-[10px] text-slate-500 text-center">正在验证与演化</span>
                  </button>

                  <button
                    onClick={() => setNodeStatus(activeNode.id, 'verified')}
                    className={`p-3 rounded-xl flex flex-col items-center gap-2 border transition-all ${
                      activeNode.status === 'verified'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold">已验证 (Verified)</span>
                    <span className="text-[10px] text-slate-500 text-center">可作为基石信任</span>
                  </button>

                  <button
                    onClick={() => setNodeStatus(activeNode.id, 'deprecated')}
                    className={`p-3 rounded-xl flex flex-col items-center gap-2 border transition-all ${
                      activeNode.status === 'deprecated'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md ring-1 ring-rose-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    <AlertOctagon className="w-5 h-5 text-rose-400" />
                    <span className="font-semibold">已证伪 (Deprecated)</span>
                    <span className="text-[10px] text-slate-500 text-center">已被推翻或废弃</span>
                  </button>
                </div>
              </div>

              {/* 置顶与忽略控制 */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 text-sm block">
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
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      activeNode.manualState === 'pinned'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300'
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
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      activeNode.manualState === 'ignored'
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-zinc-200'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>{activeNode.manualState === 'ignored' ? '已忽略 (不编译入 Prompt)' : '临时忽略此节点'}</span>
                  </button>
                </div>
              </div>

              {/* 类别标签 */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 text-sm block">节点分类 (Category)</span>
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
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                        activeNode.category === cat
                          ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
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

        {/* 底部追问输入框（沉浸式聊天输入） */}
        <div className="p-4 bg-slate-900/95 border-t border-slate-800 shrink-0">
          <form onSubmit={handleFollowupSubmit} className="flex flex-col gap-2 max-w-4xl mx-auto">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300 font-medium">继续追问</span>
                <span className="text-slate-500">（将自动创建新分支节点进行推演）</span>
              </span>
              <span className="text-sky-400/80 font-mono text-[10px]">
                输入时触发 X-Ray 链路光照
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={followupQuery}
                onChange={(e) => setFollowupQuery(e.target.value)}
                onFocus={() => triggerXrayPreview(followupQuery)}
                onBlur={() => clearXrayPreview()}
                placeholder="在此输入新的追问或疑问，按 Enter 直接生成新分支..."
                className="w-full pl-4 pr-24 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
              />

              <button
                type="submit"
                disabled={!followupQuery.trim() || isStreaming}
                className="absolute right-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                <span>发送追问</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
