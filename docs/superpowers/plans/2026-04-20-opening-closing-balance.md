# Opening & Closing Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display opening and closing balance on the dashboard, calculated from a fixed initial balance (env var) plus cumulative transactions relative to the selected date range.

**Architecture:** Extract pure balance calculation into a testable `lib/balance.ts` utility. Add one pre-range aggregate SQL query to the dashboard page's existing `Promise.all`. Pass computed balances into `SummaryCards` as two new display-only cards rendered above the existing four.

**Tech Stack:** Next.js 16.2.2 server components, Prisma `$queryRaw`, TypeScript, Jest (ts-jest), Tailwind CSS, shadcn UI

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `.env.local` | Modify | Add `OPENING_BALANCE` env var |
| `lib/balance.ts` | Create | Pure `computeBalances` function |
| `__tests__/lib/balance.test.ts` | Create | Unit tests for `computeBalances` |
| `app/(protected)/dashboard/page.tsx` | Modify | Pre-range query + call computeBalances + pass to SummaryCards |
| `components/dashboard/summary-cards.tsx` | Modify | Add `openingBalance`/`closingBalance` to Stats + two new cards |

---

## Task 1: Add OPENING_BALANCE to .env.local

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add the env var**

Open `.env.local` and add:

```
OPENING_BALANCE=0
```

Set to your actual starting business capital (e.g. `1000000`). Defaults to `0` if unset.

- [ ] **Step 2: Commit**

```bash
git add .env.local
git commit -m "chore: add OPENING_BALANCE env var"
```

---

## Task 2: Create computeBalances utility with tests

**Files:**
- Create: `lib/balance.ts`
- Create: `__tests__/lib/balance.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/balance.test.ts`:

```ts
import { computeBalances } from '@/lib/balance'

describe('computeBalances', () => {
  it('returns initial balance as opening when no pre-range data', () => {
    const result = computeBalances({
      initialBalance: 1_000_000,
      preRevenue: 0,
      preInventoryCost: 0,
      preRestockCost: 0,
      inRevenue: 0,
      inInventoryCost: 0,
      inRestockCost: 0,
    })
    expect(result.openingBalance).toBe(1_000_000)
    expect(result.closingBalance).toBe(1_000_000)
  })

  it('computes opening balance from pre-range transactions', () => {
    const result = computeBalances({
      initialBalance: 1_000_000,
      preRevenue: 500_000,
      preInventoryCost: 100_000,
      preRestockCost: 50_000,
      inRevenue: 0,
      inInventoryCost: 0,
      inRestockCost: 0,
    })
    // opening = 1_000_000 + 500_000 - 100_000 - 50_000 = 1_350_000
    expect(result.openingBalance).toBe(1_350_000)
    expect(result.closingBalance).toBe(1_350_000)
  })

  it('computes closing balance from in-range transactions', () => {
    const result = computeBalances({
      initialBalance: 1_000_000,
      preRevenue: 0,
      preInventoryCost: 0,
      preRestockCost: 0,
      inRevenue: 200_000,
      inInventoryCost: 30_000,
      inRestockCost: 20_000,
    })
    // closing = 1_000_000 + 200_000 - 30_000 - 20_000 = 1_150_000
    expect(result.openingBalance).toBe(1_000_000)
    expect(result.closingBalance).toBe(1_150_000)
  })

  it('handles negative closing balance', () => {
    const result = computeBalances({
      initialBalance: 0,
      preRevenue: 0,
      preInventoryCost: 0,
      preRestockCost: 0,
      inRevenue: 0,
      inInventoryCost: 100_000,
      inRestockCost: 50_000,
    })
    expect(result.closingBalance).toBe(-150_000)
  })

  it('defaults initialBalance to 0 when not provided', () => {
    const result = computeBalances({
      preRevenue: 100_000,
      preInventoryCost: 0,
      preRestockCost: 0,
      inRevenue: 0,
      inInventoryCost: 0,
      inRestockCost: 0,
    })
    expect(result.openingBalance).toBe(100_000)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/balance.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/balance'"

- [ ] **Step 3: Create lib/balance.ts**

```ts
interface BalanceInput {
  initialBalance?: number
  preRevenue: number
  preInventoryCost: number
  preRestockCost: number
  inRevenue: number
  inInventoryCost: number
  inRestockCost: number
}

