# .github/workflows/

## Scope

```yaml
paths:
  - .github/workflows/**
registry: ghcr.io
deploy_mode: manual_on_jp-2
```

## Rules

- Production build validation is `docker build .`.
- Keep workflow Node/Bun versions aligned with:
  - `.nvmrc`
  - `.node-version`
  - `.bun-version`
- Prefer the repo's existing `bun`-based commands over introducing parallel `npm` or `pnpm` workflow paths.
- When workflow changes affect app/runtime expectations, keep them aligned with the commands in the root `AGENTS.md`.
- Do not add secrets to workflow files, logs, comments, or docs.
