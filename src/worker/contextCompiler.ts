// worker/contextCompiler.ts
import type {
  CanvasNodeData,
  CompilationResult,
  CompileOptions,
  CompiledItem,
  NodeCategory,
  RenderGranularity,
} from '../types/canvas';

import { estimateTokens } from '../services/tokenEstimator';

const DEFAULT_CATEGORY_WEIGHTS: Record<NodeCategory, number> = {
  root_goal: 3.0,
  core_conclusion: 2.0,
  code_impl: 1.5,
  concept_qa: 1.0,
  chitchat_debug: 0.3,
};

/**
 * 拓扑图编译核心引擎
 * 可在主线程或 Web Worker 中无差别极速运行（耗时 <1ms）
 */
export function compileContext(options: CompileOptions): CompilationResult {
  const startTime = performance.now();
  const {
    graph,
    activeNodeId,
    currentQuery,
    tokenBudget = 3000,
  } = options;

  const nodes = graph.nodes || {};
  const activeNode = nodes[activeNodeId];

  // 1. DAG 多源祖先 Hop 距离计算（支持多父节点汇聚）
  const hopDistances: Map<string, number> = new Map();
  const queue: Array<{ id: string; hop: number }> = [];

  if (activeNode) {
    hopDistances.set(activeNodeId, 0);
    // 从当前节点的 parentIds 开始遍历
    for (const pid of activeNode.parentIds || []) {
      if (nodes[pid]) {
        queue.push({ id: pid, hop: 1 });
        hopDistances.set(pid, 1);
      }
    }

    while (queue.length > 0) {
      const { id, hop } = queue.shift()!;
      const curr = nodes[id];
      if (!curr) continue;

      for (const pid of curr.parentIds || []) {
        if (!nodes[pid]) continue;
        const prevHop = hopDistances.get(pid);
        if (prevHop === undefined || hop + 1 < prevHop) {
          hopDistances.set(pid, hop + 1);
          queue.push({ id: pid, hop: hop + 1 });
        }
      }
    }
  }

  // 2. 状态门控与分类收集
  const tier1Items: Array<{ node: CanvasNodeData; reason: string }> = [];
  const tier2Candidates: Array<{ node: CanvasNodeData; hop: number; score: number }> = [];
  const negativeItems: CanvasNodeData[] = [];
  let rootGoalNode: CanvasNodeData | null = null;
  const xrayStatus: Record<string, RenderGranularity> = {};

  for (const node of Object.values(nodes)) {
    // 忽略手动忽略的节点
    if (node.manualState === 'ignored') {
      xrayStatus[node.id] = 'dropped';
      continue;
    }

    // 识别 Root Goal 节点
    if (node.id === graph.rootNodeId || node.category === 'root_goal') {
      if (!rootGoalNode || node.id === graph.rootNodeId) {
        rootGoalNode = node;
      }
    }

    // 反向红线：已证伪/废弃节点
    if (node.status === 'deprecated') {
      negativeItems.push(node);
      xrayStatus[node.id] = 'negative_warn';
      continue;
    }

    // Tier 1 绝对权威：手动 Pin 或包含外部挂载切片
    if (node.manualState === 'pinned' || (node.mountedChunks && node.mountedChunks.length > 0)) {
      tier1Items.push({ node, reason: node.manualState === 'pinned' ? 'pinned' : 'mounted_chunk' });
      xrayStatus[node.id] = 'full';
      continue;
    }

    // 草稿态隔离：非祖先且处于 exploring 状态的分支节点，彻底隔离丢弃
    const hop = hopDistances.get(node.id);
    const isAncestor = hop !== undefined;

    if (!isAncestor && node.status === 'exploring') {
      xrayStatus[node.id] = 'dropped';
      continue;
    }

    // 可入选 Tier 2 的候选节点（包括祖先节点以及全局已验证 VERIFIED 节点）
    if (isAncestor || node.status === 'verified') {
      const effectiveHop = hop ?? 4; // 非祖先的已验证节点设定较远 hop
      const hopWeight = 1.0 / (1.0 + effectiveHop * 0.6);
      const catWeight = DEFAULT_CATEGORY_WEIGHTS[node.category] || 1.0;
      const verifiedBonus = node.status === 'verified' ? 1.5 : 1.0;
      const score = (hopWeight * 2.0 + catWeight) * verifiedBonus;

      tier2Candidates.push({ node, hop: effectiveHop, score });
    } else {
      xrayStatus[node.id] = 'dropped';
    }
  }

  // 3. 对 Tier 2 候选节点排序（得分由高到低，Hop 优先）
  tier2Candidates.sort((a, b) => {
    if (a.hop !== b.hop) return a.hop - b.hop;
    return b.score - a.score;
  });

  // 4. Token 预算装箱（Knapsack Allocation）
  let usedTokens = 0;
  const compiledItems: CompiledItem[] = [];

  // Root Goal 占用固定预算
  if (rootGoalNode) {
    const rootTokens = rootGoalNode.artifactTokens || estimateTokens(rootGoalNode.artifact?.coreTakeaway || rootGoalNode.title);
    usedTokens += rootTokens;
    compiledItems.push({
      nodeId: rootGoalNode.id,
      score: 10,
      hopDistance: hopDistances.get(rootGoalNode.id) ?? null,
      granularity: 'artifact',
      allocatedTokens: rootTokens,
    });
    xrayStatus[rootGoalNode.id] = 'artifact';
  }

  // Tier 1 权威节点先行装入
  for (const item of tier1Items) {
    const node = item.node;
    const tokens = node.fullTokens || estimateTokens(node.aiResponse || node.userQuery);
    usedTokens += tokens;
    compiledItems.push({
      nodeId: node.id,
      score: 9.9,
      hopDistance: hopDistances.get(node.id) ?? null,
      granularity: 'full',
      allocatedTokens: tokens,
    });
    xrayStatus[node.id] = 'full';
  }

  // Tier 2 阶梯降级装配
  const tier2Selected: Array<{ node: CanvasNodeData; granularity: 'full' | 'artifact'; hop: number; score: number }> = [];

  for (const cand of tier2Candidates) {
    const { node, hop, score } = cand;
    const fullTokens = node.fullTokens || estimateTokens(node.aiResponse || node.userQuery);
    const artifactTokens = node.artifactTokens || estimateTokens(
      `${node.artifact?.coreTakeaway || ''} ${(node.artifact?.hardInvariants || []).join(' ')} ${(node.artifact?.codeSignatures || []).join(' ')}`
    ) || 80;

    // 最近祖先 (hop <= 1) 且预算充裕时采用 full，其余优先降级为 artifact
    if (hop <= 1 && usedTokens + fullTokens <= tokenBudget) {
      usedTokens += fullTokens;
      tier2Selected.push({ node, granularity: 'full', hop, score });
      compiledItems.push({
        nodeId: node.id,
        score,
        hopDistance: hop,
        granularity: 'full',
        allocatedTokens: fullTokens,
      });
      xrayStatus[node.id] = 'full';
    } else if (usedTokens + artifactTokens <= tokenBudget) {
      usedTokens += artifactTokens;
      tier2Selected.push({ node, granularity: 'artifact', hop, score });
      compiledItems.push({
        nodeId: node.id,
        score,
        hopDistance: hop,
        granularity: 'artifact',
        allocatedTokens: artifactTokens,
      });
      xrayStatus[node.id] = 'artifact';
    } else {
      xrayStatus[node.id] = 'dropped';
    }
  }

  // 5. 按照 Epistemic Hierarchy Prompt Spec 生成标准化 XML 案卷
  const promptXml = buildPromptXml({
    rootGoalNode,
    tier1Items,
    tier2Selected,
    negativeItems,
    currentQuery,
  });

  const durationMs = performance.now() - startTime;

  return {
    compiledPrompt: promptXml,
    items: compiledItems,
    totalAllocatedTokens: usedTokens,
    executionDurationMs: Number(durationMs.toFixed(3)),
    xrayNodeStatus: xrayStatus,
  };
}

