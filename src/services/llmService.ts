// services/llmService.ts
import type { LLMSettings } from '../types/canvas';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onFinish?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

/**
 * 获取请求目标 URL 和实际 Fetch 选项（自动处理开发环境 CORS 代理）
 */
function resolveEndpointAndHeaders(
  settings: LLMSettings,
  endpointPath: string
): { fetchUrl: string; headers: Record<string, string> } {
  const baseUrl = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const targetUrl = `${baseUrl}${endpointPath}`;

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (settings.apiKey) {
    if (settings.provider === 'claude') {
      baseHeaders['x-api-key'] = settings.apiKey;
      baseHeaders['anthropic-version'] = '2023-06-01';
    } else {
      baseHeaders['Authorization'] = `Bearer ${settings.apiKey}`;
    }
  }

  // 默认在支持的情况下优先通过开发服务器代理转发，彻底消除浏览器端跨域限制 (CORS block)
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const shouldUseProxy = settings.useProxy !== false && isDev && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');

  if (shouldUseProxy) {
    return {
      fetchUrl: '/api/llm-proxy',
      headers: {
        ...baseHeaders,
        'x-target-url': targetUrl,
      },
    };
  }

  return {
    fetchUrl: targetUrl,
    headers: baseHeaders,
  };
}

/**
 * 对部分常见模型别名进行规范化转换 (例如 deepseek-V4.1-flash -> deepseek-flash)
 */
export function normalizeModelName(model: string): string {
  const trimmed = (model || '').trim();
  if (/^deepseek[-_]?v?4\.?1[-_]?flash$/i.test(trimmed) || trimmed === 'DeepSeek-V4.1-Flash') {
    return 'deepseek-flash';
  }
  if (/^deepseek[-_]?v?4[-_]?pro$/i.test(trimmed)) {
    return 'deepseek-v4-pro';
  }
  return trimmed;
}

/**
 * 纯前端对接各云端/本地大模型，支持流式输出与智能降级
 */
