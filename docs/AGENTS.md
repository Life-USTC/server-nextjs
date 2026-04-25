# docs/

`docs/features.yml` is a proper YAML file with English content. Use `yq` to query it.

```yaml
canonical_doc: docs/features.yml
schema: docs/features.schema.json
query_tool: yq
```

```bash
yq '.modules | keys' docs/features.yml
yq '.modules.homework' docs/features.yml
yq '.modules.homework.capabilities | keys' docs/features.yml
yq '.modules.oauth.capabilities["client-registration"].rest.routes' docs/features.yml
yq '.modules.mcp.capabilities["available-tools"].mcp.tools' docs/features.yml
yq '.models.HomeworkItem' docs/features.yml
yq '.cases["content-security"]' docs/features.yml
yq '.audit.actions' docs/features.yml
```
