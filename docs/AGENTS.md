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
yq '[.modules[].capabilities[].rest.routes[]? | .path + " " + .method]' docs/features.yml
yq '[.modules[].capabilities[].rest.routes[]? | select(.returns) | {"path": .path, "returns": .returns}]' docs/features.yml

# MCP tools (toolEntry objects with inline status)
yq '[.modules[].capabilities[].mcp.tools[]? | select((.status // "stable") != "unavailable") | .name]' docs/features.yml
yq '[.modules[].capabilities[].mcp.tools[]? | select(.status == "unavailable") | .name]' docs/features.yml
yq '[.modules[].capabilities[].mcp.tools[]? | select(.rest_equivalent) | {"tool": .name, "rest": .rest_equivalent}]' docs/features.yml

# Auth-level filtering
yq '[.modules[].capabilities[] | select(.auth == "anon") | .title]' docs/features.yml
yq '[.modules[].capabilities[] | select(.auth == "admin") | .title]' docs/features.yml

# Model types
yq '.models.HomeworkItem.types' docs/features.yml
yq '[.models | to_entries[] | {"model": .key, "types": .value.types}]' docs/features.yml

# Cases and edge cases
yq '.cases["content-security"]' docs/features.yml
yq '[.cases | to_entries[] | select(.value.affects) | {"case": .key, "affects": .value.affects}]' docs/features.yml

# Audit
yq '.audit.actions' docs/features.yml
yq '.audit.actions | to_entries | map(.key + ": " + .value.trigger)' docs/features.yml
```

## Canonical query examples (from meta.queries)

The file's `meta.queries` section contains pre-verified yq expressions for agent use:

```bash
yq '.meta.queries | keys' docs/features.yml   # list available query names
yq '.meta.queries.list_mcp_tools_stable' docs/features.yml   # get a specific query string
```

