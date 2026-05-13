# docs/features/

Modular feature specifications stored as formatted JSON.

## Structure

```text
Shared metadata
  _meta.json       Product metadata and query examples
  _product.json    Roles, workflow, display conventions
  _models.json     Prisma model documentation
  _enums.json      Enum definitions
  _ui.json         UI pattern library
  _cases.json      Edge cases and scenarios
  _audit.json      Audit actions

Feature modules
  <module>.json
```

## Workflow

When behavior, API, MCP, parameters, or outputs change:

1. Update the affected `docs/features/<module>.json` first.
2. Implement code changes.
3. Run `bun run check:features` to validate the merged contract against schema, Prisma, REST, and MCP parity checks.
4. Update relevant tests.

If the user did not explicitly ask for documentation changes, ask before broad restructures or rewrites and keep any required doc edits tightly scoped.

## Queries

```bash
# Single module
jq '.capabilities | keys' docs/features/homework.json
jq '.rules' docs/features/user.json

# Models and enums
jq 'keys' docs/features/_models.json
jq 'keys' docs/features/_enums.json

# All modules
find docs/features -maxdepth 1 -type f -name '*.json' ! -name '_*.json' -exec basename {} .json \; | sort
```

## Module Shape

Each module file contains:
- `name`
- `access`
- `rules`
- `capabilities`

Keep module files focused. Shared model, enum, UI, case, and audit metadata stays in the `_*.json` files.
