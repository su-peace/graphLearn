# 系统与交互设计规范 (Design Specifications)

> **视觉与多端交互详细令牌**：关于配色变量（Light/Dark）、光学毛玻璃材质（`.glass`）、字体排印及响应式断点的完整定义，请同步参阅 [md/DESIGN.md](./DESIGN.md)。

## 1. 认知证据阶梯协议 (Epistemic Hierarchy Prompt Spec)

系统彻底废弃伪造的多轮聊天流，通过 `ContextCompilerTS` 生成单轮文档化案卷，在 User 提示词中分层组装：

```xml
<system_instructions>
你是一个部署在思维导图画布环境下的高可靠 AI 深度学习导师。
你必须严格遵守以下【认知证据阶梯（Epistemic Hierarchy）】回答用户的 <current_query>：
1. [Tier 1 - 绝对权威]：<tier1_authoritative_sources> 中的内容具有最高解释权。若与你的预训练常识冲突，必须无条件以 Tier 1 为准。引用处必须严格标注 `[Ref: 节点ID]`。
2. [Tier 2 - 脉络共识]：<tier2_canvas_context> 记录了历史推演脉络、已确认的硬核约束与代码签名。严禁产生与前置约束自相矛盾的推导。
3. [反向红线]：绝对禁止使用 <negative_constraints> 中标记为已证伪/失败的技术方案。
4. [Tier 3 - 扩展推演]：当且仅当参考资料未提及且逻辑必须时，方可使用自身知识储备进行延伸，且必须在对应段落开头显式标记 `💡 [扩展推演]`。
</system_instructions>

<canvas_workspace>
  <root_goal id="node_root" title="主干全局目标">
    <takeaway>理解 Linux 虚拟内存管理与缺页中断的完整链路</takeaway>
  </root_goal>
  
  <tier1_authoritative_sources>
    <pinned_node id="node_pinned">
      <query>系统采用的数据结构是什么？</query>
      <content>必须采用四级页表（PGD -> P4D -> PUD -> PMD -> PTE）。</content>
    </pinned_node>
    <doc_chunk id="doc_1_chunk_0" source="linux_kernel_mm.md">
      Page Fault 异常由 do_page_fault() 处理，区分匿名页与文件映射页...
    </doc_chunk>
  </tier1_authoritative_sources>

  <tier2_canvas_context>
    <knowledge_card id="node_2" relation="ancestor_hop_2" category="concept_qa">
      <takeaway>TLB 是 CPU 内部的页表缓存，命中则直接完成物理寻址。</takeaway>
      <invariants>未命中惩罚: 触发硬件 Page Table Walk</invariants>
      <signatures>pte_t *lookup_address(unsigned long address, unsigned int *level);</signatures>
    </knowledge_card>
    <full_node id="node_3" relation="ancestor_hop_1" hop="1">
      <query>多级页表是如何节省内存的？</query>
      <response>通过按需分配非连续二级页表，未映射的虚存范围无需分配子页表实体...</response>
    </full_node>
  </tier2_canvas_context>

  <negative_constraints>
    <deprecated_path id="node_4">【已证伪废案】试图用单一大数组存储进程所有页表项 -> 内存开销高达数GB，不可行。</deprecated_path>
  </negative_constraints>
</canvas_workspace>

<current_query>
[用户当前输入的具体问题]
</current_query>
```

---

## 2. 界面与交互行为规范 (GUI Interactions)

### 2.1 双模态视图设计
* **画布微缩胶囊（宏观态 `CapsuleNode`）：**
  * 尺寸规格：固定宽 `240px`，高 `76px`（或 `80px`），圆角 `12px`，光学磨砂材质。
  * 状态指示（几何微图标 + 边框线型 + 色彩锚点三重冗余）：
    * ⚪ `EXPLORING`：中空虚线圆环 + 柔和边框（`--line-default`）
    * 🟢 `VERIFIED`：实心绿点带微勾 + 深森绿实线边框（`--status-verified`）
    * 🔴 `DEPRECATED`：斜杠圆环 + 赤陶红虚线边框（`--status-deprecated`）与标题删除线
  * 内容信息：顶部展示分类微色条、分类 Tag 与单行标题，正文展示 2 行截断的 50 字核心结论，悬停浮现快捷连线按钮与左右连接锚点（Handle）。
