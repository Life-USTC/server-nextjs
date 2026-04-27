# docs/

`docs/features.yml` is a proper YAML file with English content. Use `yq` to query it.

```yaml
canonical_doc: docs/features.yml
schema: docs/features.schema.json
query_tool: yq
```

## Common queries

```bash
# Structure navigation
yq '.modules | keys' docs/features.yml
yq '.modules.homework' docs/features.yml
yq '.modules.homework.capabilities | keys' docs/features.yml
yq '.models | keys' docs/features.yml

# Rules (ruleMap — query by id)
yq '.modules.oauth.rules | keys' docs/features.yml
yq '.modules.oauth.rules["token-rotation"]' docs/features.yml
yq '.modules | to_entries[] | {"module": .key, "rule_ids": (.value.rules | keys)}' docs/features.yml

# REST routes (routeEntry objects)
yq '.modules.oauth.capabilities["client-registration"].rest.routes' docs/features.yml
yq '[.modules[].capabilities[].rest | select(type == "!!map") | .routes[]? | .path + " " + (.method // "GET")]' docs/features.yml
yq '[.modules[].capabilities[].rest | select(type == "!!map") | .routes[]? | select(.returns) | {"path": .path, "returns": .returns}]' docs/features.yml

# MCP tools (toolEntry objects; unavailable surfaces use scalar shorthand)
yq '[.modules[].capabilities[].mcp | select(type == "!!map") | .tools[]? | .name] | unique' docs/features.yml
yq '[.modules | to_entries[] | . as $m | .value.capabilities | to_entries[] | select(.value.mcp == "unavailable" or .value.mcp.status == "unavailable") | {"module": $m.key, "capability": .key}]' docs/features.yml
yq '[.modules[].capabilities[].mcp | select(type == "!!map") | .tools[]? | select(.rest_equivalent) | {"tool": .name, "rest": .rest_equivalent}]' docs/features.yml

# Auth-level filtering
yq '[.modules[].capabilities[] | select(.auth == "anon") | .title]' docs/features.yml
yq '[.modules[].capabilities[] | select(.auth == "admin") | .title]' docs/features.yml

# Prisma-backed model metadata
yq '.models | keys' docs/features.yml
yq '.models.Course.fields' docs/features.yml
yq '.models | to_entries[] | {"model": .key, "fields": (.value.fields | keys)}' docs/features.yml
yq '.enums | keys' docs/features.yml

# Cases and edge cases
yq '.cases["content-security"]' docs/features.yml
yq '[.cases | to_entries[] | select(.value.affects) | {"case": .key, "affects": .value.affects}]' docs/features.yml

# Audit
yq '.audit.actions' docs/features.yml
yq '.audit.actions | to_entries | map(.key + ": " + .value.trigger)' docs/features.yml

# Validation
bun run check:features
```

## Canonical query examples (from meta.queries)

The file's `meta.queries` section contains pre-verified yq expressions for agent use:

```bash
yq '.meta.queries | keys' docs/features.yml   # list available query names
yq '.meta.queries.list_mcp_tools_stable' docs/features.yml   # get a specific query string
```
