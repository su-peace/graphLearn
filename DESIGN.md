# DESIGN.md — GraphLearn 前端视觉与交互设计规范

> 面向 **知识推演与思维导图画布**（React 19 + `@xyflow/react` + Tailwind v4 + Zustand）的界面设计规范[cite: 1]。
> 设计语言：**「Tactile Studio & Optical Glass · 触感工坊与精密光学」** —— 摒弃浮夸的 AI 霓虹感与廉价发光特效，以精密仪器般的克制线条、温润的纸墨对比、真实的光学毛玻璃材质，构建专注、耐看的思考空间。

---

## 1. 设计理念

| 原则 | 说明 |
|---|---|
| **去 AI 符号化** | 严禁使用蓝紫霓虹渐变、闪烁星星（✦）、大面积彩色外发光与 Emoji 图标[cite: 1]。采用高对比度单色主调 + 低饱和自然语义色，让界面回归专业生产力工具的纯粹感。 |
| **光学玻璃与微触感** | 浮层采用「多层光学毛玻璃」，通过背景模糊、饱和度补偿、1px 边缘高光折射（Inner Border）与柔和弥散阴影，在浅色与暗色模式下均呈现真实物理层次。 |
| **画布即无界桌面** | 所有 UI 控件悬浮于画布之上，零固定占位[cite: 1]；桌面端精巧克制，移动端符合单手拇指热区直觉。 |
| **几何图形表意** | 节点状态（探索 / 验证 / 证伪）通过 **几何矢量微图标 + 边框线型 + 色彩锚点** 三重冗余表达，无需阅读文字即可一眼分辨[cite: 1]。 |
| **60 FPS 丝滑底线** | 动效遵循物理弹簧曲线（Spring Physics），仅合成 `transform` 与 `opacity`[cite: 1]；大图或低端移动设备自动降级滤镜开销[cite: 1]。 |

---

## 2. 设计令牌与明暗双主题 (Design Tokens)

在 `src/index.css` 中结合 Tailwind v4 `@theme` 与 CSS 变量实现明暗无缝切换（通过 `<html class="dark">` 或 `[data-theme="dark"]` 控制）[cite: 1]：