* **侧边阅读抽屉（微观态 `ReadingDrawer`）：**
  * 点击任意卡片，右侧以动画滑出宽度为 `42vw`（最小 `480px`）的光学毛玻璃阅读抽屉。
  * 展示分段式状态切换器、可原地编辑标题、折叠式「核心结论卡（KnowledgeArtifact）」、「拓扑关联」管理专栏、去气泡化 Markdown 正文（代码语法高亮、一键复制）以及底部悬浮追问输入舱。

### 2.2 核心操作链路 (Interaction Flows)

```
[阅读侧边栏] ──(鼠标划选关键词)──> [浮动气泡菜单] ──(点击追问)──> [画布自动拉线建子节点]
```

1. **划词即分支（Highlight-to-Branch）：**
   * 用户在阅读抽屉中划选文本，选区上方弹出光学毛玻璃气泡菜单：`[🌱 追问此概念]`、`[💡 举例]`、`[✏️ 自定义提问]`。
   * 点击后，系统自动以当前节点为父节点在画布右侧创建新节点，自动连线，Prompt 自动填充并直接开始流式回答。
2. **自主建立与管理节点拓扑连线（User-Defined Connections & Merge）：**
   * **画布拖拽连线**：用户可将节点 A 的右侧输出锚点拖拽至节点 B 的左侧输入锚点；连接过程中由 `graphTopology.ts` 实时执行 `wouldCreateCycle` 防环检测，自动拦截自环、重复连接与多跳闭环。
   * **交互式边与一键断开（`InteractiveMindMapEdge`）**：鼠标悬停或选中连线时，连线中点浮现 `×` 微胶囊按钮，点击或按键盘 `Delete` 即可安全解绑父子依赖。
   * **全局拓扑连线弹窗（`ConnectNodesModal`）**：通过顶部工具栏、节点快捷按钮或抽屉内「添加关联」唤起，支持跨视口搜索起点/终点、一键调换方向及实时合法性反馈。
   * **多父节点汇聚**：单个节点连接多个父节点后，上下文编译器自动沿所有父级分支并行向上 BFS 溯源，将多条分支共识合并注入 `<tier2_canvas_context>`。
3. **溯源联动与平滑对焦（Citation Navigation）：**
   * AI 回复中出现的 `[Ref: node_x]` 自动渲染为交互胶囊徽章（`CitationPill`）。
   * 点击徽章，画布通过 React Flow 的 `setCenter()` 执行 600ms 平滑动画将对应卡片居中，目标卡片触发 2 秒脉冲高亮特效。

### 2.3 上下文 X-Ray 实时预览视觉语言
当用户的光标聚焦在底部输入框或手动开启 X-Ray 透视时，画布自动进入 X-Ray 预览态：
* **实线流光（Solid Glow）：** 综合得分极高、以 `FULL` 原文注入的节点及连线（`--accent-xray` 动态流光）。
* **虚线弱光（Dashed Muted）：** 降级为 `ARTIFACT`（无损知识卡）注入的祖先节点。
* **半透明衰减（Opacity ~18%-25%）：** 旁系未入选或手动忽略的节点，视觉虚化，直观呈现“上下文隔离状态”。

### 2.4 全局键盘热键规范
* `Esc`：优先关闭顶层模态框，无模态框时关闭右侧阅读抽屉并取消 X-Ray 预览。
* `Delete` / `Backspace`（非输入态）：若选中节点（非根节点），唤起智能删除弹窗（接续 / 级联 / 孤立）；若选中连线，直接断开该拓扑连线。
* `Ctrl + L` / `Cmd + L`：一键触发 `@dagrejs/dagre` 自动分层排版并平滑适应视口。
* `Ctrl + Shift + X`：切换全局 X-Ray 链路光线追踪透视态。
