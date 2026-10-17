// components/Modals/SettingsModal.tsx
import React, { useState } from 'react';
import {
  X,
  Key,
  Server,
  Cpu,
  Check,
  ShieldCheck,
  ExternalLink,
  Activity,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Sliders,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { LLMProviderId, LLMSettings } from '../../types/canvas';
import { PROVIDER_DEFINITIONS } from '../../services/providerConfigs';
import { testLLMConnection } from '../../services/llmService';

export const SettingsModal: React.FC = () => {
  const isSettingsOpen = useCanvasStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useCanvasStore((s) => s.setIsSettingsOpen);
  const llmSettings = useCanvasStore((s) => s.llmSettings);
  const updateSettings = useCanvasStore((s) => s.updateSettings);

  const [formData, setFormData] = useState<LLMSettings>(llmSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [savedTip, setSavedTip] = useState(false);

  if (!isSettingsOpen) return null;

  const currentProviderDef =
    PROVIDER_DEFINITIONS[formData.provider] || PROVIDER_DEFINITIONS.mock;

  const handleProviderChange = (providerId: LLMProviderId) => {
    const def = PROVIDER_DEFINITIONS[providerId];
    if (!def) return;

    setFormData((prev) => ({
      ...prev,
      provider: providerId,
      baseUrl: def.defaultBaseUrl,
      model: def.defaultModel,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testLLMConnection(formData);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: `测试异常: ${e?.message || e}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedTip(true);
    setTimeout(() => {
      setSavedTip(false);
      setIsSettingsOpen(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>大模型推理引擎配置</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {currentProviderDef.name}
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                支持国内外主流 API、本地 Ollama 与纯前端离线仿真
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Provider Selection Carousel / Badges */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span>选择服务平台 (Provider)</span>
              {currentProviderDef.keyHelpUrl && (
                <a
                  href={currentProviderDef.keyHelpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>获取该平台 API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(Object.keys(PROVIDER_DEFINITIONS) as LLMProviderId[]).map((pid) => {
                const def = PROVIDER_DEFINITIONS[pid];
                const isSelected = formData.provider === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleProviderChange(pid)}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/90 border-indigo-500 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold text-[11px] truncate block">{def.name}</span>
                    <span className="text-[9px] px-1 py-0.2 mt-1 rounded bg-slate-900 text-slate-400 border border-slate-800 w-fit">
                      {def.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
              💡 {currentProviderDef.description}
            </p>
          </div>

          {/* If Mock Engine */}
          {formData.provider === 'mock' ? (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex items-start gap-3 text-emerald-300">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div className="space-y-1">
                <span className="font-semibold text-xs block">已激活本地高保真仿真引擎</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  无需联网与 API Key，系统根据认知证据阶梯案卷规范实时流式生成 C 语言内核宏定义、缺页中断链路与
                  <code>[Ref: 节点ID]</code> 交互徽章，零摩擦开展推演验证。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              {/* API Base URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    <span>接口端点 (Base URL)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        baseUrl: currentProviderDef.defaultBaseUrl,
                      }))
                    }
                    className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>恢复默认</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder={currentProviderDef.defaultBaseUrl || 'https://api.openai.com/v1'}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* API Key */}
              {currentProviderDef.requiresKey ? (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>API 密钥 (API Key)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-normal">
                      🔒 仅存储于本地 IndexedDB
                    </span>
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>当前平台无需提供 API Key，将直接访问配置的本地端点。</span>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    <span>模型名称 (Model)</span>
                  </span>
                </label>

                {currentProviderDef.models.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {currentProviderDef.models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, model: m.id })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                          formData.model === m.id
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                        title={m.description}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="手动输入任意模型标识..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* CORS Proxy Option */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-[11px]">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">启用本地开发跨域代理 (Bypass CORS)</span>
                  <span className="text-slate-400 text-[10px]">
                    通过本地 Vite 开发服务器转发请求，彻底避免浏览器报错「Blocked by CORS」
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.useProxy !== false}
                  onChange={(e) => setFormData({ ...formData, useProxy: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Temperature & Token Hyperparams */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>推理超参数调整</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">发散度 (Temperature):</span>
                <span className="font-mono text-slate-200">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Test Connection Output Box */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/60 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold block">
                  {testResult.success ? '连接测试通过' : '连接测试失败'}
                </span>
                <p className="text-[11px] leading-relaxed break-all">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-sky-400 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? '正在测试连通性...' : '测试模型连接'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md transition-colors cursor-pointer"
              >
                {savedTip ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                <span>{savedTip ? '已保存设置' : '保存模型配置'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
