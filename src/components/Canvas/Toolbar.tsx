// components/Canvas/Toolbar.tsx
import React, { useRef, useState } from 'react';
import {
  LayoutGrid,
  Plus,
  Eye,
  Settings,
  FileCode2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  FileText,
  FolderOpen,
  Cpu,
  ChevronDown,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { PROVIDER_DEFINITIONS } from '../../services/providerConfigs';
import type { LLMProviderId } from '../../types/canvas';

export const Toolbar: React.FC = () => {
  const graph = useCanvasStore((s) => s.graph);
  const autoLayout = useCanvasStore((s) => s.autoLayout);
  const addNode = useCanvasStore((s) => s.addNode);
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

  const [isQuickModelOpen, setIsQuickModelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProviderDef =
    PROVIDER_DEFINITIONS[llmSettings.provider] || PROVIDER_DEFINITIONS.mock;

  const handleCreateNode = async () => {
    const title = prompt('请输入新节点名称：', '新推演问题');
    if (!title) return;
    const query = prompt('请输入该节点的核心推演目标/提问：', `关于「${title}」的技术机理是什么？`);
    if (!query) return;

    await addNode({
      title,
      parentIds: [graph.rootNodeId],
      userQuery: query,
      category: 'concept_qa',
      autoTriggerStream: true,
    });
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
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-rose-500/80 shadow-2xl text-rose-300 text-xs animate-in slide-in-from-top-4 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
        {/* 品牌与当前会话切换器 */}
        <button
          onClick={() => setIsSessionManagerOpen(true)}
          type="button"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 shadow-xl backdrop-blur-md transition-all cursor-pointer text-left group"
          title="点击打开会话管理列表，可创建、切换、重命名或克隆思维导图"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 text-xs tracking-tight">GraphLearn</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                Local-First
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-300 font-medium truncate max-w-[140px]" title={graph.title}>
                {graph.title}
              </span>
              <FolderOpen className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* 核心操作按钮组 */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md text-xs">
          <button
            onClick={() => setIsSessionManagerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="打开多会话管理面板"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>会话列表</span>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            onClick={autoLayout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="基于 Dagre 算法自动整理分层思维导图结构"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span>整理排版</span>
          </button>

          <button
            onClick={handleCreateNode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建节点</span>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            onClick={() => {
              if (isXrayActive) {
                clearXrayPreview();
              } else {
                triggerXrayPreview();
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              isXrayActive
                ? 'bg-sky-950 border border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="X-Ray 实时预览：高亮入选编译器的上下文链路，半透明虚化旁系未入选节点"
          >
            <Eye className={`w-3.5 h-3.5 ${isXrayActive ? 'text-sky-300' : 'text-slate-400'}`} />
            <span>X-Ray 透视</span>
          </button>

          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="查看 Context Compiler 生成的 Epistemic Hierarchy XML 案卷"
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            <span>查看提示词案卷</span>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          {/* 快捷模型切换器 */}
          <div className="relative">
            <button
              onClick={() => setIsQuickModelOpen(!isQuickModelOpen)}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-200 transition-colors cursor-pointer"
              title="当前激活的模型引擎，点击可快捷切换"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-[11px] truncate max-w-[120px]">
                {llmSettings.provider === 'mock'
                  ? '⚡ 仿真引擎'
                  : `${currentProviderDef.name.split(' ')[0]}: ${llmSettings.model || '默认'}`}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* 快捷切换菜单 */}
            {isQuickModelOpen && (
              <div
                className="absolute top-full mt-2 left-0 w-64 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 text-xs animate-in fade-in"
                onMouseLeave={() => setIsQuickModelOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  快捷选择模型平台
                </div>

                {[
                  { id: 'mock', name: '⚡ 离线高保真仿真引擎', desc: '免 Key 秒级体验' },
                  { id: 'deepseek', name: '🤖 DeepSeek 官方', desc: 'deepseek-chat (V3)' },
                  { id: 'siliconflow', name: '🚀 硅基流动 (国内高速)', desc: '免翻墙稳定直连' },
                  { id: 'ollama', name: '🦙 本地 Ollama', desc: 'localhost:11434' },
                  { id: 'openrouter', name: '🌐 OpenRouter 全球聚合', desc: '聚合 Claude/GPT' },
                  { id: 'openai', name: '🟢 OpenAI 官方', desc: 'gpt-4o / o1-mini' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickSwitchProvider(item.id as LLMProviderId)}
                    className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      llmSettings.provider === item.id
                        ? 'bg-indigo-950 border border-indigo-500 text-indigo-200 font-medium'
                        : 'hover:bg-slate-850 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[11px]">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                    {llmSettings.provider === item.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))}

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    setIsQuickModelOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white font-medium transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>详细配置 API Key 与端点...</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          {/* 导出与复盘 */}
          <button
            onClick={handleDownloadJson}
            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="导出 .canvas.json"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            title="导出 Markdown 复盘报告"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="导入 .canvas.json"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={resetToDemo}
            className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            title="重置到内置演示拓扑 (TC-01 ~ TC-06)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
            title="模型完整设置 (可配置 API Key、Base URL 与连通性测试)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};
