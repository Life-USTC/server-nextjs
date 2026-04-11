# src/components/

可复用 UI 组件。

## 结构

- `ui/`: 基础组件库（Button、Dialog、Card、Badge、Table 等），基于 coss/base-ui + Tailwind
  - 这些组件从 Biome lint 中排除，遵循上游风格
  - 组件文档：`docs/cossui/`
- 其他文件：业务级复合组件（日历、分页、搜索、表单等）

## 约定

- 使用 compound component 模式（如 Dialog → DialogContent + DialogHeader + DialogFooter）
- 变体用 CVA（class-variance-authority）定义
- 保持可访问性：ARIA 属性、键盘导航
- 链接负责导航，按钮负责动作，不混用
- 轻量编辑用 Sheet，破坏性确认用 AlertDialog
