# Commit Message Convention

This repository uses Conventional Commits with a small amount of extra structure to keep
history readable and release notes usable.

## Required format

Use:

```text
type(scope): imperative summary
```

Examples:

```text
feat(api): validate section query params
fix(auth): handle expired OAuth refresh tokens
perf(home): reduce dashboard data queries
refactor(openapi): split schema generation helpers
test(e2e): cover oauth token refresh flow
docs(api-docs): document interactive schema endpoint
ci(workflows): run e2e on pull requests
build(prisma): pin generator invocation
chore(release): 0.43.0 [skip ci]
chore: refresh local tool versions
```

## Allowed types

- `feat`
- `fix`
- `perf`
- `refactor`
- `test`
- `docs`
- `ci`
- `build`
- `chore`
- `revert`

## Scope rules

- `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `ci`, and `build` must include a scope.
- `chore` and `revert` may omit the scope when the change is broad or administrative.
- Scopes must be lowercase and may contain digits, hyphens, or slashes.

Preferred scopes in this repo:

- `admin`
- `api`
- `api-docs`
- `api-schemas`
- `app`
- `auth`
- `biome`
- `build`
- `ci`
- `client`
- `comments`
- `core`
- `courses`
- `dashboard`
- `data`
- `e2e`
- `home`
- `homeworks`
- `i18n`
- `ical`
- `image`
- `metadata`
- `mock-s3`
- `oauth`
- `openapi`
- `prisma`
- `profile`
- `release`
- `schedule`
- `section`
- `seed`
- `semester`
- `storage`
- `subscriptions`
- `teachers`
- `ui`
- `uploads`
- `workflows`

## Subject rules

- Use imperative mood: `add`, `fix`, `remove`, `align`.
- Keep the subject short and release-note friendly.
- Do not end the subject with a period.
- Do not append PR numbers in the subject, for example `(#123)`.

Use footers instead:

```text
Refs: #123
Closes: #123
```

## Body rules

- `feat(api): ...`, `fix(api): ...`, `feat(auth): ...`, and `fix(auth): ...` must include a body.
- Any breaking change must include a body.
- If you use `!` in the header, you must also include a `BREAKING CHANGE:` footer.

Recommended body layout:

```text
Why:
- what changed in behavior or contract
- what problem this solves

What:
- key implementation or migration details
- important constraints or follow-up notes
```

The body does not need these headings verbatim, but it must explain the behavior change clearly enough
for reviewers and release notes readers to understand the impact.

## Breaking changes

Mark breaking changes in one of these forms:

```text
feat(api)!: replace token response shape
```

or:

```text
BREAKING CHANGE: token response no longer includes refreshExpiresAt
```

Recommended full example:

```text
feat(api)!: replace token response shape

Why:
- unify OAuth and session token responses

What:
- removes refreshExpiresAt from the top-level payload
- nests token metadata under token.meta

BREAKING CHANGE: /api/oauth/token no longer returns refreshExpiresAt at the top level.
Clients must read token.meta.expiresAt instead.
```

## Local enforcement

Install the repository hooks once:

```bash
bun run hooks:install
```

Validate the most recent commit:

```bash
bun run commitlint:last
```

Validate everything since `origin/main`:

```bash
bun run commitlint:main
```
