# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

NestJS REST API backend for AchoApp (mobile) and the CMS admin panel. Backed by MongoDB. Deployed to DigitalOcean at `https://lobster-app-uy9hx.ondigitalocean.app`.

## Commands

```bash
# Local dev with watch
npm run start:dev

# Production build
npm run build
node dist/main        # or: npm run start:prod

# Tests
npm test                        # all unit tests
npm run test:watch              # watch mode
npm run test:cov                # with coverage
npx jest agenda.service.spec    # single spec file

# Lint + format
npm run lint
npm run format
```

## Environment variables

Required in `.env` (not committed):

```
MONGO_URI=
PORT=3000
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=
storageBucket=
```

## Architecture

### Module structure

Every domain follows the same NestJS module pattern:

```
src/<domain>/
  <domain>.module.ts       # registers MongooseModule.forFeature, imports, providers
  <domain>.controller.ts   # HTTP handlers, uses ResponseDto
  <domain>.service.ts      # business logic, calls findWithFilters
  schemas/<domain>.schema.ts
  interfaces/<domain>.interface.ts
  dto/create-<domain>.dto.ts
  dto/update-<domain>.dto.ts
```

All modules are registered in `src/app.module.ts`.

### Shared query engine: `findWithFilters<T>`

`src/common/common.service.ts` exports a single generic function used by virtually every service. It handles:

- Pagination via `current`/`pageSize` (Refine style) or `page`/`limit` (simple style).
- Direct filters from query params (any unknown key not in `knownProperties` is treated as a field filter; `*Id` fields are auto-converted to `ObjectId`).
- Structured filters via `filters[i][field/operator/value]` (sent by the CMS data provider). Operators: `eq`, `contains`, `startswith`, `endswith`, `gt`, `gte`, `lt`, `lte`, `ne`, `in`, `nin`.
- Populate (`populateFields`) and nested array populate (`nestedPopulate`) via MongoDB aggregation `$lookup`.
- Default sort: `{ createdAt: -1, _id: 1 }`.

When calling a service's search method, pass `PaginationDto` — all filter parsing happens inside `findWithFilters`.

### Response shapes

| Situation | Shape |
|---|---|
| Single item / mutation | `ResponseDto<T>` → `{ status, message, data? }` |
| List (CMS `getList`) | `{ data: { items, totalItems, totalPages, currentPage } }` |
| List (mobile `searchEvents` etc.) | `ResponseDto<{ items, totalItems, ... }>` → `{ status, message, data: { items, ... } }` |

`ResponseDto` is in `src/common/response.dto.ts`. Controllers decide which shape to return based on the endpoint.

### Push notifications

`src/notifications/notifications.service.ts` sends to the Expo Push API (`https://exp.host/--/api/v2/push/send`) in batches of 100. A `@Cron(EVERY_MINUTE)` job polls for `NotificationTemplate` documents where `scheduledAt <= now && isSent === false` and fires them automatically.

To trigger a template manually: `POST /notifications/send-from-template/:templateId` (the CMS uses this via the data provider's special `update` override).

### Firebase Admin

`src/config/firebase-admin.config.ts` initializes Firebase Admin for auth verification and Firebase Storage. File uploads land at `POST /upload` (handled by `src/utils/UploadController.ts` using Multer).

### Auth guard

`src/auth/guards/auth.guard.ts` — Firebase token verification. Applied selectively; not all routes are guarded.
