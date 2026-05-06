# docs/features/

Modular feature specifications.

## Structure

```yaml
_meta.yml:     Product metadata and query examples
_product.yml:  Roles, workflow, display conventions
_models.yml:   Prisma model documentation
_enums.yml:    Enum definitions
_ui.yml:       UI pattern library
_cases.yml:    Edge cases and scenarios
_audit.yml:    Audit actions

<module>.yml:  Feature modules
```

## Workflow

When behavior, API, MCP, parameters, or outputs change:

1. Update the affected `docs/features/<module>.yml` first.
2. Implement code changes.
3. Run `bun run check:features`.
4. Update relevant tests.

## Queries

```bash
# Single module
yq '.capabilities | keys' docs/features/homework.yml
yq '.rules' docs/features/user.yml

# Models and enums
yq 'keys' docs/features/_models.yml
yq 'keys' docs/features/_enums.yml

# All modules
find docs/features -maxdepth 1 -type f -name '*.yml' ! -name '_*.yml' -exec basename {} .yml \; | sort
```

## Module Shape

Each module file contains:
- `name`
- `access`
- `rules`
- `capabilities`

Keep module files focused. Shared model, enum, UI, case, and audit metadata stays in the `_*.yml` files.
