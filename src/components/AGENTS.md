# src/components/

- Scope
  - Reusable UI components and shared composed UI
  - No feature-specific data fetching
  - No new feature-specific product mutations
  - Existing shared mutation surfaces must use typed API clients or server actions and keep permissions server-side

- Structure
  - `ui/`: base component wrappers built on Base UI patterns and Tailwind classes
  - `admin/`: shared admin tables, filters and dialogs
  - `descriptions/`: shared description display/edit surface
  - `filters/`: list/dashboard filter toolbars
  - `schedules/`: schedule display helpers
  - Root components cover layout shells, nav, calendars, profile/settings pieces and data states

- Component rules
  - Prefer compound components for multi-part UI
  - Use CVA for variants and `cn()` for class merging
  - Preserve `data-slot` patterns in UI primitives
  - Buttons default to `type="button"` unless used as submit
  - Keep ARIA and keyboard support intact
  - Links navigate; buttons mutate state
  - Use Sheet for light edits and AlertDialog for destructive confirmation
  - Use Toast for mutation feedback when the result is not otherwise obvious

- Layout and display
  - Use `PageLayout` for normal pages
  - Use `PageSection` / `Panel` for framed content blocks
  - Use `PageBreadcrumbs` where hierarchy matters
  - Keep `#main-content` contract intact through page composition
  - Keep cards stable as state changes
  - Do not let long course names, section codes or URLs overflow
  - Personal cards should keep title, time/state and primary action stable
  - Preserve semester, section code, teacher and location when needed for disambiguation

- Accessibility
  - Prefer semantic roles and labels
  - Keep focus-visible states
  - Preserve skip-to-content behavior
  - Icon-only controls need labels
  - Dialogs and sheets need titles
