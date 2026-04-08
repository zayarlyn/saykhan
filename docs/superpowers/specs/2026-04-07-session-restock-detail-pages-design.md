# Session & Restock Detail Pages — Design Spec

**Date:** 2026-04-07

## Context

Sessions and restock batches are created but have no individual detail pages. Users can only see summary rows in list views. This spec covers adding read-only detail pages for both, an edit flow for sessions, a browsable restock history tab on the inventory page, and linking RESTOCK expenses to their restock detail page.

---

## Session Detail Page

### Route
`/sessions/[id]` — read-only view  
`/sessions/[id]/edit` — edit view

### Detail Page Layout

**Header row:** patient name (linked to `/patients/[id]`), service type, date, payment method, payment amount, **Edit** button → `/sessions/[id]/edit`

**Body:**
- Description (rendered only if present)
- Medications table: medication name | quantity | unit cost | selling price | line total (qty × selling price)
- Total at the bottom of the table

### Navigation to Detail

Session table rows (`components/sessions/session-table.tsx`) get an `onClick` handler → `router.push('/sessions/' + session.id)`. Currently rows have no click handler; the patient name column links to the patient page and stays as-is.

### Edit Page

Reuses the existing `SessionForm` component with `defaultValues` pre-filled from the fetched session.

**New API endpoint:** `PATCH /api/sessions/[id]`

The PATCH handler runs a transaction:
1. Fetch current session medications to know original stock deductions
2. Restore stock for each original `SessionMedication` (increment)
3. Delete all original `SessionMedication` records
4. Validate new medication stock availability
5. Create new `SessionMedication` records
6. Deduct stock for each new medication (decrement)
7. Update the `PatientSession` fields (patientId, serviceTypeId, paymentMethodId, date, description, paymentAmount)

### Existing API
`GET /api/sessions/[id]` — already exists, returns full session with relations.

---

## Restock Detail Page

### Route
`/inventory/restock/[id]` — read-only, no edit (restocks are immutable once committed to stock)

### Detail Page Layout

**Header:** date of restock batch

**Items table:** medication name | quantity | cost per unit | expiry date | line total (qty × cost/unit)

**Footer:** total cost (sum of all line totals), linked expense amount

### New API endpoints

`GET /api/restock` — list all restock batches, ordered by date descending  
Response: `{ id, date, createdAt, _count: { items }, expense: { totalAmount } }[]`

`GET /api/restock/[id]` — single batch with full items  
Response: `{ id, date, items: [{ id, medication: { name }, quantity, costPerUnit, expiryDate }], expense: { totalAmount } }`

---

## Restock History Tab (Inventory Page)

Add a **"Restocks"** tab to `/inventory` alongside the existing medications tab.

**Restocks tab table columns:** Date | Items (count) | Total Cost | (link icon to detail)

Each row links to `/inventory/restock/[id]`.

Data loaded server-side in the existing inventory page using the new `GET /api/restock` endpoint (or direct Prisma query since it's a server component).

---

## Expenses → Restock Linking

In the expenses table (`components/expenses/expense-table.tsx`), RESTOCK-type expense rows get a "View Restock" link using `expense.restockBatchId` → `/inventory/restock/[restockBatchId]`.

The expenses API (`GET /api/expenses`) must include `restockBatchId` in its response. Verify this is already selected; if not, add it to the Prisma query select/include.

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/(protected)/sessions/[id]/page.tsx` | Session detail (read-only) |
| `app/(protected)/sessions/[id]/edit/page.tsx` | Session edit form |
| `app/api/sessions/[id]/route.ts` | Add PATCH handler |
| `app/(protected)/inventory/restock/[id]/page.tsx` | Restock detail (read-only) |
| `app/api/restock/[id]/route.ts` | GET single restock batch |
| `app/api/restock/route.ts` | Add GET list handler |

## Files to Modify

| File | Change |
|------|--------|
| `components/sessions/session-table.tsx` | Add row onClick → `/sessions/[id]` |
| `app/(protected)/inventory/page.tsx` | Add Restocks tab |
| `components/expenses/expense-table.tsx` | Add "View Restock" link for RESTOCK expenses |
| `app/api/expenses/route.ts` | Ensure `restockBatchId` is included in response |

---

## Verification

1. Sessions list → click a row → detail page loads with all session data
2. Detail page → Edit button → form pre-filled → save → PATCH API updates session + stock → redirect to detail
3. Inventory page → Restocks tab → list of batches → click row → restock detail page
4. Expenses page → RESTOCK expense → "View Restock" link → restock detail page
