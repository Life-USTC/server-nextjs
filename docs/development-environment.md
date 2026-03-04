# Development Environment

## Environment variables

- Copy `.env.example` to `.env.development` and fill in real values.
- For local development, you can use `E2E_MOCK_S3=1` to avoid external S3/R2 credentials.

## Docker Compose

- Production deployment compose file: `docker-compose.prod.yml`
- Local development compose file: `docker-compose.dev.yml`

Start dev stack (app + local Postgres with live reload):

```bash
docker compose -f docker-compose.dev.yml up --build
```

## CI / E2E database policy

- E2E workflow uses a workflow-local Postgres service.
- Do not provide `secrets.DATABASE_URL` for E2E.
- If you run E2E in another CI system, start a local Postgres service in the pipeline and point `DATABASE_URL` to that service.

## GitHub Copilot coding agent environment

- Custom setup workflow: `.github/workflows/copilot-setup-steps.yml`
- It installs dependencies, starts a local Postgres service, configures local env defaults, applies migrations, and generates build artifacts before the agent session starts.