```css
:root {
  /* === Light Mode：宣纸暖白与矿物灰 === */
  --bg-canvas:         #F6F5F2;   /* 画布底层：温润暖白，久看不刺眼 */
  --bg-dot:            rgba(24, 24, 27, 0.12); /* 网格点阵色 */
  
  /* 光学毛玻璃表面 */
  --glass-bg:          rgba(255, 255, 255, 0.72);
  --glass-bg-elevated: rgba(255, 255, 255, 0.88);
  --glass-border:      rgba(24, 24, 27, 0.08);
  --glass-highlight:   rgba(255, 255, 255, 0.90); /* 顶部 1px 高光折射 */
  --glass-shadow:      0 12px 32px -8px rgba(24, 24, 27, 0.08), 0 2px 6px -1px rgba(24, 24, 27, 0.04);

  /* 实心/半实心组件层级 */
  --surface-1:         #FFFFFF;   /* 卡片 / 节点底色 */
  --surface-2:         #F0EFEA;   /* 输入框 / 次级区块 */
  --surface-3:         #E6E4DD;   /* Hover / 激活态底色 */

  /* 线条与描边 */
  --line-subtle:       rgba(24, 24, 27, 0.06);
  --line-default:      rgba(24, 24, 27, 0.12);
  --line-strong:       rgba(24, 24, 27, 0.24);
  --edge-default:      #CBD5E1;

  /* 文本层级 */
  --text-1:            #18181B;   /* 主标题 / 核心正文 */
  --text-2:            #3F3F46;   /* 常规阅读正文 */
  --text-3:            #71717A;   /* 辅助信息 / 节点摘要 */
  --text-4:            #A1A1AA;   /* 占位符 / 禁用态 */

  /* 核心强调色（墨黑 + 陶土橙，告别 AI 蓝紫） */
  --accent-primary:    #18181B;   /* 主操作按钮色 */
  --accent-fg:         #FAFAFA;   /* 主按钮文字色 */
  --accent-focus:      #D97757;   /* 焦点/高光点缀：温暖的陶土橙 */
  --accent-xray:       #0284C7;   /* 链路追踪：克制的光学青蓝 */

  /* 语义状态色（自然矿物色系） */
  --status-verified:       #15803D;   /* 已验证：深森绿 */
  --status-verified-bg:    rgba(21, 128, 61, 0.08);
  --status-deprecated:     #B91C1C;   /* 已证伪：赤陶红 */
  --status-deprecated-bg:  rgba(185, 28, 28, 0.06);
  --status-exploring:      #71717A;   /* 探索中：中性锌灰 */
  --status-pinned:         #B45309;   /* 置顶 / 根节点：琥珀铜 */
}

.dark {
  /* === Dark Mode：曜石暗房与精密光学 === */
  --bg-canvas:         #0B0C0E;   /* 画布底层：深邃碳黑（非死黑） */
  --bg-dot:            rgba(255, 255, 255, 0.10);

  /* 光学毛玻璃表面 */
  --glass-bg:          rgba(22, 24, 29, 0.68);
  --glass-bg-elevated: rgba(30, 33, 40, 0.82);
  --glass-border:      rgba(255, 255, 255, 0.08);
  --glass-highlight:   rgba(255, 255, 255, 0.07); /* 顶部微弱高光边缘 */
  --glass-shadow:      0 16px 40px -10px rgba(0, 0, 0, 0.65), 0 2px 8px -2px rgba(0, 0, 0, 0.4);

  /* 实心/半实心组件层级 */
  --surface-1:         #14161A;
  --surface-2:         #1C1F26;
  --surface-3:         #262A34;

  /* 线条与描边 */
  --line-subtle:       rgba(255, 255, 255, 0.05);
  --line-default:      rgba(255, 255, 255, 0.10);
  --line-strong:       rgba(255, 255, 255, 0.22);
  --edge-default:      #333842;

  /* 文本层级 */
  --text-1:            #F4F4F5;
  --text-2:            #D4D4D8;
  --text-3:            #A1A1AA;
  --text-4:            #52525B;

  /* 核心强调色 */
  --accent-primary:    #F4F4F5;
  --accent-fg:         #18181B;
  --accent-focus:      #E08A6B;
  --accent-xray:       #38BDF8;

  /* 语义状态色 */
  --status-verified:       #22C55E;
  --status-verified-bg:    rgba(34, 197, 94, 0.12);
  --status-deprecated:     #F87171;
  --status-deprecated-bg:  rgba(248, 113, 113, 0.10);
  --status-exploring:      #A1A1AA;
  --status-pinned:         #F59E0B;
}

@theme {
  --font-sans:  "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif;
  --font-serif: "Newsreader", "Source Han Serif SC", "Songti SC", serif;
  --font-mono:  "JetBrains Mono", "Fira Code", ui-monospace, monospace;

  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   22px;
  --radius-pill: 9999px;

  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring:    cubic-bezier(0.22, 1.2, 0.36, 1);
}
```

### 2.1 节点类别色彩（低饱和工业色标）

摒弃高饱和荧光色，采用类似建筑图纸与精密仪器的克制色标：

| 类别 | 标签 | 浅色模式主色 | 暗色模式主色 | 视觉定位 |
|---|---|---|---|---|
| `root_goal` | 核心命题 | `#B45309` (琥珀) | `#F59E0B` | 根锚点[cite: 1] |
| `core_conclusion` | 结论 | `#1D4ED8` (群青) | `#60A5FA` | 关键收敛节点[cite: 1] |
| `code_impl` | 实现 | `#4338CA` (靛蓝) | `#818CF8` | 代码与架构[cite: 1] |
| `concept_qa` | 辨析 | `#0F766E` (松石) | `#2DD4BF` | 概念与追问[cite: 1] |
| `chitchat_debug` | 演算 | `#52525B` (铅灰) | `#A1A1AA` | 调试与分支尝试[cite: 1] |

---

## 3. 全局材质与氛围

### 3.1 光学毛玻璃（`.glass` 与 `.glass-elevated`）
真正的毛玻璃质感不在于“有多糊”，而在于**边缘折光（Specular Border）**与**背景色彩饱和度提升**：

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 0 var(--glass-highlight);
}

