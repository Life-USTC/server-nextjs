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
