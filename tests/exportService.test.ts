// tests/exportService.test.ts
import { describe, it, expect } from 'vitest';
import { exportToMermaid, exportToOPML, exportToMarkdown, exportToJSON } from '../src/services/exportService';
import { INITIAL_DEMO_GRAPH, RPC_DEMO_GRAPH, createBlankGraph } from '../src/data/demoGraph';
import type { CanvasGraph } from '../src/types/canvas';

describe('ExportService Unit & Acceptance Tests', () => {
  describe('exportToMermaid', () => {
    it('空图谱应输出防空的 Mermaid flowchart TD', () => {
      const emptyGraph: CanvasGraph = {
        graphId: 'graph_empty',
        title: '空图谱',
        rootNodeId: 'node_root',
        nodes: {},
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const result = exportToMermaid(emptyGraph);
      expect(result).toContain('flowchart TD');
      expect(result).toContain('(画布暂无节点)');
    });

    it('TC-Export-Mermaid: 包含正确的主题、节点标识、verified/deprecated 样式类及父子边关系', () => {
      const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
      const mermaidCode = exportToMermaid(graph);

      // 1. 包含标准 Mermaid 头部
      expect(mermaidCode).toContain('flowchart TD');
      expect(mermaidCode).toContain(graph.title);

      // 2. 包含认知状态样式类定义 (符合 DESIGN.md)
      expect(mermaidCode).toContain('classDef rootNode');
      expect(mermaidCode).toContain('classDef verifiedNode');
      expect(mermaidCode).toContain('classDef deprecatedNode');
      expect(mermaidCode).toContain('classDef exploringNode');

      // 3. 根节点使用特殊舱形 (["🎯 ..."])
      expect(mermaidCode).toContain('node_root(["🎯');
      expect(mermaidCode).toContain('class node_root rootNode');

      // 4. 已证伪节点标记为删除线与 deprecatedNode 类
      expect(mermaidCode).toContain('node_deprecated_flat["~~[已证伪]');
      expect(mermaidCode).toContain('class node_deprecated_flat deprecatedNode');

      // 5. 已验证节点样式类
      expect(mermaidCode).toContain('class node_pinned_spec verifiedNode');

      // 6. 拓扑父子边关系
      // 在 INITIAL_DEMO_GRAPH 中，node_root 是 node_deprecated_flat 和 node_pinned_spec 的父节点
      expect(mermaidCode).toContain('node_root --> node_deprecated_flat');
      expect(mermaidCode).toContain('node_root --> node_pinned_spec');

      // node_page_fault 有多个父节点: node_pinned_spec 和 node_tlb
      expect(mermaidCode).toContain('node_pinned_spec --> node_page_fault');
      expect(mermaidCode).toContain('node_tlb --> node_page_fault');
    });

    it('清洗特殊字符与括号，避免 Mermaid 语法解析损坏', () => {
      const graph: CanvasGraph = createBlankGraph('Special [Characters] (Test)', 'Query with "quotes" & {braces}');
      const mermaidCode = exportToMermaid(graph);
      expect(mermaidCode).not.toContain('["🎯 Special [Characters]');
      expect(mermaidCode).toContain('flowchart TD');
    });
  });

  describe('exportToOPML', () => {
    it('TC-Export-OPML: 验证输出符合规范的 OPML 2.0 XML 结构与元数据', () => {
      const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
      const opml = exportToOPML(graph);

      // 1. 标准 OPML 2.0 XML 声明与根标签
      expect(opml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(opml).toContain('<opml version="2.0">');
      expect(opml).toContain('</opml>');

      // 2. Head 元数据 (title, ownerName, dates)
      expect(opml).toContain('<head>');
      expect(opml).toContain(`<title>${graph.title}</title>`);
      expect(opml).toContain('<ownerName>GraphLearn</ownerName>');
      expect(opml).toContain('<dateCreated>');

      // 3. Body 与 outline 节点
      expect(opml).toContain('<body>');
      expect(opml).toContain('</body>');
      expect(opml).toContain('<outline text="');
    });

    it('验证递归树形层级结构与 _note 扩展属性', () => {
      const graph: CanvasGraph = JSON.parse(JSON.stringify(RPC_DEMO_GRAPH));
      const opml = exportToOPML(graph);

      // 根节点应该位于顶层 outline
      expect(opml).toContain('<title>设计高并发分布式 RPC 框架</title>');
      expect(opml).toContain('🎯 RPC 架构总纲');

      // 子节点嵌套并且带有 _note 与 _status
      expect(opml).toContain('_status="verified"');
      expect(opml).toContain('_category=');
      expect(opml).toContain('【提问】:');
      expect(opml).toContain('【核心结论】:');

      // 闭合标签数量平衡
      const openOutlineCount = (opml.match(/<outline\b/g) || []).length;
      const selfClosingCount = (opml.match(/\/>/g) || []).length;
      const closeOutlineCount = (opml.match(/<\/outline>/g) || []).length;
      expect(openOutlineCount).toBe(selfClosingCount + closeOutlineCount);
    });

    it('包含独立孤立分支的处理 (Orphan nodes)', () => {
      const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
      // 添加一个脱离根节点的孤立节点
      graph.nodes['orphan_node'] = {
        id: 'orphan_node',
        title: '独立分支推演',
        parentIds: [],
        userQuery: '孤立探索',
        aiResponse: '孤立回答',
        category: 'concept_qa',
        manualState: 'auto',
        status: 'exploring',
        fullTokens: 10,
        artifactTokens: 5,
        position: { x: 0, y: 0 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const opml = exportToOPML(graph);
      expect(opml).toContain('独立分支与拓展推演');
      expect(opml).toContain('独立分支推演');
    });
  });

  describe('exportToMarkdown', () => {
    it('TC-Export-Markdown: 验证包含完整根目标、分支推演、知识卡核心结论与反向避坑列表', () => {
      const graph: CanvasGraph = JSON.parse(JSON.stringify(INITIAL_DEMO_GRAPH));
      const md = exportToMarkdown(graph);

      // 1. 标题与元数据横幅
      expect(md).toContain(`# ${graph.title} · 认知推演与系统架构复盘报告`);
      expect(md).toContain(`> **图谱 ID**：\`${graph.graphId}\``);
      expect(md).toContain('> **节点统计**：');

      // 2. 第一章：核心根目标 (Root Goal)
      expect(md).toContain('## 1. 🎯 核心根目标与命题锚点 (Root Goal)');
      expect(md).toContain(graph.nodes[graph.rootNodeId].title);
      expect(md).toContain('理解 Linux 虚拟内存管理与缺页中断的完整链路');

      // 3. 第二章：技术推演脉络全景 (Deduction Trajectories)
      expect(md).toContain('## 2. 🧭 技术推演脉络全景 (Deduction Trajectories)');
      expect(md).toContain('前置推演分支 (Parents)');
      expect(md).toContain('分支追问 (Query)');

      // 4. 第三章：核心知识卡精粹 (Knowledge Artifacts)
      expect(md).toContain('## 3. 💎 核心知识卡精粹 (Knowledge Artifacts)');
      expect(md).toContain('核心结论');
      expect(md).toContain('边界条件与硬核不变量');

      // 5. 第四章：反向避坑指南与已证伪方案 (Negative Constraints)
      expect(md).toContain('## 4. ⚠️ 反向避坑指南与已证伪方案 (Negative Constraints)');
      // node_deprecated_flat 应该在此章节
      expect(md).toContain('[已证伪]');
      expect(md).toContain('证伪结论与反向红线');

      // 6. 第五章：挂载权威资料切片 (Authoritative Reference Chunks)
      expect(md).toContain('## 5. 📚 挂载权威资料切片 (Authoritative Reference Chunks)');
      expect(md).toContain('linux_kernel_mm.md');
    });

    it('空/无证伪节点的图谱应当友好展示占位信息', () => {
      const blank = createBlankGraph('空白探索', '提问测试');
      const md = exportToMarkdown(blank);
      expect(md).toContain('当前图谱尚未产生证伪废案');
      expect(md).toContain('暂无下级推演分支');
    });
  });

  describe('exportToJSON', () => {
    it('导出合法的 JSON 且能被精准反序列化', () => {
      const graph = INITIAL_DEMO_GRAPH;
      const jsonStr = exportToJSON(graph);
      const parsed = JSON.parse(jsonStr) as CanvasGraph;

      expect(parsed.graphId).toBe(graph.graphId);
      expect(parsed.title).toBe(graph.title);
      expect(Object.keys(parsed.nodes).length).toBe(Object.keys(graph.nodes).length);
    });
  });
});
