# Life USTC Server - Next.js

USTC Life Server - Course and schedule management API using Next.js

## Quick Start

### Prerequisites
- Node.js 20+
- Bun (package manager)
- PostgreSQL (or Supabase for production)

### Development

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Run development server
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Database

```bash
# Generate Prisma Client
bun run prisma:generate

# Run migrations
bun run prisma:migrate

# Reset database (development only)
bun run prisma:reset

# Open Prisma Studio
bun run prisma:studio

# Load data from static repository (legacy method)
bun run db:load
```

## Data Loading

### Webhook API (Recommended)

The webhook API allows you to load course and schedule data directly via HTTP POST requests, reducing network overhead compared to the legacy script-based approach.

See [WEBHOOK_API.md](WEBHOOK_API.md) for detailed documentation on:
- Authentication setup
- API endpoints and payload formats
- Example usage with curl and JavaScript/TypeScript
- Migration from script-based loading

Quick example:
```bash
# Set WEBHOOK_SECRET in your .env file first
curl -X POST http://localhost:3000/api/webhooks/load-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -d '{"type": "semesters", "data": [...]}'
```

### Legacy Script-based Loading

For local development or one-time imports, you can still use the script-based loader:
```bash
bun run db:load [cache-dir]
```

This downloads the static repository and imports all data. Use the webhook API for production deployments.

## Docker

### Build and Run with Docker Compose

```bash
# Set up environment file
cp .env.example .env

# Build and run
docker-compose up --build

# Just run (if image already built)
docker-compose up
```

### Build Docker Image

```bash
docker build -t server-nextjs .
docker run -p 3000:3000 -e DATABASE_URL=postgresql://... server-nextjs
```

## Code Quality

### Linting & Formatting

We use [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Check for issues
bun run lint

# Format code
bun run format
```

These checks run automatically on:
- Push to `main`
- All pull requests

Failures will be reported as inline comments.

## Releasing

### Automatic Releases (Recommended)

We use [semantic-release](https://semantic-release.gitbook.io/) to automate versioning and releases based on [Conventional Commits](https://www.conventionalcommits.org/).

#### Conventional Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(api): add new endpoint for schedules
fix(database): resolve connection pool issue
docs: update README
```

**How it works:**
1. Commits following the conventional format are automatically analyzed
2. Version is bumped based on commit types (patch, minor, or major)
3. CHANGELOG.md is automatically generated
4. GitHub Release is created with release notes
5. Docker image is automatically built and pushed to GHCR with appropriate tags

#### Manual Release (if needed)

If automatic release doesn't work, you can manually trigger it:

```bash
# Create a git tag following semver (e.g., v0.2.0)
git tag -a v0.2.0 -m "Release version 0.2.0"

# Push the tag (this triggers the Docker build workflow)
git push origin v0.2.0
```

This will:
- Trigger the Docker build/push workflow
- Create a GitHub Release
- Push Docker images to GHCR with tags:
  - `v0.2.0` (version tag)
  - `0.2` (major.minor)
  - `latest` (always for main branch)

## CI/CD Pipelines

### Workflows

1. **Lint & Format** (`.github/workflows/lint-format.yml`)
   - Runs on push to `main` and all PRs
   - Checks code style and formatting
   - Posts inline comments on failures

2. **Semantic Release** (`.github/workflows/semantic-release.yml`)
   - Runs after push to `main`
   - Analyzes commits and creates releases automatically
   - Updates CHANGELOG.md
   - Creates GitHub Release

3. **GitHub Release** (`.github/workflows/github-release.yml`)
   - Triggered by version tags (v*)
   - Generates release notes
   - Creates GitHub Release page

4. **Build & Push Docker Image** (`.github/workflows/build-push-docker.yml`)
   - Runs on push to `main` and version tags
   - Builds Docker image
   - Pushes to GHCR (GitHub Container Registry)
   - Auto-tags with version and branch info

## Docker Images

Published to GitHub Container Registry: `ghcr.io/Life-USTC/server-nextjs`

**Available tags:**
- `latest` - Latest stable release
- `v0.2.0` - Specific version releases
- `0.2` - Major.minor version
- `main-{sha}` - Commits to main branch

Pull image:
```bash
docker pull ghcr.io/Life-USTC/server-nextjs:latest
```

## Project Structure

```
server-nextjs/
├── src/
│   ├── app/           # Next.js app directory
│   └── lib/           # Utilities and helpers
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── migrations/    # Database migrations
├── .github/
│   └── workflows/     # CI/CD workflows
├── scripts/           # Build and utility scripts
├── Dockerfile         # Docker configuration
└── package.json       # Dependencies and scripts
```

## Environment Variables

See `.env.example` for available options:

- `DATABASE_URL` - PostgreSQL connection string
- `WEBHOOK_SECRET` - Authentication secret for webhook API (required for data loading)

**Important:** 
- For production, use Supabase or managed PostgreSQL database
- Keep `WEBHOOK_SECRET` secure and never commit it to version control
- Generate a secure token: `openssl rand -hex 32`

## Security

- **Webhook Authentication**: All webhook endpoints require authentication via `WEBHOOK_SECRET`
- **HTTPS**: Always use HTTPS in production to protect authentication tokens
- **Environment Variables**: Never commit `.env` files with real credentials
- **Rate Limiting**: Consider implementing rate limiting for production deployments

## Support

For issues and questions, please open a GitHub issue.
