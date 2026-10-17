// tests/contextCompiler.test.ts
import { describe, it, expect } from 'vitest';
import { compileContext } from '../src/worker/contextCompiler';
import type { CanvasGraph, CanvasNodeData } from '../src/types/canvas';
import { INITIAL_DEMO_GRAPH } from '../src/data/demoGraph';
import { extractArtifactFromContent } from '../src/services/artifactExtractor';

describe('ContextCompilerTS & Acceptance Criteria Tests', () => {
  it('TC-01: 主干目标防稀释验证 (Root goal stays stably locked in <root_goal>)', () => {
    // 模拟沿某一分支连续追问 10 轮
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
    let lastParentId = 'node_root';

    for (let i = 1; i <= 10; i++) {
      const childId = `node_step_${i}`;
      graph.nodes[childId] = {
        id: childId,
        title: `局部细节追问 ${i}`,
        parentIds: [lastParentId],
        userQuery: `关于字节对齐和局部序列化细节问题 ${i}`,
        aiResponse: `局部细节解答 ${i}`,
        category: 'concept_qa',
        manualState: 'auto',
        status: 'verified',
        fullTokens: 50,
        artifactTokens: 25,
      };
      lastParentId = childId;
    }

    // 在第 11 轮提问主干服务治理问题
    const res = compileContext({
      graph,
      activeNodeId: lastParentId,
      currentQuery: '如何在多机集群中协调主干服务治理与注册发现？',
      tokenBudget: 2000,
    });

    // 预期：根节点目标被稳定锁定在 <root_goal> 容器内
    expect(res.compiledPrompt).toContain('<root_goal id="node_root"');
    expect(res.compiledPrompt).toContain('<takeaway>理解 Linux 虚拟内存管理与缺页中断的完整链路</takeaway>');
    expect(res.executionDurationMs).toBeLessThan(5); // 耗时硬约束 <5ms
  });

  it('TC-03: 草稿态隔离与证伪避坑 (Negative constraints & exploring isolation)', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));

    // 分支 A: node_deprecated_flat 已标记为 deprecated
    // 分支 B: node_branch_exploring 处于 exploring 且不是 node_page_fault 的祖先
    // 切换至主干分支分支 C: node_page_fault 提问
    const res = compileContext({
      graph,
      activeNodeId: 'node_page_fault',
      currentQuery: '如何优化当前虚拟内存寻址性能？',
    });

    // 1. 分支 B (node_branch_exploring) 作为旁系未验证草稿，必须彻底隔离丢弃
    expect(res.compiledPrompt).not.toContain('node_branch_exploring');
    expect(res.compiledPrompt).not.toContain('用户态软件模拟页表的探索');

    // 2. 分支 A (node_deprecated_flat) 必须以 <negative_constraints> 形式注入
    expect(res.compiledPrompt).toContain('<negative_constraints>');
    expect(res.compiledPrompt).toContain('<deprecated_path id="node_deprecated_flat">');
    expect(res.compiledPrompt).toContain('【已证伪废案】');
  });

  it('TC-04: 外部挂载资料绝对服从 (Mounted chunk injected as Tier 1)', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));

    const res = compileContext({
      graph,
      activeNodeId: 'node_page_fault',
      currentQuery: '缺页中断是如何处理私有协议与页表锁的？',
    });

    expect(res.compiledPrompt).toContain('<tier1_authoritative_sources>');
    expect(res.compiledPrompt).toContain('doc_linux_kernel_mm');
    expect(res.compiledPrompt).toContain('linux_kernel_mm.md');
    expect(res.compiledPrompt).toContain('必须保证对齐 4KB 边界并保持页表自旋锁原子性');
  });

  it('TC-06: 多父节点汇聚融合 (Multi-parent DAG convergence)', () => {
    const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));

    // node_page_fault 的 parentIds 为 ['node_pinned_spec', 'node_tlb']
    const res = compileContext({
      graph,
      activeNodeId: 'node_page_fault',
      currentQuery: '两者结合的实现方案',
    });

    // 预期：同时正确囊括两个父节点分支
    expect(res.compiledPrompt).toContain('node_pinned_spec');
    expect(res.compiledPrompt).toContain('node_tlb');
  });

  it('Benchmark: 包含 200 个复杂节点的图谱在 Web Worker / 核心算法中编译耗时必须 <5ms', () => {
    const largeGraph: CanvasGraph = {
      graphId: 'benchmark_graph',
      title: '200 Nodes Benchmark Graph',
      rootNodeId: 'node_0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: {},
    };

    // 构建包含 200 个节点的 DAG 图谱
    for (let i = 0; i < 200; i++) {
      const parentIds = i === 0 ? [] : [`node_${Math.floor(i / 2)}`];
      largeGraph.nodes[`node_${i}`] = {
        id: `node_${i}`,
        title: `Node ${i}`,
        parentIds,
        userQuery: `Query for node ${i}`,
        aiResponse: `Detailed response text for node ${i} describing virtual memory and algorithms.`,
        category: i === 0 ? 'root_goal' : 'concept_qa',
        manualState: i === 5 ? 'pinned' : 'auto',
        status: i % 15 === 0 ? 'deprecated' : i % 2 === 0 ? 'verified' : 'exploring',
        fullTokens: 60,
        artifactTokens: 30,
        artifact: {
          title: `Art ${i}`,
          category: 'concept_qa',
          coreTakeaway: `Core takeaway for node ${i}`,
          hardInvariants: [`INVARIANT_${i}`],
          codeSignatures: [`void execute_${i}();`],
        },
      };
    }

    const t0 = performance.now();
    const result = compileContext({
      graph: largeGraph,
      activeNodeId: 'node_199',
      currentQuery: 'Benchmark execution speed',
      tokenBudget: 3000,
    });
    const t1 = performance.now();
    const duration = t1 - t0;

    console.log(`[Benchmark] 200 Nodes Compilation Duration: ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(5);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('Artifact Extractor: 结构化无损知识卡保留函数签名与硬核不变量', () => {
    const content = `### 缺页异常处理机制
由内核入口函数 do_page_fault 处理：
\`\`\`c
unsigned long do_page_fault(struct pt_regs *regs, unsigned long error_code, unsigned long address);
\`\`\`
核心结论：通过按需延时分配与四级页表映射，极大节省了系统物理内存。
不变量要求：必须保证 4KB 边界对齐，遵循 PGD -> P4D -> PUD -> PMD -> PTE 拓扑。`;

    const art = extractArtifactFromContent({
      category: 'code_impl',
      userQuery: '缺页异常机制',
      aiResponse: content,
    });

    expect(art.category).toBe('code_impl');
    expect(art.coreTakeaway.length).toBeLessThanOrEqual(50);
    expect(art.hardInvariants.length).toBeGreaterThan(0);
    expect(art.codeSignatures.some((sig) => sig.includes('do_page_fault'))).toBe(true);
  });
});
