# Vue → React 迁移说明

本文档记录 OpenPencil 从 Vue 3 迁移到 React 的映射规则、技术选型与无法 1:1 对应处的处理方式。

## 技术栈选型

| 类别       | 选型                                           | 理由                                                              |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| UI 框架    | React 19（函数组件 + Hooks）                   | 满足 React 18+ 要求；禁止 class component                         |
| 语言       | TypeScript 严格模式                            | 禁止 `any`（必要时 `unknown` + 收窄）                             |
| 状态管理   | **nanostores**（+ `@nanostores/react`）        | 见下方「状态管理理由」                                            |
| 路由       | React Router v7（`react-router`，兼容 v6 API） | `createBrowserRouter` + `RouterProvider`                          |
| 样式       | 沿用 Tailwind CSS v4                           | 与原 Vue 应用一致，不引入 CSS Modules / styled-components         |
| 构建       | Vite + `@vitejs/plugin-react`                  | 构建工具不变                                                      |
| UI 原语    | Radix UI（替代 Reka UI）                       | 无障碍 headless 组件，API 与 Reka 接近                            |
| 列表虚拟化 | `@tanstack/react-virtual`                      | 大列表（字体选择等）使用；图层树保留 flatten + 原生滚动（见取舍） |
| i18n       | `@nanostores/i18n`                             | Vue SDK 已使用，迁移后继续复用消息与 locale 结构                  |

### 状态管理理由（相对 Zustand / Redux Toolkit / Jotai）

需求清单要求在 Zustand / Redux Toolkit / Jotai 中二选一。本次迁移选择 **nanostores**，并明确记录为对清单的有意偏差：

1. **已有依赖**：`@open-pencil/vue` 已用 `nanostores` + `@nanostores/i18n` 管理文案与 locale。换成 Zustand/Jotai 需重写整套 i18n，属于「顺手重构」，违反迁移禁止事项。
2. **原子订阅更贴合性能要求**：清单要求「Context 按数据职责拆分、避免无关重渲染」。nanostores 的 atom/computed + `useStore(atom)` 天然按字段订阅；主题、Toast、Tabs、Collab、AI provider 各自独立 atom，互不牵连。
3. **编辑器热路径不走全局 store**：场景图高频更新（`sceneVersion` / `renderVersion`）通过 `useSyncExternalStore` 选择器订阅，pan/zoom 不会拖垮属性面板——这比把整个 editor 塞进 Zustand store 更符合「页面级状态不要提升到全局」。
4. **若强制对齐清单**：可将 `src/app/shell/theme.ts`、`src/app/shell/ui.ts`、`src/app/tabs/index.ts` 等 app 级 atom 迁到 Zustand；i18n 仍建议保留 `@nanostores/i18n`。此工作单独开 issue，不在本迁移内完成。

## 包结构变化

| 迁移前                               | 迁移后                                   |
| ------------------------------------ | ---------------------------------------- |
| `packages/vue`（`@open-pencil/vue`） | `packages/react`（`@open-pencil/react`） |
| `src/**/*.vue`                       | `src/**/*.tsx`（先改扩展名，再改内容）   |
| `src/main.ts`                        | `src/main.tsx`                           |
| `src/router.ts`                      | `src/router.tsx`                         |
| Vite `@vitejs/plugin-vue`            | `@vitejs/plugin-react`                   |
| Storybook Vue                        | `@storybook/react-vite`                  |

`packages/docs`（VitePress）主题组件仍为 `.vue`——VitePress 运行时是 Vue，不在本次应用迁移范围内。

## 特性映射表

### 响应式状态

| Vue                                    | React                                              |
| -------------------------------------- | -------------------------------------------------- |
| `ref` / `reactive` / `shallowReactive` | `useState`；editor session 仍用可变对象 + 外部订阅 |
| `computed`                             | `useMemo`，或 nanostores `computed`                |
| `watch` / `watchEffect`                | `useEffect`（精确依赖数组）                        |
| VueUse `useLocalStorage` 等            | 等价 hooks / 本地实现（如 SafariBanner）           |

### 组件通信

| Vue                  | React                                                         |
| -------------------- | ------------------------------------------------------------- |
| `props`              | `interface XxxProps` + 显式 props                             |
| `emit('change')`     | `onChange` / `onSubmit` 等回调 props                          |
| `provide` / `inject` | React Context + `useXxx()`（如 `useEditor`、`EditorContext`） |
| 具名 / 默认 slots    | `children` 或 render props（`(props) => ReactNode`）          |
| `v-slot` 作用域插槽  | render props（`LayerTreeRoot`、`CanvasRoot` 等）              |

### 生命周期

| Vue           | React                                                  |
| ------------- | ------------------------------------------------------ |
| `onMounted`   | `useEffect(() => { ... }, [])`                         |
| `onUnmounted` | `useEffect` cleanup                                    |
| `onUpdated`   | **不模拟**；用依赖精确的 `useEffect` / 外部 store 订阅 |

### 模板语法

| Vue               | React                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `v-if` / `v-else` | 三元 / 提前 `return null`                                                |
| `v-for`           | `.map()`，`key` 用稳定 id（禁止无脑用 index）                            |
| `v-model`         | 受控：`value` + `onChange`                                               |
| `v-show`          | `className` / `style.display`                                            |
| `v-html`          | 仅在原逻辑确有 `v-html` 处使用（本迁移未新增 `dangerouslySetInnerHTML`） |

### UI 库

