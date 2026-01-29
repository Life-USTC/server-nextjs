# UI Rules

## Why These Rules Exist
The UI layer uses the Coss UI library to ensure consistent accessibility, styling, and behavior across the app. Deviating from these components breaks visual and interaction consistency.

## Component Usage
- Never use native HTML elements for interactive components.
- Always use components from `@/components/ui/*` (Coss UI).
- Do not edit anything under `src/components/ui/` (auto-generated).

Examples:
- Use `<Button>` instead of `<button>`.
- Use `<Input>` instead of `<input>`.
- Use `<Card>` instead of `<div>` when representing card UIs.

## View Patterns
- List pages support table and card views via `?view=table` (default) or `?view=card`.
- Use `ViewSwitcher` for switching between views.
- Use `ClickableTableRow` for navigable rows.
- Render missing values as `"—"`.

## Toasts
- Use `useToast()` or `toastManager.promise()` from `@/components/ui/toast`.
- All toast messages must be localized.
- Variants: `default`, `destructive`, `success`, `warning`, `info`.
