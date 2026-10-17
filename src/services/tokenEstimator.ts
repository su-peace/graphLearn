// services/tokenEstimator.ts
import { getEncoding } from 'js-tiktoken';

let tokenizer: ReturnType<typeof getEncoding> | null = null;

try {
  // Use cl100k_base for GPT-4 / DeepSeek / modern token models
  tokenizer = getEncoding('cl100k_base');
} catch {
  tokenizer = null;
}

// 轻量级 LRU 缓存，避免重复对相同文本进行昂贵的 BPE 分词编码
const tokenCache = new Map<string, number>();
const MAX_CACHE_SIZE = 500;

/**
 * 极速启发式 Token 估算算法 (耗时 < 0.001ms)
 * 专为流式推演、高频 UI 渲染与实时输入而设计
 */
export function estimateTokensFast(text: string): number {
  if (!text) return 0;
  let count = 0;
  const len = text.length;
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) {
      count += 1.3; // 中文等 CJK 字符
    } else {
      count += 0.35; // ASCII 字母与符号
    }
  }
  return Math.max(1, Math.ceil(count));
}

/**
 * 实时估算文本的 Token 数量
 * 支持 LRU 缓存，优先使用 js-tiktoken cl100k_base，降级为启发式算法
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  if (text.length <= 10) return Math.ceil(text.length * 0.75);

  const cached = tokenCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  let result: number;
  if (tokenizer) {
    try {
      result = tokenizer.encode(text).length;
    } catch {
      result = estimateTokensFast(text);
    }
  } else {
    result = estimateTokensFast(text);
  }

  if (tokenCache.size >= MAX_CACHE_SIZE) {
    // 简易淘汰最早的 50 条缓存
    const it = tokenCache.keys();
    for (let i = 0; i < 50; i++) {
      const k = it.next().value;
      if (k) tokenCache.delete(k);
    }
  }
  tokenCache.set(text, result);

  return result;
}

