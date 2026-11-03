# 系统功能与质量验收标准 (Acceptance Criteria)

## 1. 核心功能验收测试用例 (Functional Acceptance)

| 用例 ID | 测试场景 | 操作步骤 | 预期判定标准 | 对应自动化测试文件 |
| :---: | :--- | :--- | :--- | :--- |
| **TC-01** | **主干目标防稀释验证** | 1. 根节点创建主题“设计高并发 RPC 框架”；<br>2. 沿某一分支连续追问 10 轮局部字节对齐和序列化细节；<br>3. 在第 11 轮提问一个主干服务治理问题。 | 导出的 Prompt 中，根节点目标被稳定锁定在 `<root_goal>` 容器内；第 11 轮输出紧密围绕框架整体服务治理，未受前 10 轮字节对齐细节干扰。 | `tests/contextCompiler.test.ts` |
| **TC-02** | **划词即分支零阻力交互** | 1. 打开节点侧边阅读抽屉；<br>2. 鼠标划选正文中的“内存屏障”；<br>3. 点击弹出菜单的 `[🌱 追问此概念]`。 | 画布在父节点右侧自动新建子节点并建立连线；新节点标题自动填充为“内存屏障”，视口自动平滑跟进并开始流式输出。 | UI 交互集成 (`FloatingBubbleMenu.tsx`) |
| **TC-03** | **草稿态隔离与证伪避坑** | 1. 分支 A 进行错误思路探讨，手动标记为 🔴 `DEPRECATED`；<br>2. 分支 B 进行未验证探索，保持 ⚪ `EXPLORING`；<br>3. 切至主干分支 C 进行提问。 | 分支 B 完全不得被语义召回；分支 A 自动以 `<negative_constraints>` 注入，模型在回答中显式指出“避免采用历史证伪的 A 方案”。 | `tests/contextCompiler.test.ts` |
| **TC-04** | **外部挂载资料绝对服从** | 1. 拖入一份私有协议规范 Markdown 文件挂载至节点；<br>2. 提问与常规公开标准相悖的私有协议细节。 | 模型回答严格以挂载资料为准（Tier 1 优先级），严禁基于公开知识脑补，且回复中包含有效的 `[Ref: doc_chunk_x]` 标注。 | `tests/contextCompiler.test.ts` |
| **TC-05** | **引用角标视口精准对焦** | 1. 点击回答文本中渲染出的 `[Ref: node_2]` 徽章。 | 画布视口在 600ms 内平滑平移并缩放至 `node_2` 所在位置，`node_2` 卡片触发 2 秒蓝色呼吸灯动画。 | UI 交互集成 (`CitationPill.tsx`) |
| **TC-06** | **多父节点汇聚融合与防环** | 1. 将分支 B（协议设计）和分支 C（线程模型）连线至节点 D；<br>2. 尝试将节点 D 反向连回祖先节点；<br>3. 在节点 D 中提问两者结合的实现方案。 | 反向成环连线被实时拦截阻断；节点 D 编译的上下文正确囊括 B 与 C 两条路径的知识卡，生成的架构方案兼顾两者技术选型。 | `tests/contextCompiler.test.ts`<br>`tests/nodeConnection.test.ts` |

---

## 2. 算法与模型表现量化指标 (Quality Metrics)

1. **上下文信噪比与 Token 压缩率：**
   * 针对 20 轮以上复杂探索图谱，经 Context Compiler 编译后的 Token 消耗量相较于线性全量拼接降低 **60% 以上**。
2. **硬核不变量保留率（Invariants Retention）：**
   * 节点从 `FULL` 降级为 `ARTIFACT` 时，其涉及的关键函数签名、宏定义、边界条件在 `hardInvariants` 与 `codeSignatures` 字段中的捕获与保留率达到 **90% 以上**。
3. **幻觉率与扩展标注遵从度：**
   * 在存在挂载资料的前提下，未标注 `💡 [扩展推演]` 的陈述内容在参考源中的溯源一致性达到 **98% 以上**。

---

## 3. 本地优先与性能验收基准 (Non-Functional Acceptance)

1. **无后端独立运行能力：**
   * 纯前端构建产物部署于静态 Web 服务器（如 GitHub Pages），无需任何私有后端服务，即可通过填入 API Key、对接本地 Ollama 或使用内置高保真仿真引擎完成 100% 核心功能。
2. **端侧计算时延：**
   * 包含 200 个节点的复杂图谱在 Web Worker 中执行拓扑遍历与评分，总耗时低于 **5ms**（实测约 `0.505ms`）。
3. **数据可靠性与防丢失：**
   * 问答流式输出或拓扑连线变更过程中意外刷新或关闭浏览器标签，已输出的字符、节点拓扑及历史状态已全部落库至 IndexedDB，恢复后无脏数据（`tests/sessionManager.test.ts`、`tests/nodeDeletion.test.ts` 验证）。

---

## 4. AI 子智能体交付验收清单 (Subagent Delivery Checklist)

当主智能体调度 **Gemini 3.8 Flash** 子智能体完成功能开发或代码重构后，合入前必须核验以下清单：
- [ ] `npm test`：所有测试文件（`contextCompiler`、`nodeConnection`、`nodeDeletion`、`sessionManager`）100% 通过；
- [ ] `npm run lint`：Oxlint 静态检查 0 Error、0 Warning；
- [ ] `npm run build`：`tsc -b && vite build` 严格类型检查与生产构建成功；
- [ ] 视觉一致性：新增或修改的 UI 组件符合 [md/DESIGN.md](./DESIGN.md)「触感工坊与精密光学」规范，明暗双主题显示正常。
