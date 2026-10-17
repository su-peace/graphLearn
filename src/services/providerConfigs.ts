// services/providerConfigs.ts
import type { LLMProviderId } from '../types/canvas';

export interface ModelPreset {
  id: string;
  name: string;
  description: string;
}

export interface ProviderDefinition {
  id: LLMProviderId;
  name: string;
  badge: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresKey: boolean;
  models: ModelPreset[];
  description: string;
  keyHelpUrl?: string;
  supportsProxy?: boolean;
}

export const PROVIDER_DEFINITIONS: Record<LLMProviderId, ProviderDefinition> = {
  mock: {
    id: 'mock',
    name: '离线高保真仿真引擎',
    badge: '免配置',
    defaultBaseUrl: '',
    defaultModel: 'graphlearn-simulator-v1',
    requiresKey: false,
    models: [
      { id: 'graphlearn-simulator-v1', name: '系统级深度推演仿真器', description: '输出带 C 语言宏、内核函数签名与 [Ref: ...] 角标' },
    ],
    description: '无需任何网络或 API Key，点开即用，秒级流式体验符合认知证据阶梯的推演结果。',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek 官方 API',
    badge: '推荐',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-flash',
    requiresKey: true,
    keyHelpUrl: 'https://platform.deepseek.com',
    models: [
      { id: 'deepseek-flash', name: 'DeepSeek-V4.1-Flash', description: '高并发极速响应，支持超长上下文' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', description: '高精度深度推演模型' },
      { id: 'deepseek-chat', name: 'DeepSeek-V3', description: '旗舰通用大模型，代码与逻辑推演极强' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (推理思考)', description: '具备长思考链路的深度推理模型' },
    ],
    description: 'DeepSeek 官方开放平台，高智能与极佳性价比。',
  },

  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    badge: '国内高速免翻',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    requiresKey: true,
    keyHelpUrl: 'https://cloud.siliconflow.cn',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3 (硅基算力)', description: '国内高速响应无延迟' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1 (硅基深度思考)', description: '满血版 R1 深度推理' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', description: '通义千问开源旗舰' },
      { id: 'internlm/internlm2_5-20b-chat', name: '书生·浦语 20B', description: '长文本与代码能力优秀' },
    ],
    description: '国内领先的一站式大模型云平台，网络稳定极速，天然支持 OpenAI 接口格式。',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (全球聚合)',
    badge: '支持全部模型',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-r1',
    requiresKey: true,
    keyHelpUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: '全球高可用节点' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: '顶尖技术架构推演能力' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI 旗舰多模态' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: '开源开源生态领先' },
    ],
    description: '聚合全球顶尖大模型，天然支持浏览器 CORS 跨域请求。',
  },
  ollama: {
    id: 'ollama',
    name: '本地 Ollama (完全离线)',
    badge: '100% 本地隐私',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'deepseek-r1:8b',
    requiresKey: false,
    keyHelpUrl: 'https://ollama.com',
    models: [
      { id: 'deepseek-r1:8b', name: 'deepseek-r1:8b', description: '本地轻量蒸馏思考模型' },
      { id: 'qwen2.5:7b', name: 'qwen2.5:7b', description: '阿里通义千问 7B' },
      { id: 'qwen2.5:14b', name: 'qwen2.5:14b', description: '通义千问 14B 中等算力' },
      { id: 'llama3.1', name: 'llama3.1:8b', description: 'Meta 官方开源模型' },
    ],
    description: '连接本机运行的 Ollama 实例，无需外网，数据完全保留在本地。',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI 官方',
    badge: 'GPT 系列',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
    keyHelpUrl: 'https://platform.openai.com',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '高智能旗舰多模态' },
      { id: 'gpt-4o-mini', name: 'GPT-4o-mini', description: '极速轻量推荐' },
      { id: 'o1-mini', name: 'o1-mini', description: '强化推理思考模型' },
    ],
    description: 'OpenAI 官方 API 服务。',
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot AI (Kimi)',
    badge: '长文本专家',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    requiresKey: true,
    keyHelpUrl: 'https://platform.moonshot.cn',
    models: [
      { id: 'moonshot-v1-8k', name: 'moonshot-v1-8k', description: '标准问答' },
      { id: 'moonshot-v1-32k', name: 'moonshot-v1-32k', description: '长文本长上下文' },
    ],
    description: '月之暗面 Kimi 大模型开放平台。',
  },
  zhipu: {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    badge: '清华自研',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    requiresKey: true,
    keyHelpUrl: 'https://open.bigmodel.cn',
    models: [
      { id: 'glm-4-flash', name: 'GLM-4-Flash', description: '快速免费/极低成本' },
      { id: 'glm-4-plus', name: 'GLM-4-Plus', description: '智谱旗舰高智力模型' },
    ],
    description: '智谱 BigModel 开放平台。',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    badge: '顶尖推理',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    requiresKey: true,
    keyHelpUrl: 'https://console.anthropic.com',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '卓越的代码与架构思维' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '快速轻量' },
    ],
    description: 'Anthropic Claude 原生或代理接口。',
  },
  custom: {
    id: 'custom',
    name: '自定义 OpenAI 兼容接口',
    badge: '自由定制',
    defaultBaseUrl: 'http://localhost:8000/v1',
    defaultModel: 'custom-model',
    requiresKey: false,
    models: [],
    description: '支持任何 OneAPI、NewAPI、vLLM、LMStudio 或自建网关服务。',
  },
};
