import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface LowStockMed {
  id: string
  name: string
  stock: number
  threshold: number
}

export function LowStockList({ items }: { items: LowStockMed[] }) {
  if (items.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-orange-800">Low Stock Alerts ({items.length})</h2>
      <ul className="space-y-1">
        {items.map(med => (
          <li key={med.id} className="flex items-center justify-between text-sm">
            <Link href={`/inventory/${med.id}/edit`} className="hover:underline text-orange-700">{med.name}</Link>
            <span className="text-orange-600">
              {med.stock} / {med.threshold} <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">restock</Badge>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