.glass-elevated {
  background: var(--glass-bg-elevated);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid var(--line-default);
  box-shadow: var(--glass-shadow), inset 0 1px 0 0 var(--glass-highlight);
}
```
- **适用范围**：顶部导航栏、右侧阅读抽屉、移动端底部抽屉（Bottom Sheet）、划词工具条、模态框、缩放控制器全部统一使用该材质[cite: 1]。
- **主题切换过渡**：切换明暗模式时，`background-color`、`border-color` 与 `color` 统一应用 `transition: 250ms ease`，实现柔和的昼夜交替感。

### 3.2 画布背景
1. **底层**：纯色 `--bg-canvas`，干净无杂色，不加任何彩色渐变光斑（彻底去除 AI 模板感）。
2. **精密点阵**：React Flow `<Background color="var(--bg-dot)" gap="{24}" size="{1.25}" variant="dots"/>`[cite: 1]。
3. **微暗角（仅 Dark 模式可选）**：四周边缘极轻微的径向压暗，增强画布中心的聚焦感。

---

## 4. 响应式与多端布局架构 (Desktop & Mobile)

使用 `100dvh` 替代 `100vh`，解决手机浏览器地址栏伸缩导致的布局跳动；全面适配 `env(safe-area-inset-*)`。

### 4.1 桌面端布局 (`≥ 768px`)
```text
┌────────────────────────────────────────────────────────────────┐
│  [◈ GraphLearn · 会话名 ▾]      [布局][透视][检视]   [☀/☾][⚙]  │ ← 悬浮毛玻璃顶栏
│                                                                │
│            ○───●───○                               ┌────────────────────┐
│           ╱         ╲                              │ 悬浮阅读抽屉        │
│     ■ 核心命题        ○───○                         │ 460px–600px (.glass)│
│           ╲         ╱                              │ 衬线标题 + 深度排版 │
│            ○───●───○                               │ [ 底部悬浮输入舱 ]  │
│                                                    └────────────────────┘
│ [＋ － 适应]                        [微缩导航图]                 │
└────────────────────────────────────────────────────────────────┘
```
- 抽屉打开时，画布不发生 DOM 宽度挤压，而是通过 `fitView({ padding: { right: drawerWidth } })` 平滑左移视口中心[cite: 1]。

### 4.2 移动端布局 (`< 768px`)
```text
┌──────────────────────────────┐
│ [◈ 会话名 ▾]     [透视][☀][⋯] │ ← 顶部紧凑毛玻璃栏 (top: safe-area + 8px, 高 44px)
│                              │
│          ■ 核心命题           │
│           ╱     ╲            │ ← 单指拖拽平移 / 双指捏合缩放
│          ●       ○           │   点击节点自动居中至屏幕上半区 (留出抽屉空间)
│                              │
├──────────────────────────────┤
│              ══              │ ← 底部毛玻璃抽屉 (Bottom Sheet, 3 档手势吸附)
│ [辨析] 二叉树非递归遍历    ●  │   - Peek 态 (18dvh)：仅展示节点标题与快捷状态切换
│ ──────────────────────────── │   - Half 态 (55dvh)：边看画布边读正文
│ 正文内容排版区...             │   - Full 态 (92dvh)：沉浸阅读与长文追问
│                              │
│ ┌──────────────────────────┐ │
│ │ 追问或深入推演...      [↑]│ │ ← 粘底输入区 (适配虚拟键盘抬起与 bottom safe-area)
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
- **移动端专属交互优化**：
  - **隐藏冗余控件**：移动端默认隐藏 `<MiniMap>` 与右下角缩放按钮，完全依靠双指捏合（Pinch-to-zoom）与双击画布适应视图。
  - **触控热区**：所有移动端按钮、节点连接点（Handle）的透明响应热区均不小于 `44×44px`。
  - **文本选区分支**：移动端选中文本后，避免与系统原生复制菜单冲突，在底部抽屉输入栏上方固定浮现一条 `.glass` 快捷操作带：`[ ↳ 派生新分支 ]  [ 引用追问 ]`。

---

## 5. 核心组件设计规范

### 5.1 顶部悬浮导航栏 `Toolbar`
- **造型**：高 `48px`（移动端 `44px`），`.glass` 材质，`border-radius: var(--radius-pill)`，内边距 `6px 8px`[cite: 1]。
- **视觉去 AI 化**：Logo 采用简洁的几何图形（如两个交错的圆环或包豪斯方块），使用 `--text-1` 纯色填充，不使用彩色渐变文字。
- **分区结构**：
  1. **工作区切换**：Logo + 当前图谱名称 + 展开箭头（点击弹出 `SessionManagerModal`）[cite: 1]。
  2. **画布工具组**：自动整理布局、X-Ray 链路透视、证据检视器[cite: 1]。
  3. **系统与外观组**：Token 极简容量条、**明暗主题切换器（Theme Toggle）**、设置按钮[cite: 1]。
