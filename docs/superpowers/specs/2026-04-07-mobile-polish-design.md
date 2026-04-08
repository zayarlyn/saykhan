# Mobile Polish & Calendar — Design Spec

**Date:** 2026-04-07

## Context

Three UX gaps to address: (1) mobile users have no way to log out — the sidebar sign-out button is desktop-only, (2) the inline tables on detail pages (session medications, restock items) have no mobile-friendly layout, (3) all date/time inputs use native HTML5 pickers which are inconsistent across platforms and unstyled — replace with a shadcn Calendar component.

---

## 1. Logout on Mobile

**Where:** `app/(protected)/settings/page.tsx` — add a "Sign Out" button at the bottom, visible only on mobile (`md:hidden`). Desktop already has it in the sidebar.

**Implementation:** The settings page is a server component, so logout requires a small client component.

- Create `components/layout/sign-out-button.tsx` — a `'use client'` button that POSTs to `/api/auth/logout` then calls `router.push('/login')`. Same logic as the sidebar's `handleLogout`.
- Render `<SignOutButton />` at the bottom of the settings page wrapped in `<div className="md:hidden pt-4"><Separator /><SignOutButton /></div>`.

---

## 2. Responsive Inline Tables

The detail pages have desktop-only tables with no mobile fallback. Add mobile card layouts (same pattern used everywhere else in the app: `md:hidden` cards + `hidden md:block` table).

### Session detail — medications table (`app/(protected)/sessions/[id]/page.tsx`)

Mobile cards show: medication name, qty × unit price, subtotal. Total card at bottom.

### Restock detail — items table (`app/(protected)/inventory/restock/[id]/page.tsx`)

Mobile cards show: medication name, qty, cost/unit, expiry date (or —), subtotal. Total card at bottom.

---

## 3. Calendar / Date Picker Components

Replace all native `<input type="date">` and `<input type="datetime-local">` with styled shadcn-style popovers.

### Dependencies

Install `react-day-picker` (shadcn Calendar peer dependency).

### New components

**`components/ui/calendar.tsx`** — Standard shadcn Calendar component wrapping `react-day-picker`'s `DayPicker`. Accepts standard DayPicker props. Used internally by the pickers below.

**`components/ui/date-picker.tsx`** — `DatePicker` component:
- Props: `value: Date | undefined`, `onChange: (date: Date | undefined) => void`, `placeholder?: string`
- Renders a Button trigger showing the formatted date (or placeholder)
- Opens a Popover containing a Calendar
- Output: JS `Date` object

**`components/ui/datetime-picker.tsx`** — `DateTimePicker` component:
- Props: `value: Date | undefined`, `onChange: (date: Date | undefined) => void`, `placeholder?: string`
- Extends DatePicker with a time input (`<input type="time">`) below the calendar inside the popover
- When a date is selected, preserves the current time; when time changes, preserves the current date
- Output: JS `Date` object with both date and time set

### Form updates

All three forms use React Hook Form. The pickers are uncontrolled relative to RHF — use `setValue` + `watch` pattern (same as the existing `Select` components in the app).

| Form | Field | Picker |
|------|-------|--------|
| `components/sessions/session-form.tsx` | `date` | `DateTimePicker` |
| `components/inventory/restock-form.tsx` | `date` (batch) | `DateTimePicker` |
| `components/inventory/restock-form.tsx` | `expiryDate` (per item) | `DatePicker` |
| `components/expenses/expense-form.tsx` | `date` | `DatePicker` |

The Zod schemas for these forms accept `string` (ISO string) for dates. The pickers output `Date` objects, so the `onChange` handler converts: `setValue('date', date.toISOString())`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `components/layout/sign-out-button.tsx` | Client component for mobile logout |
| `components/ui/calendar.tsx` | shadcn Calendar (react-day-picker wrapper) |
| `components/ui/date-picker.tsx` | Date-only picker (Popover + Calendar) |
| `components/ui/datetime-picker.tsx` | Date + time picker (Popover + Calendar + time input) |

## Files to Modify

| File | Change |
|------|--------|
| `app/(protected)/settings/page.tsx` | Add `<SignOutButton>` at bottom, mobile-only |
| `app/(protected)/sessions/[id]/page.tsx` | Add mobile card layout for medications table |
| `app/(protected)/inventory/restock/[id]/page.tsx` | Add mobile card layout for items table |
| `components/sessions/session-form.tsx` | Replace `datetime-local` input with `DateTimePicker` |
| `components/inventory/restock-form.tsx` | Replace date inputs with `DateTimePicker` / `DatePicker` |
| `components/expenses/expense-form.tsx` | Replace `date` input with `DatePicker` |
| `package.json` / `package-lock.json` | Add `react-day-picker` |

## Verification

1. Mobile: navigate to `/settings` → "Sign Out" button visible → tapping logs out and redirects to `/login`
2. Desktop: `/settings` page shows no sign-out button (sidebar already has it)
3. `/sessions/[id]` on narrow viewport → medications shown as cards
4. `/inventory/restock/[id]` on narrow viewport → items shown as cards
5. Session form, restock form, expense form → date fields open a calendar popover with styled picker
6. Selecting date+time in session form → correct ISO string submitted to API
