# Project Overview

## Why This Project Exists
Life@USTC Server provides course and schedule data for USTC students and staff. It exposes REST APIs and renders pages that query structured academic data from PostgreSQL via Prisma. The goal is to keep data access consistent, reliable, and internationalized across the app.

## Core Capabilities
- Course, section, schedule, teacher, and related academic data APIs.
- App Router pages for browsing and detail views.
- Shared query helpers for pagination and include graphs.
- Internationalized UI with `en-us` and `zh-cn` locales.

## Tech Stack Snapshot
- Next.js App Router, React, TypeScript.
- Prisma ORM + PostgreSQL.
- Tailwind CSS v4.
- Bun for development scripts.

## Architecture At A Glance
Directory highlights (non-exhaustive):
- `src/app/` routes, pages, and server actions.
- `src/lib/` shared helpers for API, Prisma, and queries.
- `messages/` translation files for i18n.
- `prisma/schema.prisma` data model definitions.
