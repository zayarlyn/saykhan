# Saykhan — Clinic Management

A full-stack clinic management system for tracking patients, medical sessions, medications, inventory, and expenses.

## Tech Stack

- **Framework**: Next.js 16 (App Router, server components)
- **Database**: PostgreSQL via Prisma 7 with `@prisma/adapter-pg`
- **Auth**: iron-session (encrypted HTTP-only cookie, single admin user)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Base UI
- **Forms**: React Hook Form + Zod
- **Testing**: Jest + ts-jest

## Features

- **Dashboard** — monthly revenue, inventory cost, net profit summary; low-stock and near-expiry alerts; month navigation
- **Sessions** — patient visit records with service type, payment method, medications dispensed, and stock deduction
- **Patients** — patient profiles with session history
- **Inventory** — medication catalog with stock levels, restock batches, expiry tracking, and low-stock alerts
- **Expenses** — manual expense tracking; restock expenses auto-created from restock batches
- **Settings** — clinic name, medication categories, service types, payment methods, expense categories

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted, e.g. Supabase)

### Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

Create `.env.local`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/saykhan
SESSION_SECRET=<min-32-char-random-string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>
```

Generate a password hash:

```bash
npx -y bcryptjs-cli hash "your-password"
```

3. **Run migrations and seed lookup data**

```bash
npx prisma migrate deploy
npx prisma db seed
```

4. **Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your admin credentials.

### Demo data

To seed sample data for demo/testing:

```bash
npx tsx prisma/seed-demo.ts          # seed if not already seeded
npx tsx prisma/seed-demo.ts --reset  # wipe and reseed
```

## Development

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint
npm test         # Jest tests
```

### Database

```bash
npx prisma migrate dev --name <name>   # create and apply a migration
npx prisma studio                       # open Prisma Studio GUI
```

### Project Structure

```
app/
├── (auth)/login          — login page (public)
├── (protected)/          — all pages require auth
│   ├── dashboard         — monthly summary + alerts
│   ├── sessions          — patient sessions + patients tab
│   ├── inventory         — medications + restock batches
│   ├── expenses          — expense list + manual entry
│   └── settings/         — general, categories sub-pages
├── api/                  — API routes (auth, patients, sessions, medications, expenses, restock, settings, clinic-config)
└── layout.tsx            — root layout with navigation progress bar

components/
├── auth/                 — login form
├── layout/               — sidebar, bottom nav, back button, navigation progress
├── dashboard/            — summary cards, low-stock list, near-expiry list, month nav
├── sessions/             — session form, table, tabs, medication selector
├── inventory/            — medication form/table, restock form, inventory tabs
├── expenses/             — expense form, table
├── patients/             — patient table
├── settings/             — lookup manager, clinic name form
└── ui/                   — shared primitives (button, input, select, date picker, pagination, …)

lib/
├── prisma.ts             — Prisma singleton with PG adapter
├── session.ts            — iron-session config
├── clinic-config.ts      — getClinicName() utility
└── validations/          — Zod schemas

prisma/
├── schema.prisma         — data model
├── seed.ts               — lookup table seed
├── seed-demo.ts          — demo data seed
└── migrations/           — migration history
```