| Vue (Reka UI)                         | React (Radix UI)                |
| ------------------------------------- | ------------------------------- |
| `TooltipProvider`                     | `@radix-ui/react-tooltip`       |
| `ContextMenu*`                        | `@radix-ui/react-context-menu`  |
| `DropdownMenu*`                       | `@radix-ui/react-dropdown-menu` |
| `Dialog*` / `Popover*` / `Select*` 等 | 对应 `@radix-ui/react-*`        |
| `Splitter`                            | `react-resizable-panels`        |
| `unplugin-icons` / Iconify            | `lucide-react`                  |

### 其它

| Vue                            | React                                                  |
| ------------------------------ | ------------------------------------------------------ |
| `@unhead/vue`                  | `@unhead/react`                                        |
| `vue-router`                   | `react-router`                                         |
| `@vueuse/core`                 | 按需替换为 React hooks / 自研薄封装                    |
| Pinia（未使用）                | —                                                      |
| `shallowReactive` editor state | 可变 `EditorStore` + `useSyncExternalStore` / 事件订阅 |

## 性能策略（对应清单要求）

1. **热路径选择器**：`useSceneSnapshot` / `useRepaintSnapshot` 等基于 `useSyncExternalStore`，属性面板只订 `sceneVersion`，canvas 订 `renderVersion`。
2. **原子全局状态**：Tabs / Theme / Toast / Collab / AI 配置分 atom，组件 `useStore` 只订需要的字段。
3. **NumberField scrub**：`onChange` 按 animation frame 合并，本地显示即时更新。
4. **React.memo / useCallback / useMemo**：在高频子树（颜色区、属性段、字体列表等）使用；未对所有叶子无脑包裹，避免过度记忆化反而增加成本。
5. **大列表**：字体选择等使用 `@tanstack/react-virtual`。图层树当前为 flatten + 原生滚动（原 Vue 实现同等策略）；超大文档虚拟化可作为后续增强。

## 数据流约束落实

| 层级              | 存放位置                                                              |
| ----------------- | --------------------------------------------------------------------- |
| 全局跨模块        | nanostores atoms：`theme`、`toasts`、`tabs`、locale                   |
| 页面级            | `EditorView` 顶层编排（画布、面板显隐、collab session）               |
| 组件局部          | 各组件 `useState`（如 banner dismissed、popover open）                |
| Editor 实例       | `EditorStore`（非 React state），经 Context / active-store proxy 访问 |
| 禁止深层 drilling | Editor / i18n / collab 走 Context 或 atom，不传 3 层以上 props        |

## 无法 1:1 对应的处理

| 原 Vue 能力                                 | 处理方式                                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| SFC `<script setup>` + `<template>`         | 单文件 `.tsx`，JSX 即模板                                                                                            |
| `defineModel`                               | 受控 props + `onChange`                                                                                              |
| Reka `as-child` / Slot                      | Radix `asChild` + `Slot`                                                                                             |
| Vue `Teleport`                              | `createPortal` / Radix Portal                                                                                        |
| Reka `Splitter`（`direction` + 百分比数组） | `react-resizable-panels` v4：`orientation` + `Layout` 对象（按 panel id）；`layout-storage` 兼容旧 `[18,64,18]` 数组；`autoSaveId` 改为可选的 `useDefaultLayout`（图层侧栏暂不持久化） |
| Vue 编译期 `v-test-id` 等                   | `data-test-id` 显式 props（SDK 保留 `v-test-id` 兼容 helper 名）                                                     |
| VitePress SDK 文档主题                      | **保持 Vue**（VitePress 约束）                                                                                       |
| `packages/vue` 包名                         | 发布为 `@open-pencil/react`；下游需改 import                                                                         |
| Storybook CSF Vue                           | CSF React；部分 stories 需按 React 写法调整                                                                          |
| scene-graph → `#core` 的变体属性解析        | `generatePropertyValues` / `generateVariantName` 下沉到 `@open-pencil/scene-graph/variant-name`，消除包层违规依赖    |

## 文件改名约定

迁移按「先改扩展名，再改内容」执行：

1. `Foo.vue` → `Foo.tsx`（git rename）
2. 将 `<script setup>` / `<template>` 改为函数组件 + JSX
3. 更新 import 路径与入口（`main.tsx`、Vite、Storybook）

## 测试

- Engine / 核心单元测试：`bun run test:unit`（与框架无关的 `@open-pencil/core` 逻辑保留）
- E2E：Playwright（`data-test-id` 保持稳定，交互用例可复用）
- 组件级：有原测试的转为 React Testing Library；本 PR 以端到端与类型检查为主验收
- 人工核对项：UI 视觉一致、快捷键、选区/拖拽、面板 scrub、文件打开保存、协作房间

## 禁止事项遵守情况

- 未借迁移之机改业务算法或修无关 bug
- 新增依赖均有替代原 Vue 生态的必要性说明（React、Radix、react-router、lucide-react、@tanstack/react-virtual 等）
- 未用 `dangerouslySetInnerHTML` 替代原模板逻辑

## 下游迁移 checklist

应用 / 嵌入方升级时：

```diff
- import { provideEditor, useCanvas } from '@open-pencil/vue'
+ import { provideEditor, useCanvas } from '@open-pencil/react'
```

- 入口改为 `createRoot(...).render(<App />)`
- 路由改为 `createBrowserRouter` / `RouterProvider`
- 图标改为 `lucide-react`
- Reka 组件改为对应 Radix 包
