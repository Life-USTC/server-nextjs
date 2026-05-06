# src/components/

Reusable UI components.

## Structure

```
ui/            Base components (Base UI + Tailwind)
admin/         Admin tables, filters, dialogs
descriptions/  Description display/edit
filters/       List/dashboard filters
schedules/     Schedule display
Root:          Layout shells, nav, calendars
```

## Rules

- No feature-specific data fetching
- No new feature mutations
- Keep permissions server-side

## Patterns

```typescript
// Compound components
export function Card({ children }) {
  return <div>{children}</div>;
}
Card.Header = function CardHeader({ children }) {
  return <div>{children}</div>;
};

// Variants with CVA
const variants = cva("base", {
  variants: { variant: { default: "..." } }
});

// Class merging
<div className={cn("base", className)} />
```

## UI Primitives

- Preserve `data-slot` patterns
- Buttons default `type="button"`
- Keep ARIA and keyboard support
- Links navigate, buttons mutate
- Sheet for edits, AlertDialog for destructive

## Layout

```typescript
<PageLayout>
  <PageBreadcrumbs items={[...]} />
  <PageSection>
    <Panel>...</Panel>
  </PageSection>
</PageLayout>
```

## Accessibility

- Semantic roles and labels
- `focus-visible` states
- Icon-only controls need labels
- Dialogs need titles