export function computeBalances(input: BalanceInput): { openingBalance: number; closingBalance: number } {
  const { initialBalance = 0, preRevenue, preInventoryCost, preRestockCost, inRevenue, inInventoryCost, inRestockCost } = input
  const openingBalance = initialBalance + preRevenue - preInventoryCost - preRestockCost
  const closingBalance = openingBalance + inRevenue - inInventoryCost - inRestockCost
  return { openingBalance, closingBalance }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/balance.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/balance.ts __tests__/lib/balance.test.ts
git commit -m "feat: add computeBalances utility with tests"
```

---

## Task 3: Add pre-range query and balance computation to dashboard page

**Files:**
- Modify: `app/(protected)/dashboard/page.tsx`

- [ ] **Step 1: Read the current dashboard page**

File: `app/(protected)/dashboard/page.tsx`

Note the existing `Promise.all` at line 23. You will add a new entry to it.

- [ ] **Step 2: Add import for computeBalances**

At the top of `app/(protected)/dashboard/page.tsx`, add:

```ts
import { computeBalances } from '@/lib/balance'
```

- [ ] **Step 3: Add pre-range query to Promise.all**

The existing `Promise.all` at line 23 destructures 5 values. Add a 6th:

Replace:
```ts
const [revenueAgg, inventoryCostResult, expenseAgg, lowStockMeds, nearExpiredItems] = await Promise.all([
```

With:
```ts
const [revenueAgg, inventoryCostResult, expenseAgg, lowStockMeds, nearExpiredItems, preRangeResult] = await Promise.all([
```

Then append this entry inside the `Promise.all([...])` array, after `nearExpiredItems`:

```ts
    // Pre-range totals for opening balance calculation
    prisma.$queryRaw<[{ revenue: string; inventory_cost: string; restock_cost: string }]>`
      SELECT
        (SELECT COALESCE(SUM(ps."paymentAmount"), 0) FROM "PatientSession" ps WHERE ps.date < ${start} AND ps."deletedAt" IS NULL)::text AS revenue,
        (SELECT COALESCE(SUM(sm.quantity * sm."unitCost"), 0) FROM "SessionMedication" sm JOIN "PatientSession" ps ON ps.id = sm."sessionId" WHERE ps.date < ${start} AND ps."deletedAt" IS NULL)::text AS inventory_cost,
        (SELECT COALESCE(SUM(e.amount), 0) FROM "Expense" e WHERE e.date < ${start} AND e.type = 'RESTOCK')::text AS restock_cost
    `,
```

- [ ] **Step 4: Add in-range restock expense aggregate**

The existing `expenseAgg` only sums `type: 'MANUAL'` expenses. Add a separate aggregate for in-range RESTOCK expenses inside the same `Promise.all`:

Replace:
```ts
const [revenueAgg, inventoryCostResult, expenseAgg, lowStockMeds, nearExpiredItems, preRangeResult] = await Promise.all([
```

With:
```ts
const [revenueAgg, inventoryCostResult, expenseAgg, restockExpenseAgg, lowStockMeds, nearExpiredItems, preRangeResult] = await Promise.all([
```

Add this entry after the existing `expenseAgg` entry:

```ts
    // In-range restock expenses for closing balance
    prisma.expense.aggregate({
      where: { date: { gte: start, lte: end }, type: 'RESTOCK' },
      _sum: { amount: true },
    }),
```

- [ ] **Step 5: Compute balances after the Promise.all**

After the existing stats extraction block (after line 62 `const netProfit = ...`), add:

```ts
const initialBalance = Number(process.env.OPENING_BALANCE ?? 0)
const inRestockCost = Number(restockExpenseAgg._sum.amount ?? 0)
const { openingBalance, closingBalance } = computeBalances({
  initialBalance,
  preRevenue: Number(preRangeResult[0].revenue),
  preInventoryCost: Number(preRangeResult[0].inventory_cost),
  preRestockCost: Number(preRangeResult[0].restock_cost),
  inRevenue: revenue,
  inInventoryCost: inventoryCost,
  inRestockCost,
})
```

- [ ] **Step 6: Pass balances to SummaryCards**

Find the `<SummaryCards stats={{...}} />` JSX and add the two new props:

```tsx
<SummaryCards stats={{
  revenue, inventoryCost, adjustedExpenses, netProfit,
  sessionCount, maxSessionAmount, newPatientCount,
  uniqueMedCount,
  topExpenseCategory,
  openingBalance,
  closingBalance,
}} />
```

- [ ] **Step 7: Commit**

```bash
git add app/\(protected\)/dashboard/page.tsx
git commit -m "feat: compute opening and closing balance on dashboard"
```

---

## Task 4: Update SummaryCards to display balance cards

**Files:**
- Modify: `components/dashboard/summary-cards.tsx`

- [ ] **Step 1: Read the current SummaryCards component**

File: `components/dashboard/summary-cards.tsx`

Note the `Stats` interface at line 7 and the `cards` array at line 22.

- [ ] **Step 2: Add openingBalance and closingBalance to Stats interface**

Replace:
```ts
interface Stats {
  revenue: number
  inventoryCost: number
  adjustedExpenses: number
  netProfit: number
  sessionCount: number
  maxSessionAmount: number
  newPatientCount: number
  uniqueMedCount: number
  topExpenseCategory: [string, number] | null
}
```

With:
```ts
interface Stats {
  revenue: number
  inventoryCost: number
  adjustedExpenses: number
  netProfit: number
  sessionCount: number
  maxSessionAmount: number
  newPatientCount: number
  uniqueMedCount: number
  topExpenseCategory: [string, number] | null
  openingBalance: number
  closingBalance: number
}
```

- [ ] **Step 3: Add balance cards and restructure layout**

Replace the entire `return` block:

```tsx
return (
  <div className='space-y-4'>
    <div className='grid grid-cols-2 gap-4'>
      {[
        {
          label: 'Opening Balance',
          value: stats.openingBalance,
          color: 'text-gray-700',
        },
        {
          label: 'Closing Balance',
          value: stats.closingBalance,
          color: stats.closingBalance >= 0 ? 'text-green-700' : 'text-red-600',
        },
      ].map((card) => (
        <div key={card.label} className='bg-white border rounded-lg p-4 space-y-1'>
          <p className='text-xs text-gray-500 uppercase tracking-wide leading-tight'>{card.label}</p>
          <p className={`text-lg sm:text-2xl font-bold ${card.color} break-words`}>{Number(card.value).toLocaleString()}</p>
        </div>
      ))}
    </div>

    <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
      {cards.map((card) => {
        const isExpanded = expanded === card.label
        const hasDetails = card.details !== null

        return (
          <div
            key={card.label}
            className={cn('bg-white border rounded-lg p-4 space-y-1', hasDetails && 'cursor-pointer select-none', isExpanded && 'ring-1 ring-gray-200')}
            onClick={() => hasDetails && setExpanded(isExpanded ? null : card.label)}
          >
            <div className='flex items-center justify-between gap-1'>
              <p className='text-xs text-gray-500 uppercase tracking-wide leading-tight'>{card.label}</p>
              {hasDetails && <ChevronDown className={cn('size-3.5 text-gray-400 shrink-0 transition-transform', isExpanded && 'rotate-180')} />}
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${card.color} break-words`}>{Number(card.value).toLocaleString()}</p>

            {isExpanded && card.details && (
              <div className='pt-2 border-t space-y-1'>
                {card.details.map((d) => (
                  <div key={d.label} className='flex items-center justify-between text-xs gap-2'>
                    <span className='text-gray-500'>{d.label}</span>
                    <span className='font-medium text-gray-700 text-right break-words'>{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/summary-cards.tsx
git commit -m "feat: add opening and closing balance cards to dashboard"
```

---

## Task 5: Verify build and test

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass including the 5 new balance tests

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. If TypeScript errors appear, they will be about the new `openingBalance`/`closingBalance` props on `SummaryCards` — fix by ensuring Task 3 Step 6 and Task 4 Step 2 are applied correctly.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000/dashboard. Verify:
- Two new cards appear at the top: "Opening Balance" and "Closing Balance"
- Switch date ranges (today, this month, last month) — values should change as the pre-range window shifts
- Closing balance turns red if negative

---

## Self-Review

**Spec coverage:**
- ✅ Fixed initial balance from env var → Task 1 + Task 3 Step 5 (`process.env.OPENING_BALANCE`)
- ✅ Opening balance = initial + cumulative pre-range (revenue - inventory cost - restock) → `computeBalances` in Task 2
- ✅ Closing balance = opening + in-range delta → `computeBalances` in Task 2
- ✅ Pre-range query uses independent subqueries (no cross-product) → Task 3 Step 3
- ✅ RESTOCK expenses included, MANUAL excluded from balance → Task 3 Steps 3 & 4
- ✅ Two new cards above existing four → Task 4 Step 3
- ✅ Closing balance red when negative → Task 4 Step 3

**Placeholder scan:** No TBDs, no vague steps, all code blocks complete.

**Type consistency:**
- `computeBalances` defined in Task 2, imported in Task 3 Step 2 ✓
- `openingBalance`/`closingBalance` added to `Stats` in Task 4 Step 2, passed in Task 3 Step 6 ✓
- `preRangeResult[0].revenue` / `inventory_cost` / `restock_cost` match SQL column aliases in Task 3 Step 3 ✓
- `restockExpenseAgg` destructured in Task 3 Step 4, used in Task 3 Step 5 ✓