- **明暗切换按钮**：点击时太阳/月亮 SVG 图标执行 `rotate(90deg) scale(0.8 -> 1)` 的弹簧切换动效，伴随轻微触觉反馈（移动端调用 `navigator.vibrate(10)`）。

### 5.2 知识卡片节点 `CapsuleNode`
尺寸保持 `240×80px`（根节点 `260×88px`），造型从“胶囊”转向更具书卷与仪器感的**「精密圆角卡片」**（`border-radius: 12px`）[cite: 1]：

```text
┌──────────────────────────────────────┐
│ ▍[结论] 二叉树遍历的时空权衡       ● │ ← 右上角为几何状态指示器，非 Emoji
│ ──────────────────────────────────── │
│ 递归与显式栈在时间上同为 O(n)，但...  │
└──────────────────────────────────────┘
```

| 视觉要素 | 设计规范 |
|---|---|
| **节点材质** | 默认采用 `--surface-1`（88% 不透明度）+ `backdrop-filter: blur(12px)`，保证连线从节点下方穿过时有微妙的磨砂透射感[cite: 1]。 |
| **类别标识** | 左上角 `3px × 12px` 垂直圆角微色条 + `11px` 字重 `500` 的类别名，干净利落[cite: 1]。 |
| **标题与摘要** | 标题 `13px / 600 / var(--text-1)` 单行截断；摘要 `11.5px / 1.45 / var(--text-3)` 两行截断[cite: 1]。 |
| **连接点 (Handle)** | 平时隐藏为 `5px` 的 `--line-strong` 小灰点；鼠标悬停节点或拖拽连线时，平滑放大至 `10px` 实心圆[cite: 1]。 |

**节点状态的三重冗余表达（纯几何图形，零 Emoji）**[cite: 1]：

| 状态 | 边框样式 | 卡片底色与阴影 | 右上角几何图标 (SVG) |
|---|---|---|---|
| `exploring` (探索中) | `1px solid var(--line-default)` | 标准 `--surface-1` | 中空虚线圆环 `◌` (`--status-exploring`) |
| `verified` (已验证) | `1px solid var(--status-verified)` | 顶部叠加极淡的 `--status-verified-bg` 渐变 | 实心绿点带微勾 `●` (`--status-verified`) |
| `deprecated` (已证伪) | `1px dashed var(--status-deprecated)` | 整体透明度 `0.75`，标题带 `1px` 删除线 | 斜杠圆环 `⊘` (`--status-deprecated`)[cite: 1] |
| `selected` (当前选中) | `1.5px solid var(--text-1)` | 外围 `3px` 柔和聚焦环 (`var(--line-default)`) | — |
| `pinned` (置顶参考) | 左上角或右上角增加琥珀色折角标记 | — | 几何图钉线条图标 (`--status-pinned`)[cite: 1] |

**流式推演态（替代俗套的跑马灯）**：
生成过程中，节点边框呈现柔和的呼吸明暗交替（`opacity: 0.4 <-> 1`），正文区域显示类似纸质打字机的实心小方块光标 `▋` 缓慢闪烁。

### 5.3 连线系统 `Edge`
- **常规连线**：平滑贝塞尔曲线，`stroke: var(--edge-default)`，线宽 `1.5px`[cite: 1]。
- **X-Ray 链路透视态**：
  - 未入选节点与连线退居幕后（`opacity: 0.18`，平滑过渡 `250ms`）[cite: 1]。
  - 完整上下文链路：`stroke: var(--accent-xray)`，线宽 `2px`，叠加 `stroke-dasharray: 4 8` 的低速匀速流动动效，表达信息汇入当前节点的物理过程[cite: 1]。
  - 仅知识卡摘要入选：精细点状虚线 `stroke-dasharray: 2 4`，颜色 `--text-2`[cite: 1]。

### 5.4 阅读与推演抽屉 `ReadingDrawer`
将对话界面设计为**「现代数字出版物 / 研究手稿」**，而非千篇一律的聊天机器人窗口：

1. **顶部栏（Sticky 毛玻璃）**：
   - 左侧：类别徽章 + 分段式状态切换器（Segmented Control：`探索 | 验证 | 证伪`，滑动块带有 `.glass` 阴影）[cite: 1]。
   - 右侧：置顶按钮、挂载附件数、关闭按钮[cite: 1]。
