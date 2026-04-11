- About
  - Next.js + Prisma ORM + PostgreSQL
  - Deploy: <https://life-ustc.tiankaima.dev>
  - CI/CD: GitHub Actions → ghcr.io; deployment is manual on server `jp-2`

- Commands
  - Use bun/bunx exclusively
  - Check: `bun run check --write`
  - Build: `bun run build`
  - Test: `bun run test:e2e`
  - Regenerate artifacts: `bun run prebuild` (after Prisma/API changes)

- Documentation
  - [docs/product.md](./docs/product.md): user experience, business logic, Web/API/MCP
  - [docs/engineering.md](./docs/engineering.md): engineering patterns, conventions, setup

- Images
  - For UI updates, capture a screenshot first
  - Inspect the saved screenshot with `view_image`
  - Prefer adjusting layout from the screenshot instead of guessing from class names

- Rules
  - Commit
    - Before commit: check, build and test must all pass
    - Git hooks at `.githooks/pre-commit` and `.githooks/commit-msg`
    - After commit, check for untracked formatting changes from hooks; amend before push
    - Use conventional commit messages (feat/fix/chore/...)
    - Only commit changes related to the current task
    - Push only when all checks pass and you are confident
  - Feature changes
    - Add seed data for new models or special logic
    - Write/update E2E tests
    - Check i18n for any page additions or edits
  - Worktree setup
    - Create a new database on 127.0.0.1:5432 named after the worktree/branch
    - Update worktree .env to point to the new database
    - Run `bun run prisma:deploy` and `bun run dev:seed-scenarios`

## Cursor Cloud-specific instructions

_Only applies to Cursor Cloud/Web Agent environments._

### Services

| Service | Start command | Notes |
|---|---|---|
| PostgreSQL 16 | Start Docker daemon with `sudo dockerd &>/dev/null &`, then run `sudo docker compose -f docker-compose.dev.yml up -d postgres` | Must be running before the app starts |
| Next.js dev server | `bun run dev` | Runs on port 3000 with Turbopack |

### Non-obvious gotchas

- Docker-in-Docker in Cursor Cloud requires the `fuse-overlayfs` storage driver and `iptables-legacy`. Docker daemon config is at `/etc/docker/daemon.json`
- Start `dockerd` manually with `sudo dockerd &>/dev/null &` before running any `docker compose` command