/**
 * 拼装符合规范的 Epistemic Hierarchy XML 提示词
 */
function buildPromptXml(params: {
  rootGoalNode: CanvasNodeData | null;
  tier1Items: Array<{ node: CanvasNodeData; reason: string }>;
  tier2Selected: Array<{ node: CanvasNodeData; granularity: 'full' | 'artifact'; hop: number }>;
  negativeItems: CanvasNodeData[];
  currentQuery: string;
}): string {
  const { rootGoalNode, tier1Items, tier2Selected, negativeItems, currentQuery } = params;

  let xml = `<system_instructions>
你是一个部署在思维导图画布环境下的高可靠 AI 深度学习导师。
你必须严格遵守以下【认知证据阶梯（Epistemic Hierarchy）】回答用户的 <current_query>：
1. [Tier 1 - 绝对权威]：<tier1_authoritative_sources> 中的内容具有最高解释权。若与你的预训练常识冲突，必须无条件以 Tier 1 为准。引用处必须严格标注 \`[Ref: 节点ID]\`。
2. [Tier 2 - 脉络共识]：<tier2_canvas_context> 记录了历史推演脉络、已确认的硬核约束与代码签名。严禁产生与前置约束自相矛盾的推导。
3. [反向红线]：绝对禁止使用 <negative_constraints> 中标记为已证伪/失败的技术方案。
4. [Tier 3 - 扩展推演]：当且仅当参考资料未提及且逻辑必须时，方可使用自身知识储备进行延伸，且必须在对应段落开头显式标记 \`💡 [扩展推演]\`。
</system_instructions>

<canvas_workspace>`;

  // 1. Root Goal
  if (rootGoalNode) {
    const takeaway = rootGoalNode.artifact?.coreTakeaway || rootGoalNode.title || '全局探索主干目标';
    xml += `\n  <root_goal id="${escapeXml(rootGoalNode.id)}" title="${escapeXml(rootGoalNode.title)}">
    <takeaway>${escapeXml(takeaway)}</takeaway>
  </root_goal>`;
  }

  // 2. Tier 1 Authoritative Sources
  xml += `\n  <tier1_authoritative_sources>`;
  for (const item of tier1Items) {
    const node = item.node;
    if (node.manualState === 'pinned') {
      xml += `\n    <pinned_node id="${escapeXml(node.id)}">
      <query>${escapeXml(node.userQuery)}</query>
      <content>${escapeXml(node.aiResponse)}</content>
    </pinned_node>`;
    }
    if (node.mountedChunks && node.mountedChunks.length > 0) {
      for (const chunk of node.mountedChunks) {
        xml += `\n    <doc_chunk id="${escapeXml(chunk.chunkId)}" source="${escapeXml(chunk.sourceTitle)}">
      ${escapeXml(chunk.content)}
    </doc_chunk>`;
      }
    }
  }
  xml += `\n  </tier1_authoritative_sources>`;

  // 3. Tier 2 Canvas Context
  xml += `\n  <tier2_canvas_context>`;
  for (const item of tier2Selected) {
    const { node, granularity, hop } = item;
    if (granularity === 'artifact' && node.artifact) {
      const art = node.artifact;
      xml += `\n    <knowledge_card id="${escapeXml(node.id)}" relation="ancestor_hop_${hop}" category="${escapeXml(art.category)}">
      <takeaway>${escapeXml(art.coreTakeaway)}</takeaway>
      ${art.hardInvariants.length > 0 ? `<invariants>${escapeXml(art.hardInvariants.join(' | '))}</invariants>` : ''}
      ${art.codeSignatures.length > 0 ? `<signatures>${escapeXml(art.codeSignatures.join(' | '))}</signatures>` : ''}
    </knowledge_card>`;
    } else {
      xml += `\n    <full_node id="${escapeXml(node.id)}" relation="ancestor_hop_${hop}" hop="${hop}">
      <query>${escapeXml(node.userQuery)}</query>
      <response>${escapeXml(node.aiResponse)}</response>
    </full_node>`;
    }
  }
  xml += `\n  </tier2_canvas_context>`;

  // 4. Negative Constraints
  xml += `\n  <negative_constraints>`;
  for (const neg of negativeItems) {
    const takeaway = neg.artifact?.coreTakeaway || neg.aiResponse || neg.userQuery;
    xml += `\n    <deprecated_path id="${escapeXml(neg.id)}">【已证伪废案】${escapeXml(takeaway)}</deprecated_path>`;
  }
  xml += `\n  </negative_constraints>`;

  xml += `\n</canvas_workspace>

<current_query>
${escapeXml(currentQuery || '')}
</current_query>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