2. **节点大标题**：
   - 使用 `20px` 字重 `600` 的排版，支持点击直接原地编辑（无边框 Textarea 自适应高度）[cite: 1]。
3. **推演正文流（去气泡化设计）**：
   - **用户的提问/追问**：不再使用靠右的彩色聊天气泡。改用**「章节导语」**样式——顶部分隔线 + 左侧 `2px` 陶土橙（`--accent-focus`）竖线修饰 + 字重 `500` 的 `--text-1` 文本。这让整篇推演看起来像一份结构严谨的研究笔记。
   - **系统的回答**：直接自然排版，正文 `15px`（移动端 `15.5px`），行高 `1.75`，字色 `--text-2`，段间距 `1em`[cite: 1]。
   - **代码块**：圆角 `10px`，底色 `--surface-2`，`1px solid var(--line-subtle)` 描边。右上角常驻极简复制按钮[cite: 1]；浅色模式配 *GitHub Light / Alabaster* 语法高亮，暗色模式配 *Vitesse Dark / Rosé Pine* 语法高亮。
4. **底部悬浮输入舱（Floating Input Pod）**：
   - 距离抽屉底部 `12px` 悬浮，采用 `.glass-elevated` 材质，圆角 `16px`。
   - 聚焦时边框平稳过渡为 `--line-strong`。右侧发送按钮为纯色圆形（背景 `--accent-primary`，图标 `--accent-fg`），克制而有力[cite: 1]。

### 5.5 引用胶囊与预览卡 `CitationPill`
- 正文内引用其他节点时，渲染为精致的行内编号胶囊：`[↗ 二叉树复杂度]`，背景 `--surface-2`，边框 `1px solid var(--line-default)`，字号 `12px`[cite: 1]。
- **桌面端**：Hover 时弹出 `.glass-elevated` 预览小卡片（宽 `280px`），展示目标节点的核心结论[cite: 1]；点击后画布平滑平移至该节点[cite: 1]。
- **移动端**：第一次点击弹出底部/原位预览气泡，点击气泡内的「跳转至节点」收起抽屉至 Peek 态并移动画布。

### 5.6 模态框与面板 `Modals`
- **背景遮罩**：浅色模式 `rgba(24, 24, 27, 0.25)`，暗色模式 `rgba(0, 0, 0, 0.55)`，统一配 `backdrop-filter: blur(4px)`[cite: 1]。
- **弹窗主体**：使用 `.glass-elevated`，桌面端圆角 `20px` 居中展示；**移动端自动转换为底部上滑面板（Bottom Drawer）**，圆角 `24px 24px 0 0`，支持下拉手势关闭。

---

## 6. 关键交互与视觉语言

### 6.1 知识提炼卡片 `KnowledgeArtifact`
当一个节点推演收敛后，在抽屉顶部（标题下方）折叠展示一张**「核心结论卡」**[cite: 1]：
- 样式：采用 `--surface-2` 底色 + 四角精致的十字准星或细线框装饰（工程制图感）。
- 内容：50 字以内的精炼定律、前置假设（Invariants）或核心函数签名[cite: 1]。

### 6.2 容量指示器（替代彩虹仪表盘）
工具栏右侧展示当前上下文 Token 占用：采用 `36px × 6px` 的极简胶囊进度条（或 `18px` 极细单色圆环）。平时为 `--text-3` 单色，仅在超过 85% 阈值时变为 `--status-deprecated` 提醒清理分支[cite: 1]。

### 6.3 空白初始态（Empty Canvas）
首次进入新会话时，画布中央不放发光大图，而是呈现一张**安静的毛玻璃索引卡（Index Card）**：
- 顶部印有小号等宽字体编号（如 `SESSION // 001`）与当前日期。
- 中央为无边框输入框：「输入你想深入推演的技术命题或核心问题…」[cite: 1]
- 下方提供 3 个极简边框胶囊作为思维起点示例，点击即在画布中心生成第一个根锚点[cite: 1]。

---

## 7. 动效与手势规范

