// src/services/exportService.ts
// 多格式导出核心服务：Mermaid 流程图、OPML 2.0 导图、Markdown 架构复盘报告、JSON 档案

import type { CanvasGraph, CanvasNodeData, NodeCategory } from '../types/canvas';

/**
 * 类别中文徽标映射
 */
const CATEGORY_LABEL_MAP: Record<NodeCategory, string> = {
  root_goal: '🎯 核心命题',
  core_conclusion: '💡 主干结论',
  code_impl: '💻 技术实现',
  concept_qa: '❓ 概念辨析',
  chitchat_debug: '🔧 演算调试',
};

/**
 * 清洗 Mermaid 节点标识符（仅保留字母数字下划线）
 */
function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * 清洗 Mermaid 文本内容，防止特殊字符破坏 Mermaid 解析
 */
function sanitizeMermaidText(text: string): string {
  if (!text) return '';
  return text
    .replace(/"/g, "'")
    .replace(/[[\]{}()]/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * XML 实体字符转义
 */
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 1. 导出为标准 Mermaid 流程图源码 (graph TD / flowchart TD)
 * - 支持节点认知状态着色 (verified / deprecated / exploring / root)
 * - 根节点采用特殊圆角舱形，已证伪节点使用删除线与红色虚线
 * - 递归组织连线关系与样式类
 */
export function exportToMermaid(graph: CanvasGraph): string {
  const nodes = Object.values(graph.nodes || {});
  if (nodes.length === 0) {
    return 'flowchart TD\n  empty["(画布暂无节点)"]\n';
  }

  const lines: string[] = [];
  lines.push('flowchart TD');
  lines.push('  %% ==========================================');
  lines.push(`  %% GraphLearn 思维导图导出 · ${graph.title}`);
  lines.push(`  %% 生成时间: ${new Date().toLocaleString()}`);
  lines.push('  %% ==========================================\n');

  // 定义认知状态样式类 (符合 md/DESIGN.md 精密光学与克制工业色标)
  lines.push('  %% 认知状态样式类定义');
  lines.push('  classDef rootNode fill:#FEF3C7,stroke:#B45309,stroke-width:2.5px,color:#92400E;');
  lines.push('  classDef verifiedNode fill:#DCFCE7,stroke:#15803D,stroke-width:2px,color:#14532D;');
  lines.push('  classDef deprecatedNode fill:#FEE2E2,stroke:#B91C1C,stroke-width:1.5px,stroke-dasharray:4 4,color:#7F1D1D;');
  lines.push('  classDef exploringNode fill:#F4F4F5,stroke:#71717A,stroke-width:1.5px,stroke-dasharray:3 3,color:#3F3F46;\n');

  // 1. 声明节点与形状
  lines.push('  %% 节点定义');
  const classAssignments: { id: string; className: string }[] = [];

  for (const node of nodes) {
    const safeId = sanitizeMermaidId(node.id);
    const cleanTitle = sanitizeMermaidText(node.title || node.id);
    const isRoot = node.id === graph.rootNodeId || node.category === 'root_goal';

    if (isRoot) {
      lines.push(`  ${safeId}(["🎯 ${cleanTitle}"])`);
      classAssignments.push({ id: safeId, className: 'rootNode' });
    } else if (node.status === 'deprecated') {
      lines.push(`  ${safeId}["~~[已证伪] ${cleanTitle}~~"]`);
      classAssignments.push({ id: safeId, className: 'deprecatedNode' });
    } else if (node.status === 'verified') {
      lines.push(`  ${safeId}["✓ ${cleanTitle}"]`);
      classAssignments.push({ id: safeId, className: 'verifiedNode' });
    } else {
      lines.push(`  ${safeId}["? ${cleanTitle}"]`);
      classAssignments.push({ id: safeId, className: 'exploringNode' });
    }
  }

  lines.push('');

  // 2. 声明父子连线拓扑
  lines.push('  %% 拓扑连线');
  const renderedEdges = new Set<string>();

  for (const node of nodes) {
    const targetSafeId = sanitizeMermaidId(node.id);
    if (node.parentIds && node.parentIds.length > 0) {
      for (const parentId of node.parentIds) {
        if (graph.nodes[parentId]) {
          const sourceSafeId = sanitizeMermaidId(parentId);
          const edgeKey = `${sourceSafeId}->${targetSafeId}`;
          if (!renderedEdges.has(edgeKey)) {
            renderedEdges.add(edgeKey);
            lines.push(`  ${sourceSafeId} --> ${targetSafeId}`);
          }
        }
      }
    } else if (node.id !== graph.rootNodeId && graph.nodes[graph.rootNodeId]) {
      // 若非根节点且无父节点，以虚线关联至根节点
      const rootSafeId = sanitizeMermaidId(graph.rootNodeId);
      const edgeKey = `${rootSafeId}-.->${targetSafeId}`;
      if (!renderedEdges.has(edgeKey)) {
        renderedEdges.add(edgeKey);
        lines.push(`  ${rootSafeId} -.-> ${targetSafeId}`);
      }
    }
  }

  lines.push('');

  // 3. 关联样式类
  lines.push('  %% 样式类绑定');
  for (const item of classAssignments) {
    lines.push(`  class ${item.id} ${item.className};`);
  }

  return lines.join('\n') + '\n';
}

/**
 * 2. 导出为规范 OPML 2.0 XML 格式
 * - 递归组织父子层级 outline
 * - 深度集成思维导图（MindNode, XMind, MindManager, OmniOutliner）的 _note 与 text 规范
 */
export function exportToOPML(graph: CanvasGraph): string {
  const rootNode = graph.nodes[graph.rootNodeId] || Object.values(graph.nodes)[0];
  const title = escapeXml(graph.title || '思维导图');
  const nowRfc = new Date().toUTCString();

  // 构建子节点映射
  const childrenMap: Record<string, string[]> = {};
  for (const node of Object.values(graph.nodes)) {
    if (node.parentIds && node.parentIds.length > 0) {
      for (const pId of node.parentIds) {
        if (!childrenMap[pId]) {
          childrenMap[pId] = [];
        }
        if (!childrenMap[pId].includes(node.id)) {
          childrenMap[pId].push(node.id);
        }
      }
    }
  }

  const visitedGlobal = new Set<string>();

  function renderOutlineNode(node: CanvasNodeData, indentLevel: number, pathVisited: Set<string>): string {
    const indent = '  '.repeat(indentLevel);
    visitedGlobal.add(node.id);

    // 格式化展示标题与状态标识
    let statusPrefix = '';
    if (node.id === graph.rootNodeId) {
      statusPrefix = '🎯 ';
    } else if (node.status === 'verified') {
      statusPrefix = '🟢 ';
    } else if (node.status === 'deprecated') {
      statusPrefix = '🔴 [已证伪] ';
    } else {
      statusPrefix = '⚪ ';
    }

    const nodeText = escapeXml(`${statusPrefix}${node.title || '未命名节点'}`);

    // 将用户提问、核心结论与回答摘要放入 _note
    const noteParts: string[] = [];
    if (node.userQuery) {
      noteParts.push(`【提问】: ${node.userQuery}`);
    }
    if (node.artifact?.coreTakeaway) {
      noteParts.push(`【核心结论】: ${node.artifact.coreTakeaway}`);
    }
    if (node.artifact?.hardInvariants && node.artifact.hardInvariants.length > 0) {
      noteParts.push(`【硬核不变量】: ${node.artifact.hardInvariants.join(', ')}`);
    }
    if (node.aiResponse) {
      const cleanSnippet = node.aiResponse.replace(/\r?\n/g, ' ').slice(0, 300);
      noteParts.push(`【推演摘要】: ${cleanSnippet}...`);
    }
    const noteAttr = noteParts.length > 0 ? ` _note="${escapeXml(noteParts.join('\n\n'))}"` : '';
    const statusAttr = ` _status="${escapeXml(node.status)}"`;
    const categoryAttr = ` _category="${escapeXml(node.category)}"`;

    const childIds = childrenMap[node.id] || [];
    // 过滤防止递归死循环（DAG 环保护）
    const validChildIds = childIds.filter((cid) => !pathVisited.has(cid));

    if (validChildIds.length === 0) {
      return `${indent}<outline text="${nodeText}"${noteAttr}${statusAttr}${categoryAttr} />\n`;
    }

    let out = `${indent}<outline text="${nodeText}"${noteAttr}${statusAttr}${categoryAttr}>\n`;
    const nextPathVisited = new Set(pathVisited);
    nextPathVisited.add(node.id);

    for (const childId of validChildIds) {
      const childNode = graph.nodes[childId];
      if (childNode) {
        out += renderOutlineNode(childNode, indentLevel + 1, nextPathVisited);
      }
    }
    out += `${indent}</outline>\n`;
    return out;
  }

  let bodyContent = '';
  if (rootNode) {
    bodyContent += renderOutlineNode(rootNode, 2, new Set());
  }

  // 检查是否有未在根分支中的孤立节点
  const orphanNodes = Object.values(graph.nodes).filter((n) => !visitedGlobal.has(n.id));
  if (orphanNodes.length > 0) {
    bodyContent += '    <outline text="📌 独立分支与拓展推演">\n';
    for (const orphan of orphanNodes) {
      bodyContent += renderOutlineNode(orphan, 3, new Set());
    }
    bodyContent += '    </outline>\n';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${title}</title>
    <dateCreated>${nowRfc}</dateCreated>
    <dateModified>${nowRfc}</dateModified>
    <ownerName>GraphLearn</ownerName>
  </head>
  <body>
${bodyContent}  </body>
</opml>
`;
}

/**
 * 3. 导出为系统级 Markdown 架构复盘报告
 * 包含：根目标、推演全景脉络、无损知识卡精粹、反向避坑列表、参考资料切片
 */
export function exportToMarkdown(graph: CanvasGraph): string {
  const nodes = Object.values(graph.nodes || {});
  const rootNode = graph.nodes[graph.rootNodeId] || nodes[0];

  const verifiedNodes = nodes.filter((n) => n.status === 'verified');
  const deprecatedNodes = nodes.filter((n) => n.status === 'deprecated');
  const exploringNodes = nodes.filter((n) => n.status === 'exploring');

  let md = `# ${graph.title || '思维导图'} · 认知推演与系统架构复盘报告\n\n`;

  // 元数据横幅
  md += `> **图谱 ID**：\`${graph.graphId}\`  \n`;
  md += `> **导出时间**：${new Date().toLocaleString()}  \n`;
  md += `> **节点统计**：共 ${nodes.length} 个节点（🟢 已验证: ${verifiedNodes.length} | ⚪ 探索中: ${exploringNodes.length} | 🔴 已证伪: ${deprecatedNodes.length}）  \n`;
  md += `> **根节点大目标**：${rootNode?.title || '（未设置）'}\n\n`;
  md += `---\n\n`;

  // 第一章：核心根目标
  md += `## 1. 🎯 核心根目标与命题锚点 (Root Goal)\n\n`;
  if (rootNode) {
    md += `### ${rootNode.title}\n\n`;
    md += `- **类别**：${CATEGORY_LABEL_MAP[rootNode.category] || rootNode.category}\n`;
    md += `- **认知状态**：${rootNode.status === 'verified' ? '🟢 已验证' : rootNode.status === 'deprecated' ? '🔴 已证伪' : '⚪ 探索中'}\n`;
    md += `- **核心探索问题**：${rootNode.userQuery || '（无具体提问）'}\n`;
    if (rootNode.artifact?.coreTakeaway) {
      md += `- **核心结论提炼**：${rootNode.artifact.coreTakeaway}\n`;
    }
    if (rootNode.aiResponse) {
      md += `\n**详细推演解答**：\n\n${rootNode.aiResponse}\n\n`;
    }
  } else {
    md += `*（图谱中暂无根节点）*\n\n`;
  }

  md += `---\n\n`;

  // 第二章：技术推演脉络全景
  md += `## 2. 🧭 技术推演脉络全景 (Deduction Trajectories)\n\n`;
  const nonRootNodes = nodes.filter((n) => n.id !== graph.rootNodeId);
  if (nonRootNodes.length === 0) {
    md += `*（暂无下级推演分支）*\n\n`;
  } else {
    for (const node of nonRootNodes) {
      const parentTitles = (node.parentIds || [])
        .map((pid) => graph.nodes[pid]?.title || pid)
        .join(', ');

      const statusBadge =
        node.status === 'verified'
          ? '🟢 已验证'
          : node.status === 'deprecated'
            ? '🔴 已证伪 (DEPRECATED)'
            : '⚪ 探索中';

      md += `### [${CATEGORY_LABEL_MAP[node.category] || node.category}] ${node.title} · ${statusBadge}\n\n`;
      if (parentTitles) {
        md += `- **前置推演分支 (Parents)**：${parentTitles}\n`;
      }
      md += `- **分支追问 (Query)**：${node.userQuery}\n`;
      if (node.artifact?.coreTakeaway) {
        md += `- **阶段结论**：${node.artifact.coreTakeaway}\n`;
      }
      if (node.artifact?.hardInvariants && node.artifact.hardInvariants.length > 0) {
        md += `- **硬核约束**：${node.artifact.hardInvariants.map((c) => `\`${c}\``).join(' ')}\n`;
      }
      if (node.artifact?.codeSignatures && node.artifact.codeSignatures.length > 0) {
        md += `- **核心函数签名**：\n\`\`\`c\n${node.artifact.codeSignatures.join('\n')}\n\`\`\`\n`;
      }
      if (node.aiResponse) {
        md += `\n**推演详情**：\n\n${node.aiResponse}\n\n`;
      }
      md += `---\n\n`;
    }
  }

  // 第三章：核心知识卡精粹
  const artifactNodes = nodes.filter(
    (n) =>
      n.artifact &&
      (n.artifact.coreTakeaway ||
        (n.artifact.hardInvariants && n.artifact.hardInvariants.length > 0) ||
        (n.artifact.codeSignatures && n.artifact.codeSignatures.length > 0))
  );

  md += `## 3. 💎 核心知识卡精粹 (Knowledge Artifacts)\n\n`;
  if (artifactNodes.length === 0) {
    md += `*（暂未生成结构化知识卡）*\n\n`;
  } else {
    for (const node of artifactNodes) {
      const art = node.artifact!;
      md += `#### 📌 ${node.title} (${CATEGORY_LABEL_MAP[node.category] || node.category})\n\n`;
      if (art.coreTakeaway) {
        md += `> **核心结论**：${art.coreTakeaway}\n\n`;
      }
      if (art.hardInvariants && art.hardInvariants.length > 0) {
        md += `**边界条件与硬核不变量**：\n`;
        for (const inv of art.hardInvariants) {
          md += `- \`${inv}\`\n`;
        }
        md += `\n`;
      }
      if (art.codeSignatures && art.codeSignatures.length > 0) {
        md += `**关键代码与结构体签名**：\n\`\`\`c\n${art.codeSignatures.join('\n')}\n\`\`\`\n\n`;
      }
    }
  }

  md += `---\n\n`;

  // 第四章：反向避坑指南与已证伪方案 (Negative Constraints)
  md += `## 4. ⚠️ 反向避坑指南与已证伪方案 (Negative Constraints)\n\n`;
  if (deprecatedNodes.length === 0) {
    md += `> ✅ **当前图谱尚未产生证伪废案**。所有分支均处于探索或已验证状态。\n\n`;
  } else {
    md += `以下方案在架构推演或实测中被证明不可行，后续推演已被硬性门控绕开：\n\n`;
    for (const dep of deprecatedNodes) {
      md += `### ❌ [已证伪] ${dep.title}\n\n`;
      md += `- **假设提问**：${dep.userQuery}\n`;
      if (dep.artifact?.coreTakeaway) {
        md += `- **证伪结论与反向红线**：${dep.artifact.coreTakeaway}\n`;
      }
      if (dep.aiResponse) {
        md += `\n**证伪分析记录**：\n\n${dep.aiResponse}\n\n`;
      }
    }
  }

  md += `---\n\n`;

  // 第五章：权威参考切片档案
  const nodesWithChunks = nodes.filter(
    (n) => n.mountedChunks && n.mountedChunks.length > 0
  );
  if (nodesWithChunks.length > 0) {
    md += `## 5. 📚 挂载权威资料切片 (Authoritative Reference Chunks)\n\n`;
    for (const node of nodesWithChunks) {
      md += `### 节点「${node.title}」挂载切片：\n\n`;
      for (const chunk of node.mountedChunks!) {
        md += `#### 📄 ${chunk.sourceTitle} (\`${chunk.tokens} tokens\`)\n`;
        md += `\`\`\`markdown\n${chunk.content}\n\`\`\`\n\n`;
      }
    }
  }

  return md;
}

/**
 * 4. 导出为完整 JSON 工程档案
 */
export function exportToJSON(graph: CanvasGraph): string {
  return JSON.stringify(graph, null, 2);
}
