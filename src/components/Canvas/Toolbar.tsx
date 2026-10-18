// components/Canvas/Toolbar.tsx
import React, { useRef, useState, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  Eye,
  Settings,
  FileCode2,
  Download,
  Upload,
  RotateCcw,
  FileText,
  Cpu,
  ChevronDown,
  Check,
  AlertCircle,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { PROVIDER_DEFINITIONS } from '../../services/providerConfigs';
import type { LLMProviderId } from '../../types/canvas';

export const Toolbar: React.FC = () => {
  const graph = useCanvasStore((s) => s.graph);
  const autoLayout = useCanvasStore((s) => s.autoLayout);
  const openCreateNodeModal = useCanvasStore((s) => s.openCreateNodeModal);
  const isXrayActive = useCanvasStore((s) => s.isXrayActive);
  const triggerXrayPreview = useCanvasStore((s) => s.triggerXrayPreview);
  const clearXrayPreview = useCanvasStore((s) => s.clearXrayPreview);
  const setIsSettingsOpen = useCanvasStore((s) => s.setIsSettingsOpen);
  const setIsInspectorOpen = useCanvasStore((s) => s.setIsInspectorOpen);
  const setIsSessionManagerOpen = useCanvasStore((s) => s.setIsSessionManagerOpen);
  const resetToDemo = useCanvasStore((s) => s.resetToDemo);
  const exportGraphJson = useCanvasStore((s) => s.exportGraphJson);
  const exportMarkdownReport = useCanvasStore((s) => s.exportMarkdownReport);
  const importGraphJson = useCanvasStore((s) => s.importGraphJson);
  const llmSettings = useCanvasStore((s) => s.llmSettings);
  const updateSettings = useCanvasStore((s) => s.updateSettings);
  const toastMessage = useCanvasStore((s) => s.toastMessage);
  const setToastMessage = useCanvasStore((s) => s.setToastMessage);
  const theme = useCanvasStore((s) => s.theme);
  const toggleTheme = useCanvasStore((s) => s.toggleTheme);

  const [isQuickModelOpen, setIsQuickModelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProviderDef =
    PROVIDER_DEFINITIONS[llmSettings.provider] || PROVIDER_DEFINITIONS.mock;

  // 计算当前图谱的 Token 占用总量 (DESIGN.md §6.2: 极简胶囊容量)
  const totalTokens = useMemo(() => {
    return Object.values(graph.nodes).reduce(
      (sum, n) => sum + (n.fullTokens || 0),
      0
    );
  }, [graph.nodes]);

  const maxBudget = 32000;
  const tokenPercent = Math.min(100, Math.round((totalTokens / maxBudget) * 100));
  const isOverBudget = tokenPercent > 85;

  const handleCreateNode = () => {
    openCreateNodeModal();
  };

  const handleDownloadJson = () => {
    const jsonStr = exportGraphJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.title.replace(/\s+/g, '_')}.canvas.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const mdStr = exportMarkdownReport();
    const blob = new Blob([mdStr], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.title.replace(/\s+/g, '_')}_复盘报告.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importGraphJson(content);
        if (ok) {
          alert('图谱导入成功！');
        } else {
          alert('图谱格式不合法，请检查 JSON 内容。');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickSwitchProvider = (pid: LLMProviderId) => {
    const def = PROVIDER_DEFINITIONS[pid];
    if (!def) return;

    updateSettings({
      provider: pid,
      baseUrl: def.defaultBaseUrl,
      model: def.defaultModel,
    });
    setIsQuickModelOpen(false);
  };

  return (
    <>
      {/* 顶部全局提示横幅 (Toast) */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass border-[var(--status-deprecated)] shadow-xl text-[var(--status-deprecated)] text-xs animate-in slide-in-from-top-3">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.6} />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>
        </div>
      )}

      {/* 精密光学悬浮导航栏 (DESIGN.md §5.1) */}
      <header className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* 左侧：纯粹几何 Logo 与会话切换器 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsSessionManagerOpen(true)}
            type="button"
            className="flex items-center gap-2.5 px-3 py-1.5 h-11 rounded-full glass hover:border-[var(--line-strong)] transition-all cursor-pointer group text-left shadow-sm"
            title="会话管理 (点击可切换、新建或重命名思维导图)"
          >
            {/* 去 AI 符号化：纯几何极简徽标 */}
            <div className="w-6 h-6 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-fg)] flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="2" width="5" height="5" rx="1.2" />
                <rect x="9" y="9" width="5" height="5" rx="1.2" />
                <path d="M7 4.5h4.5V9" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="flex flex-col pr-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs tracking-tight text-[var(--text-1)]">
                  GraphLearn
                </span>
                <span className="text-[9px] font-mono text-[var(--text-3)] font-normal border border-[var(--line-default)] px-1 rounded">
                  v2.0
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-3)] font-medium mt-0.5">
                <span className="truncate max-w-[120px]" title={graph.title}>
                  {graph.title}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--text-3)] group-hover:translate-y-0.5 transition-transform" strokeWidth={1.6} />
              </div>
            </div>
          </button>
        </div>

        {/* 中间：核心画布工具组 (精密圆角悬浮栏) */}
        <nav className="flex items-center gap-1 p-1 h-11 rounded-full glass shadow-sm pointer-events-auto text-xs">
          {/* 整理排版 (Dagre) */}
          <button
            onClick={autoLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="整理排版 (快捷键: Ctrl+L)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[var(--text-2)]" strokeWidth={1.6} />
            <span className="font-medium hidden sm:inline">整理</span>
          </button>

          {/* 新建节点 */}
          <button
            onClick={handleCreateNode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-primary)] hover:opacity-90 text-[var(--accent-fg)] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="在根目标下新建推演节点"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>新建</span>
          </button>

          <div className="w-px h-3.5 bg-[var(--line-default)] mx-0.5" />

          {/* X-Ray 链路透视 */}
          <button
            onClick={() => {
              if (isXrayActive) {
                clearXrayPreview();
              } else {
                triggerXrayPreview();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer font-medium ${
              isXrayActive
                ? 'bg-[var(--accent-xray)] text-white shadow-sm'
                : 'hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
            title="X-Ray 链路透视 (快捷键: Ctrl+Shift+X)"
          >
            <Eye className="w-3.5 h-3.5" strokeWidth={1.6} />
            <span className="hidden sm:inline">透视</span>
          </button>

          {/* 证据案卷检视器 */}
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="查看当前节点编译生成的 Epistemic Hierarchy XML 案卷"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[var(--text-3)]" strokeWidth={1.6} />
            <span className="hidden md:inline font-medium">案卷</span>
          </button>

          <div className="w-px h-3.5 bg-[var(--line-default)] mx-0.5" />

          {/* 快捷模型切换器 */}
          <div className="relative">
            <button
              onClick={() => setIsQuickModelOpen(!isQuickModelOpen)}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] transition-colors cursor-pointer"
              title="当前激活的推演推理引擎"
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--text-3)]" strokeWidth={1.6} />
              <span className="font-medium text-[11px] truncate max-w-[105px]">
                {llmSettings.provider === 'mock'
                  ? '离线仿真'
                  : `${currentProviderDef.name.split(' ')[0]}: ${llmSettings.model || '默认'}`}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--text-3)]" strokeWidth={1.6} />
            </button>

            {/* 快捷切换菜单 */}
            {isQuickModelOpen && (
              <div
                className="absolute top-full mt-2 left-0 w-64 p-1.5 glass-elevated rounded-2xl shadow-xl z-50 flex flex-col gap-1 text-xs animate-in fade-in"
                onMouseLeave={() => setIsQuickModelOpen(false)}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                  选择模型平台
                </div>

                {[
                  { id: 'mock', name: '离线仿真引擎', desc: '免 Key 本地秒级验证' },
                  { id: 'deepseek', name: 'DeepSeek 官方', desc: 'deepseek-chat (V3)' },
                  { id: 'siliconflow', name: '硅基流动 (国内直连)', desc: '高速免翻' },
                  { id: 'ollama', name: '本地 Ollama', desc: 'localhost:11434' },
                  { id: 'openrouter', name: 'OpenRouter 聚合', desc: 'Claude / GPT 统一通道' },
                  { id: 'openai', name: 'OpenAI 官方', desc: 'gpt-4o / o1-mini' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickSwitchProvider(item.id as LLMProviderId)}
                    className={`flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      llmSettings.provider === item.id
                        ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-semibold'
                        : 'hover:bg-[var(--surface-2)] text-[var(--text-2)]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[11px]">{item.name}</div>
                      <div className="text-[10px] text-[var(--text-3)]">{item.desc}</div>
                    </div>
                    {llmSettings.provider === item.id && (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-focus)] shrink-0" strokeWidth={2} />
                    )}
                  </button>
                ))}

                <div className="h-px bg-[var(--line-subtle)] my-1" />

                <button
                  onClick={() => {
                    setIsQuickModelOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] font-medium transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>配置完整 API Key 与端点...</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* 右侧：极简容量条、明暗主题切换与工具按钮 */}
        <div className="flex items-center gap-1 p-1 h-11 rounded-full glass shadow-sm pointer-events-auto text-xs">
          {/* Token 极简容量条 (DESIGN.md §6.2) */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono text-[var(--text-3)]"
            title={`上下文 Token 累计: ~${totalTokens} / ${maxBudget} (${tokenPercent}%)`}
          >
            <div className="w-9 h-1.5 rounded-full bg-[var(--line-default)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverBudget ? 'bg-[var(--status-deprecated)]' : 'bg-[var(--text-3)]'
                }`}
                style={{ width: `${tokenPercent}%` }}
              />
            </div>
            <span className="text-[10px]">{totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}</span>
          </div>

          <div className="w-px h-3.5 bg-[var(--line-default)] mx-0.5" />

          {/* 明暗模式切换器 (DESIGN.md §5.1) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-transform duration-200 cursor-pointer active:scale-90"
            title={`切换主题 (当前: ${theme === 'dark' ? '曜石暗色' : '纸本明色'})`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" strokeWidth={1.6} />
            ) : (
              <Moon className="w-3.5 h-3.5" strokeWidth={1.6} />
            )}
          </button>

          {/* 导出 JSON */}
          <button
            onClick={handleDownloadJson}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="导出 .canvas.json"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>

          {/* 导出 Markdown */}
          <button
            onClick={handleDownloadMarkdown}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="导出 Markdown 复盘手稿"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>

          {/* 导入 JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="导入 .canvas.json"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

          {/* 重置演示数据 */}
          <button
            onClick={resetToDemo}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-3)] hover:text-[var(--status-deprecated)] transition-colors cursor-pointer"
            title="重置到内置演示拓扑 (TC-01 ~ TC-06)"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>

          {/* 全局模型设置 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="推理引擎与全局设置"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>
        </div>
      </header>
    </>
  );
};