| 交互场景 | 动效参数与物理表现 |
|---|---|
| **明暗主题切换** | 全局颜色/背景/边框 `250ms cubic-bezier(0.4, 0, 0.2, 1)` 平滑过渡，无闪烁。 |
| **桌面抽屉进出** | `translateX(16px -> 0)` + `opacity(0 -> 1)`，`280ms var(--ease-out-quart)`[cite: 1]。 |
| **移动端 Bottom Sheet** | 跟随手指实时位移（`touch-action: none`）；松手后按速度向量（Velocity）与位置吸附至最近档位，`350ms var(--ease-spring)`。 |
| **新节点生长** | 从父节点坐标处以 `scale(0.85)` + `opacity(0)` 弹出并滑向目标布局位置，`400ms var(--ease-spring)`[cite: 1]。 |
| **按钮与卡片微交互** | 桌面端 Hover 背景色平滑过渡 `150ms`；移动端与桌面端 Active 按下统一 `scale(0.97)`[cite: 1]。 |

- **无障碍动效降级**：严格监听 `@media (prefers-reduced-motion: reduce)`，命中时关闭所有弹簧位移与虚线流动，仅保留 `150ms` 的透明度渐变[cite: 1]。

---

## 8. 字体排印体系 (Typography)

| 层级 | 字号 (Desktop / Mobile) | 行高 | 字重 | 字体族与特性 |
|---|---|---|---|---|
| **抽屉命题大标题** | `20px` / `19px` | `1.35` | `600` | `--font-sans`（可选 `--font-serif` 增强杂志阅读感） |
| **模态框标题** | `16px` / `17px` | `1.4` | `600` | `--font-sans`，`letter-spacing: -0.01em`[cite: 1] |
| **阅读正文** | `15px` / `15.5px` | `1.75` | `400` | `--font-sans`，段间距 `1em`，保证长文阅读呼吸感[cite: 1] |
| **节点标题** | `13px` / `13px` | `1.3` | `600` | `--font-sans`[cite: 1] |
| **节点摘要** | `11.5px` / `12px` | `1.45` | `400` | `--font-sans`[cite: 1] |
| **标签 / 徽章 / 快捷键** | `11px` / `11px` | `1.2` | `500` | `--font-mono`，数字开启 `tabular-nums`[cite: 1] |
| **代码块** | `13px` / `12.5px` | `1.6` | `400` | `--font-mono`[cite: 1] |

---

## 9. 图标与视觉资产
- **图标库**：统一采用 `lucide-react`，线条粗细设为 `strokeWidth={1.6}`（比默认 2.0 更显精密纤巧），常规尺寸 `16px`，移动端触控图标 `18px`[cite: 1]。
- **严禁 Emoji**：全站 UI 控件、状态标识、气泡菜单均使用定制 SVG 或 Lucide 图标，保持视觉语言的纯粹与统一。

---

## 10. 性能与移动端工程约束
1. **毛玻璃性能守卫**：
   - 桌面端画布节点数 `> 150` 或移动端节点数 `> 60` 时，画布内的 `CapsuleNode` 自动移除 `backdrop-filter: blur()`，回退为高不透明度纯色 `--surface-1`（悬浮工具栏与抽屉仍保留毛玻璃），确保拖拽缩放满帧 60 FPS[cite: 1]。
2. **移动端视口与键盘处理**：
   - 根节点容器使用 `height: 100dvh; width: 100vw; overflow: hidden; overscroll-behavior: none;`，防止移动端下拉刷新或橡皮筋回弹干扰画布手势。
   - 监听 `visualViewport` API，当手机软键盘弹起时，动态调整底部输入舱的 `bottom` 偏移量，避免输入框被键盘遮挡。
3. **渲染裁剪**：开启 React Flow 的 `onlyRenderVisibleElements={true}`，`CapsuleNode` 严格使用 `React.memo` 包装并细粒度订阅 Zustand 状态[cite: 1]。

---

## 11. 落地迭代优先级

| 阶段 | 核心交付内容 |
|---|---|
| **P0（基石与质感）** | 双主题 CSS 变量体系（Light/Dark）、光学毛玻璃 `.glass` 工具类、去 AI 化的节点卡片视觉、抽屉去气泡化阅读排版[cite: 1]。 |
| **P1（核心交互与响应）** | 顶部胶囊工具栏（含主题切换）、移动端三段式 Bottom Sheet 抽屉适配、移动端触摸热区与手势优化[cite: 1]。 |
| **P2（高阶推演体验）** | X-Ray 链路透视动画、划词/选词派生分支交互（桌面端气泡 + 移动端底栏）、行内引用胶囊与预览卡片[cite: 1]。 |
| **P3（打磨与极致性能）** | 空白态索引卡片、大图滤镜自动降级策略、`visualViewport` 软键盘跟随、无障碍与 `reduced-motion` 完善[cite: 1]。 |