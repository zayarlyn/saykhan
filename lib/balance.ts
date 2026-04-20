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
