# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

**Common commands:**
- `npm run dev` — Start development server (http://localhost:3000)
- `npm run build` — Create production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm test` — Run tests (Jest with ts-jest)
- `npx prisma migrate dev` — Create and apply database migrations
- `npx prisma studio` — Open Prisma Studio GUI for database inspection

## Project Overview

**saykhan** is a Next.js 16.2.2 clinic management system for tracking patients, medical sessions, medications, expenses, and inventory. It uses:
- **Frontend**: React 19 with TypeScript, Tailwind CSS, shadcn components
- **Backend**: Next.js App Router with server components and API routes
- **Database**: PostgreSQL via Prisma 7.6.0 with PrismaPg adapter
- **Auth**: iron-session (encrypted HTTP-only cookies, single admin user)
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS 4 with PostCSS

**Important**: This is Next.js 16.2.2, which may have breaking changes from your training data. Always check `node_modules/next/dist/docs/` before writing code and heed deprecation notices (see AGENTS.md).

## Architecture

### App Structure

```
app/
├── (auth)/login          — Login page (public)
├── (protected)/          — All pages require auth via middleware
│   ├── dashboard         — Main overview
│   ├── patients          — Patient management
│   ├── sessions          — Patient session records
│   ├── expenses          — Expense tracking
│   ├── inventory         — Medication inventory
│   └── settings          — Configuration (categories, service types, payment methods)
├── api/
│   ├── auth/             — Login/logout endpoints (protected by middleware)
│   ├── patients/         — CRUD endpoints
│   ├── sessions/         — Session endpoints
│   ├── expenses/         — Expense endpoints
│   ├── medications/      — Medication endpoints
│   ├── settings/         — Settings endpoints
│   ├── dashboard/        — Dashboard stats
│   └── restock/          — Inventory restocking
├── layout.tsx            — Root layout with fonts and global styles
└── globals.css           — Global Tailwind styles

lib/
├── session.ts            — iron-session config with SessionData interface
├── prisma.ts             — Prisma singleton with PG adapter and logging
└── validations/          — Zod schemas (patient, medication, session, expense, restock, settings)

components/
├── layout/               — Sidebar, navigation
├── ui/                   — shadcn UI components
└── [feature]/            — Feature-specific components

middleware.ts            — Protects routes, redirects unauth'd to /login

prisma/
├── schema.prisma         — Data model with migrations
└── migrations/           — Migration history
```

### Data Model

Core entities: **Patient** → **PatientSession** → **SessionMedication**
- Each session records a patient's visit with service type, payment, and medications dispensed
- **Medication**: Categories, cost, selling price, stock level, restock threshold
- **Expense**: Manual or RESTOCK type, tied to restock batches
- **Settings**: Lookup tables (MedicationCategory, ServiceType, PaymentMethod, ExpenseCategory)

### Authentication & Authorization

- **Single admin user**: Credentials in `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` env vars
- **iron-session**: Encrypted cookie (SESSION_SECRET), 7-day expiry, HttpOnly, secure in production
- **middleware.ts**: Protects `/api/*` and protected pages; redirects unauth'd users to `/login`
- No per-user auth scopes — treat all authenticated requests as admin

### API Pattern

All route handlers:
1. Extract and validate request body with Zod schema
2. Return 400 if validation fails with error details
3. Use Prisma for DB operations
4. Return 201 for POST, 200 for others, 404 if resource not found
5. Protected by middleware (middleware checks session before route handler runs)

## Database Setup

PostgreSQL required. Set `DATABASE_URL` env var.

- **Prisma adapter**: Uses `@prisma/adapter-pg` with Node.js `pg` pool for better connection handling
- **Logging**: Enabled in development (`NODE_ENV === 'development'`)
- **Singleton pattern**: `lib/prisma.ts` prevents multiple client instances

**Running migrations:**
- `npx prisma migrate dev --name <name>` — Create and apply migration
- `npx prisma migrate deploy` — Apply pending migrations (CI/production)
- `npx prisma studio` — GUI for browsing/editing data

## Testing

**Jest configuration** (`jest.config.ts`):
- Tests in `__tests__/**/*.test.ts` (Node environment)
- ts-jest for TypeScript
- JSX enabled
- Path alias support (`@/` maps to root)
- Setup file: `jest.setup.ts` (loads env vars and testing-library)

**Running tests:**
- `npm test` — All tests
- `npm test -- <file>` — Specific test file
- `npm test -- --watch` — Watch mode

## Environment Variables

Create `.env.local` (gitignored):
```
DATABASE_URL=postgresql://user:password@localhost:5432/saykhan
SESSION_SECRET=<min-32-char-random-string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>
```

Generate password hash: `npx -y bcryptjs-cli hash "your-password"`

## Key Files to Know

- `middleware.ts` — Auth guard for all routes
- `lib/session.ts` — SessionData interface and iron-session config
- `lib/prisma.ts` — Prisma client with PG adapter and logging
- `prisma/schema.prisma` — Single source of truth for data model
- `jest.setup.ts` — Loads test env vars from `.env.local`
- `app/api/auth/login/route.ts` — Authentication endpoint (uses bcrypt timing-safe comparison)

## Linting

`npm run lint` runs ESLint (Next.js config). No auto-fix by default; fix issues in your editor or add `-- --fix`.

## Production Considerations

- Cookies marked `secure` only in production (NODE_ENV === 'production')
- Disable Prisma query logging in production
- All authenticated routes require valid iron-session cookie
- Single admin account — no user management UI
