# Opening & Closing Balance on Dashboard

**Date:** 2026-04-20

## Goal

Display opening balance and closing balance on the dashboard, calculated relative to the selected date range. The opening balance is anchored to a fixed initial business amount stored in an environment variable; both values update as the date range changes.

## Formula

```
opening_balance = OPENING_BALANCE (env var, default 0)
                + SUM(revenue before range start)
                - SUM(inventory cost before range start)
                - SUM(restock expenses before range start)

closing_balance = opening_balance
                + revenue (within range)
                - inventory_cost (within range)
                - restock_expenses (within range)
```

Where:
- **revenue** = sum of `PatientSession.paymentAmount` (non-deleted)
- **inventory cost** = sum of `SessionMedication.quantity × unitCost` for non-deleted sessions
- **restock expenses** = sum of `Expense.amount` where `type = 'RESTOCK'`

Manual expenses (`type = 'MANUAL'`) are excluded from the balance calculation.

## Architecture

### Environment Variable

Add `OPENING_BALANCE` to `.env.local` (number, MMK). Defaults to `0` if not set.

```
OPENING_BALANCE=1000000
```

### Data Layer — `app/(protected)/dashboard/page.tsx`

Add one new entry to the existing `Promise.all`: a single `$queryRaw` that computes all three pre-range totals (revenue, inventory cost, restock expenses) for all records before `start`. This follows the same raw SQL pattern already used in the dashboard for `inventoryCostResult`.

Use two independent subqueries to avoid cross-product between sessions and expenses:

```sql
SELECT
  (SELECT COALESCE(SUM(ps."paymentAmount"), 0) FROM "PatientSession" ps WHERE ps.date < ${start} AND ps."deletedAt" IS NULL)::text AS revenue,
  (SELECT COALESCE(SUM(sm.quantity * sm."unitCost"), 0) FROM "SessionMedication" sm JOIN "PatientSession" ps ON ps.id = sm."sessionId" WHERE ps.date < ${start} AND ps."deletedAt" IS NULL)::text AS inventory_cost,
  (SELECT COALESCE(SUM(e.amount), 0) FROM "Expense" e WHERE e.date < ${start} AND e.type = 'RESTOCK')::text AS restock_cost
```

Compute in page:

```ts
const initialBalance = Number(process.env.OPENING_BALANCE ?? 0)
const openingBalance = initialBalance + preRangeRevenue - preRangeInventoryCost - preRangeRestockCost
const restockCostInRange = ... // add RESTOCK type to existing expense aggregate
const closingBalance = openingBalance + revenue - inventoryCost - restockCostInRange
```

The existing `expenseAgg` query currently filters `type: 'MANUAL'`. Add a parallel aggregate for RESTOCK expenses in the range, or extend the query to return both.

### Display — `components/dashboard/summary-cards.tsx`

Add `openingBalance` and `closingBalance` to the `Stats` interface.

Render two new cards **above** the existing four cards, in a visually distinct row:

- "Opening Balance" — neutral color (`text-gray-700`)
- "Closing Balance" — green if positive, red if negative

Both cards are non-expandable (no drill-down details). The existing four cards remain unchanged below.

Layout: balance cards span full width on mobile (2-col grid, each card takes 1 col), same grid on desktop as existing cards.

## Files Changed

| File | Change |
|------|--------|
| `.env.local` | Add `OPENING_BALANCE` variable |
| `app/(protected)/dashboard/page.tsx` | Add pre-range query, compute balances, pass to SummaryCards |
| `components/dashboard/summary-cards.tsx` | Add `openingBalance`/`closingBalance` to Stats, render two new cards |

No new files, no API routes, no migrations.

## Error Handling

- `OPENING_BALANCE` not set → default to `0`, no error
- No records before range start → pre-range totals are `0`, opening balance equals `OPENING_BALANCE`
- Negative closing balance → displayed in red (same pattern as existing net profit card)
