# Life@USTC Server

> [!WARNING]
> Not Production ready, yet.

Next.js version of Life@USTC Server.

### Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev
```

Visit <http://localhost:3000>

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

# Load data from https://github.com/Life-USTC/static.git
bun run tools/load-from-static.ts
```

### Testing

```bash
# Install Playwright browser (first time)
bun run test:e2e:install

# Run E2E tests
bun run test:e2e

# Seed dev debug user data
bun run dev:seed-debug-user

# Seed deterministic dev scenarios (recommended)
bun run dev:seed-scenarios

# Reset deterministic dev scenarios
bun run dev:reset-scenarios
```
