- About
  - Nextjs
    - Prisma ORM
  - Locally
    - Postgres at `/Users/tiankaima/Source/Life-USTC/postgres/docker-compose.yml`
    - `psql` command is available but discouraged
  - CI/CD
    - GitHub Actions would perform check, build docker images, and push to ghcr.io
    - No automatic docker deployment is available, need manually update deployment
  - Deploy
    - <https://life-ustc.tiankaima.dev>
    - Details about deployment on server `jp-2`:
      - Project at`/srv/docker/life-ustc/docker-compose.yml`
      - Postgres at `/srv/docker/postgres/docker-compose.yml`
      - Caddy at `/srv/docker/caddy/docker-compose.yml`
      - Use `ssh jp-2` to view logs if u are instructed to

- Commands
  - Use bun/bunx
  - Check(Format): bun run check --write
  - Build: bun run build
  - Test: bun run test:e2e

- Images
  - For UI updates, capture a screenshot first
  - Inspect the saved screenshot with `view_image`
  - Prefer adjusting layout from the screenshot instead of guessing from class names
  - After visual changes, rerun a focused screenshot check when needed

- Rules
  - Delegate some work to sub-agent to speed things up
  - Check for best practice for implementations & fixes
  - Commit
    - Before commit, always check, build and test in full
      - Git hook enabled at `.githooks/pre-commit`
      - Remeber to check for file changes after commit (where the hook may have formatted some file and not commited), ammend them before pushing to remote
    - Use conventional commit message(feat/fix/chore/...)
      - Check for previous commit messages for consistency
      - Git hook enabled at `.githooks/commit-msg`
    - Cherry pick file/changes related only
      - Break down into smaller commits if absolutely necessary
    - If you're absolutely confident about this change, and all check/build/test have passed (whether or not bring by this change, it must pass), then you can push to origin to update (might need rebase first)
      - Push unless you are absolutely certain
  - For each feature added, remember to:
    - Add seed data if new model or special logic is introduced (for example, empty check on some field)
    - Write/Update E2E test and ensure they pass
  - Be sure to check for localization/iternationalization when page add/edit
  - Upon request to start a new worktree to work
    - Always use psql to create a new database on 127.0.0.1:5432 with credentials you'll find in .env;
      - This make sure no collision in database defintion, so name the new database according to your worktree/branch name
      - Update worktree .env to point to it
      - Run prisma deploy, and bun run dev:seed-scenarios

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

