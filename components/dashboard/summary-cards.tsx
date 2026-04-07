interface Stats {
  revenue: number
  inventoryCost: number
  adjustedExpenses: number
  netProfit: number
}

export function SummaryCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Revenue', value: stats.revenue, color: 'text-green-600' },
    { label: 'Inventory Cost', value: stats.inventoryCost, color: 'text-blue-600' },
    { label: 'Adjusted Expenses', value: stats.adjustedExpenses, color: 'text-orange-600' },
    { label: 'Net Profit', value: stats.netProfit, color: stats.netProfit >= 0 ? 'text-green-700' : 'text-red-600' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white border rounded-lg p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{Number(card.value).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
