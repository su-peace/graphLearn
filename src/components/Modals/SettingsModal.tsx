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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-[16px] glass-elevated border border-[var(--line-default)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-subtle)] bg-[var(--surface-2)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--surface-3)] border border-[var(--line-subtle)] flex items-center justify-center text-[var(--accent-focus)]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-1)] flex items-center gap-2">
                <span>大模型推理引擎配置</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--line-subtle)]">
                  {currentProviderDef.name}
                </span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">
                支持国内外主流 API、本地 Ollama 与纯前端离线仿真
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Provider Selection Carousel / Badges */}
          <div className="space-y-2">
            <label className="font-semibold text-[var(--text-1)] flex items-center justify-between">
              <span>选择服务平台 (Provider)</span>
              {currentProviderDef.keyHelpUrl && (
                <a
                  href={currentProviderDef.keyHelpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--accent-focus)] hover:underline flex items-center gap-1"
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
                    className={`p-2 rounded-[8px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--surface-2)] border-[var(--accent-focus)] text-[var(--text-1)] shadow-xs ring-1 ring-[var(--accent-focus)]'
                        : 'bg-[var(--surface-1)] border-[var(--line-subtle)] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <span className="font-semibold text-[11px] truncate block">{def.name}</span>
                    <span className="text-[9px] px-1 py-0.2 mt-1 rounded bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--line-subtle)] w-fit font-mono">
                      {def.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-[var(--text-3)] mt-1 leading-relaxed bg-[var(--surface-2)]/50 p-2.5 rounded-[8px] border border-[var(--line-subtle)]">
              💡 {currentProviderDef.description}
            </p>
          </div>

          {/* If Mock Engine */}
          {formData.provider === 'mock' ? (
            <div className="p-4 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-500">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-xs block text-[var(--text-1)]">已激活本地高保真仿真引擎</span>
                <p className="text-[11px] text-[var(--text-2)] leading-relaxed">
                  无需联网与 API Key，系统根据认知证据阶梯案卷规范实时流式生成 C 语言内核宏定义、缺页中断链路与
                  <code>[Ref: 节点ID]</code> 交互徽章，零摩擦开展推演验证。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-[10px] bg-[var(--surface-2)]/60 border border-[var(--line-subtle)]">
              {/* API Base URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
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
                    className="text-[10px] text-[var(--text-3)] hover:text-[var(--text-1)] flex items-center gap-1 cursor-pointer"
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
                  className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--line-subtle)] rounded-[8px] text-[var(--text-1)] font-mono text-xs focus:border-[var(--accent-focus)] focus:outline-none"
                />
              </div>

              {/* API Key */}
              {currentProviderDef.requiresKey ? (
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-1)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
                      <span>API 密钥 (API Key)</span>
                    </span>
                    <span className="text-[10px] text-emerald-500 font-normal">
                      🔒 仅存储于本地 IndexedDB
                    </span>
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full pl-3 pr-10 py-2 bg-[var(--surface-1)] border border-[var(--line-subtle)] rounded-[8px] text-[var(--text-1)] font-mono text-xs focus:border-[var(--accent-focus)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text-2)] bg-[var(--surface-1)] p-2.5 rounded-[8px] border border-[var(--line-subtle)] flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>当前平台无需提供 API Key，将直接访问配置的本地端点。</span>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--text-1)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
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
                        className={`px-2.5 py-1 rounded-[6px] text-[11px] font-mono transition-colors cursor-pointer ${
                          formData.model === m.id
                            ? 'bg-[var(--text-1)] text-[var(--surface-1)] font-medium'
                            : 'bg-[var(--surface-1)] hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--line-subtle)]'
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
                  className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--line-subtle)] rounded-[8px] text-[var(--text-1)] font-mono text-xs focus:border-[var(--accent-focus)] focus:outline-none"
                />
              </div>

              {/* CORS Proxy Option */}
              <div className="pt-2 flex items-center justify-between border-t border-[var(--line-subtle)] text-[11px]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text-1)]">启用本地开发跨域代理 (Bypass CORS)</span>
                  <span className="text-[var(--text-3)] text-[10px]">
                    通过本地 Vite 开发服务器转发请求，彻底避免浏览器报错「Blocked by CORS」
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.useProxy !== false}
                  onChange={(e) => setFormData({ ...formData, useProxy: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent-focus)] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Temperature & Token Hyperparams */}
          <div className="space-y-3 p-4 rounded-[10px] bg-[var(--surface-2)]/50 border border-[var(--line-subtle)]">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text-1)] text-xs">
              <Sliders className="w-3.5 h-3.5 text-[var(--accent-focus)]" />
              <span>推理超参数调整</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-3)]">发散度 (Temperature):</span>
                <span className="font-mono text-[var(--text-1)]">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-[var(--accent-focus)]"
              />
            </div>
          </div>

          {/* Test Connection Output Box */}
          {testResult && (
            <div
              className={`p-3 rounded-[8px] border flex items-start gap-2.5 text-xs animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-semibold block">
                  {testResult.success ? '连接测试通过' : '连接测试失败'}
                </span>
                <p className="text-[11px] leading-relaxed break-all">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--line-subtle)]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-[var(--accent-focus)] ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? '正在测试连通性...' : '测试模型连接'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] font-medium transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[var(--text-1)] hover:opacity-90 text-[var(--surface-1)] font-medium shadow-xs transition-colors cursor-pointer"
              >
                {savedTip ? <Check className="w-4 h-4 text-emerald-500" /> : null}
                <span>{savedTip ? '已保存设置' : '保存模型配置'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
