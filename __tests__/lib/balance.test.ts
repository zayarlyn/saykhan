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