export async function streamLLMResponse(
  compiledPrompt: string,
  settings: LLMSettings,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<string> {
  const { onChunk, onFinish, onError } = callbacks;
  let fullText = '';

  try {
    // 明确选择离线仿真引擎
    if (settings.provider === 'mock') {
      fullText = await simulateMockStream(compiledPrompt, onChunk, signal);
      onFinish?.(fullText);
      return fullText;
    }

    // 检查非本地/免密模型是否遗漏了 API Key
    if (
      settings.provider !== 'ollama' &&
      settings.provider !== 'custom' &&
      !settings.apiKey?.trim()
    ) {
      throw new Error(
        `未配置【${settings.provider}】的 API Key。请在顶部「模型设置」中填入有效密钥，或切换为「离线仿真引擎」/「本地 Ollama」。`
      );
    }

    // 处理 Claude 原生接口
    if (settings.provider === 'claude') {
      return await streamClaudeNative(compiledPrompt, settings, callbacks, signal);
    }

    // 标准 OpenAI 兼容端点 (DeepSeek, SiliconFlow, OpenRouter, Ollama, OpenAI, Moonshot, Zhipu, Custom)
    const { fetchUrl, headers } = resolveEndpointAndHeaders(settings, '/chat/completions');

    const requestBody = {
      model: normalizeModelName(settings.model || 'deepseek-flash'),
      messages: [
        {
          role: 'user',
          content: compiledPrompt,
        },
      ],
      temperature: settings.temperature ?? 0.3,
      stream: true,
    };


    let response: Response;
    try {
      response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal,
      });
    } catch (networkErr: any) {
      throw new Error(
        `网络请求失败（可能是跨域 CORS 拦截或端点不可达）：${networkErr?.message || networkErr}。建议使用 OpenRouter 或确保本地代理可用。`
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedMsg = errJson.error?.message || errJson.message || errText;
      } catch {
        // use raw
      }
      throw new Error(`[API 响应错误 ${response.status}] ${parsedMsg}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('响应流不可读 (ReadableStream not available)');

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        if (trimmed === 'data: [DONE]') break;

        try {
          const json = JSON.parse(trimmed.slice(5).trim());
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // ignore parsing partial chunk
        }
      }
    }

    onFinish?.(fullText);
    return fullText;
  } catch (err: unknown) {
    if (signal?.aborted) return fullText;
    const errorObj = err instanceof Error ? err : new Error(String(err));
    onError?.(errorObj);
    throw errorObj;
  }
}

/**
 * 针对 Anthropic Claude 原生 /messages 端点的流式处理
 */
async function streamClaudeNative(
  prompt: string,
  settings: LLMSettings,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<string> {
  const { onChunk, onFinish } = callbacks;
  const { fetchUrl, headers } = resolveEndpointAndHeaders(settings, '/messages');

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model || 'claude-3-5-sonnet-20241022',
      max_tokens: settings.maxTokens || 2048,
      temperature: settings.temperature ?? 0.3,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API [${response.status}]: ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      try {
        const json = JSON.parse(trimmed.slice(5).trim());
        if (json.type === 'content_block_delta' && json.delta?.text) {
          fullText += json.delta.text;
          onChunk(json.delta.text);
        }
      } catch {
        // ignore
      }
    }
  }

  onFinish?.(fullText);
  return fullText;
}

/**
 * 测试大模型端点连通性与密钥有效性
 */
export async function testLLMConnection(settings: LLMSettings): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = performance.now();

  if (settings.provider === 'mock') {
    return {
      success: true,
      latencyMs: 1,
      message: '仿真引擎就绪，无需网络与密钥。',
    };
  }

  try {
    const { fetchUrl, headers } = resolveEndpointAndHeaders(
      settings,
      settings.provider === 'claude' ? '/messages' : '/chat/completions'
    );

    const targetModel = normalizeModelName(settings.model || 'deepseek-flash');
    const testBody =
      settings.provider === 'claude'
        ? {
            model: targetModel,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'hi' }],
          }
        : {
            model: targetModel,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5,
          };


    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testBody),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const errText = await res.text();
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.error?.message || parsed.message || errText;
      } catch {
        // raw
      }
      return {
        success: false,
        latencyMs,
        message: `端点响应错误 [HTTP ${res.status}]: ${detail}`,
      };
    }

    return {
      success: true,
      latencyMs,
      message: `连通成功！模型「${settings.model}」响应正常 (${latencyMs}ms)。`,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      latencyMs,
      message: `网络连接失败: ${errMsg}`,
    };
  }
}

/**
 * 本地仿真流式生成引擎
 * 根据上下文编译案卷（XML）智能生成具备阶梯遵从性、代码签名及 [Ref: ...] 角标的内容
 */
async function simulateMockStream(
  promptXml: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const currentQueryMatch = /<current_query>([\s\S]*?)<\/current_query>/i.exec(promptXml);
  const currentQuery = currentQueryMatch ? currentQueryMatch[1].trim() : '系统推演';

  // 提取上下文中的信息
  const hasTier1 = promptXml.includes('<tier1_authoritative_sources>');
  const hasNegative = promptXml.includes('【已证伪废案】');
  const refMatches = Array.from(promptXml.matchAll(/id="([^"]+)"/g)).map((m) => m[1]);
  const parentRef = refMatches.find((id) => id !== 'node_root') || 'node_root';

  let responseBody = '';

  if (currentQuery.includes('内存屏障') || currentQuery.includes('Memory Barrier')) {
    responseBody = `### 内存屏障（Memory Barrier）的微架构机理

在多核弱内存序（如 ARM64/RISC-V）与乱序执行（Out-of-Order）系统中，编译器优化与 CPU 硬件流水线重排会导致指令执行乱序。依据前置脉络 [Ref: ${parentRef}]：

#### 1. 核心分类与屏障语义
- **LoadLoad 屏障**：确保该屏障前的所有读操作在该屏障后的读操作前完成；
- **StoreStore 屏障**：确保该屏障前的写操作对其他 CPU 可见后再执行后续写；
- **Full Memory Barrier (smp_mb)**：全屏障，保证绝对时间序。

\`\`\`c
// Linux 内核级写内存屏障宏定义
#define smp_wmb()    dmb(ishst)
#define smp_rmb()    dmb(ishld)
#define smp_mb()     dmb(ish)

static inline void commit_record(struct ring_buffer *rb) {
    WRITE_ONCE(rb->tail, new_tail);
    smp_wmb(); /* 保证数据写入完全对其他核可见后再更新提交位 */
    atomic_set(&rb->ready, 1);
}
\`\`\`

${hasNegative ? `> ⚠️ **[反向红线预警]**：系统严禁采用历史已证伪的全局粗粒度锁或单一大数组方案，应完全基于细粒度 Lock-Free 屏障。\n` : ''}
💡 [扩展推演] 在极端高吞吐场景下，还可以利用单生产者多消费者的 Disruptor 环形缓冲区实现伪共享消除（Cache Line Padding 64字节）。

核心结论：内存屏障通过硬件级流水线刷写与 Store Buffer 排水，提供了无锁并发的确定性一致性边界。`;
  } else if (currentQuery.includes('页表') || currentQuery.includes('Page Fault') || currentQuery.includes('虚拟内存')) {
    responseBody = `### 虚拟内存多级页表与缺页异常处理流程

基于权威设定 [Ref: ${parentRef}]，现代 64 位体系结构均采用四级页表（PGD -> P4D -> PUD -> PMD -> PTE）机制。

#### 1. 缺页中断触发流转
1. CPU 访问虚拟地址 VA，MMU 查询 TLB；
2. 若 TLB 未命中（TLB Miss），硬件执行 Page Table Walk；
3. 若 PTE 标志位 \`PTE_PRESENT\` 为 0，触发硬件 **Page Fault 异常 (Vector 14)**。

\`\`\`c
// Linux 内核缺页中断主入口函数签名
unsigned long do_page_fault(struct pt_regs *regs, unsigned long error_code, unsigned long address);
pte_t *lookup_address(unsigned long address, unsigned int *level);
\`\`\`

${hasTier1 ? `参考外部权威切片资料 [Ref: ${refMatches[0] || 'doc_chunk_0'}]，匿名页的缺页中断会直接申请物理页并清零分配，而文件映射页则调度 Page Cache 异步读盘。\n` : ''}
${hasNegative ? `> ⚠️ **[反向避坑]**：严禁采用单一大数组预分配全量虚存页表项（会导致巨额内存膨胀与虚存碎片化）。\n` : ''}
核心结论：通过按需四级延时分配与 CoW（写时复制）机制，系统将实际物理内存占用压缩了 95% 以上。`;
  } else {
    responseBody = `### 关于「${currentQuery}」的深入推演与工程落地

根据画布上下文推演 [Ref: ${parentRef}]，针对当前问题的关键技术架构分析如下：

#### 1. 核心架构约束与不变量
- 系统必须保证 **O(1)** 状态检索与零拷贝（Zero-Copy）管道传输；
- 状态同步遵守严格因果序，消除竞态窗口；
- 遵循前置节点确立的边界条件与硬核不变量。

\`\`\`typescript
// 规范函数签名定义
export async function handleExecutionPipeline(req: RequestContext): Promise<ExecutionResult> {
  // 1. 验证前置依赖状态
  validatePreconditions(req.state);
  // 2. 执行原子化提交
  return executeAtomically(req.payload);
}
\`\`\`

${hasNegative ? `> ⚠️ **[反向红线警戒]**：严格避免使用已知证伪路径中的失败方案。\n` : ''}
💡 [扩展推演] 建议引入自适应弹性退避与本地环形缓冲队列，在高并发拥塞时平滑吸收洪峰压力。

核心结论：通过模块间显式契约解耦与局部化状态收敛，系统兼顾了高性能吞吐与状态可靠性。`;
  }

  // 模拟真实流式打字效果
  const chunks = responseBody.split(/([\n\s，。：、]+)/).filter(Boolean);
  let accumulated = '';

  for (const c of chunks) {
    if (signal?.aborted) break;
    accumulated += c;
    onChunk(c);
    await new Promise((r) => setTimeout(r, 15));
  }

  return accumulated;
}
