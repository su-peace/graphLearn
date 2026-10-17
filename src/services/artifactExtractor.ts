// services/artifactExtractor.ts
import type { KnowledgeArtifact, NodeCategory } from '../types/canvas';

/**
 * 从长文本/AI 回复中异步抽取无损结构化知识卡片 (KnowledgeArtifact)
 * 保留硬核不变量、函数签名与高密度核心结论
 */
export function extractArtifactFromContent(params: {
  title?: string;
  category: NodeCategory;
  userQuery: string;
  aiResponse: string;
}): KnowledgeArtifact {
  const { title, category, userQuery, aiResponse } = params;

  // 1. 抽取函数签名 / 结构体定义 (C/C++, Rust, Go, Python, TS 等)
  const codeSignatures: string[] = [];
  const signatureRegex =
    /(?:(?:pub\s+|extern\s+|static\s+|inline\s+|async\s+)*(?:fn|function|def|void|int|long|pte_t\s*\*|bool|struct|interface|class|type)\s+([a-zA-Z0-9_]+)\s*(?:<[^>]+>)?\s*\([^)]*\)(?:\s*->\s*[^{;\n]+)?)|(?:(?:type|interface)\s+([A-Z][a-zA-Z0-9_]+)\s*=\s*\{?)/g;

  let match: RegExpExecArray | null;
  while ((match = signatureRegex.exec(aiResponse)) !== null) {
    const rawSig = match[0].trim().replace(/\s+/g, ' ');
    if (rawSig.length > 5 && rawSig.length < 120 && !codeSignatures.includes(rawSig)) {
      codeSignatures.push(rawSig);
      if (codeSignatures.length >= 4) break;
    }
  }

  // 2. 抽取硬核不变量、宏定义、约束与关键阈值
  const hardInvariants: string[] = [];
  const invariantPatterns = [
    /#define\s+[A-Z0-9_]+(?:\s+[^\n]+)?/g,
    /(?:O\(1\)|O\(log\s*n\)|O\(n\)|O\(n\^2\))/g,
    /(?:PGD\s*->\s*P4D\s*->\s*PUD\s*->\s*PMD\s*->\s*PTE)/g,
    /(?:CAS|Atomic|Barrier|TLB|Page\s*Fault|do_page_fault|RingBuffer|Zero-Copy|4KB|2MB|1GB)/gi,
    /(?:必须|严禁|不可行|约束|阈值|不变量|惩罚|上限|下限)[:：]\s*([^\n，。]+)/g,
  ];

  for (const pattern of invariantPatterns) {
    let invMatch: RegExpExecArray | null;
    while ((invMatch = pattern.exec(aiResponse)) !== null) {
      const val = (invMatch[1] || invMatch[0]).trim();
      if (val && !hardInvariants.includes(val)) {
        hardInvariants.push(val);
        if (hardInvariants.length >= 5) break;
      }
    }
    if (hardInvariants.length >= 5) break;
  }

  // 3. 生成 50 字以内核心结论
  let coreTakeaway = '';
  // 查找常见的结论引导词
  const summaryPrefixes = [
    /(?:核心结论|总结|本质上|关键点|结论)[:：]\s*([^\n]+)/i,
    /(?:首先|因此|通过|方案是)\s*([^\n，。]+[，。][^\n，。]+)/i,
  ];

  for (const prefix of summaryPrefixes) {
    const m = prefix.exec(aiResponse);
    if (m && m[1]) {
      coreTakeaway = m[1].trim();
      break;
    }
  }

  if (!coreTakeaway) {
    // 降级截取第一段有效回答
    const lines = aiResponse
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && !l.startsWith('#') && !l.startsWith('```'));
    coreTakeaway = lines[0] || aiResponse.slice(0, 50);
  }

  if (coreTakeaway.length > 50) {
    coreTakeaway = coreTakeaway.slice(0, 48) + '...';
  }

  // 4. 短标题 (10 字以内)
  let shortTitle = title || '';
  if (!shortTitle || shortTitle === '新探索节点') {
    shortTitle = userQuery.replace(/^[请问|什么是|如何|解释一下|深入探讨]+/, '').trim();
  }
  if (shortTitle.length > 10) {
    shortTitle = shortTitle.slice(0, 9) + '…';
  }

  return {
    title: shortTitle || '核心推演',
    category,
    coreTakeaway: coreTakeaway || '推演完成，无重大冲突',
    hardInvariants,
    codeSignatures,
  };
}
