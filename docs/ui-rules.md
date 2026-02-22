# UI 规则

## 规则原因

UI 层使用 Coss UI 组件库以确保无障碍、一致的样式与交互行为。偏离这些组件会破坏视觉与交互一致性。

## 组件使用

- 交互组件不要使用原生 HTML 元素。
- 必须使用 `@/components/ui/*`（Coss UI）。
- 不要编辑 `src/components/ui/` 下的自动生成组件。
- 自动生成组件若提供 label/slot，需由调用方传入本地化文案。

示例：

- 使用 `<Button>` 而不是 `<button>`。
- 使用 `<Input>` 而不是 `<input>`。
- 展示卡片时优先使用 `<Card>` 而不是 `<div>`。

## 视图规范

- 列表页支持 `?view=table`（默认）或 `?view=card`。
- 使用 `ViewSwitcher` 进行视图切换。
- 可点击行使用 `ClickableTableRow`。
- 缺失值显示为 "—"。

## 可复用样式片段

以下是当前页面/组件中反复出现且推荐统一复用的 Tailwind 组合，优先沿用这些写法以保持一致性。

- 页面标题块
  - 标题：`text-display`
  - 副标题：`text-muted-foreground text-subtitle`
  - 容器：`mt-8 mb-8`
- 卡片跳转态
  - `transition-colors hover:bg-accent/50`
- 图标圆形底座
  - `flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary`
- 次要说明文字
  - `text-muted-foreground text-sm` 或 `text-muted-foreground text-xs`
- 表格行点击态
  - `cursor-pointer hover:bg-muted/50`

### 颜色与语义类

- 避免使用 `text-gray-*`、`bg-gray-*`、`border-gray-*`。
- 统一使用语义类：`text-muted-foreground`、`bg-muted`、`border-border`、`bg-card` 等。

## Toast

- 使用 `useToast()` 或 `toastManager.promise()`（来自 `@/components/ui/toast`）。
- Toast 文案必须本地化。
- 变体：`default`、`destructive`、`success`、`warning`、`info`。
