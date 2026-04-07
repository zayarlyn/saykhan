import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface NearExpiredItem {
  id: string
  medicationName: string
  restockBatchId: string
  quantity: number
  expiryDate: Date
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function NearExpiredList({ items }: { items: NearExpiredItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-yellow-800">Near-Expiry Alerts ({items.length})</h2>
      <ul className="space-y-1">
        {items.map(item => {
          const days = daysUntil(item.expiryDate)
          const expired = days < 0
          return (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <Link href={`/inventory/restock/${item.restockBatchId}`} className="hover:underline text-yellow-700">
                {item.medicationName}
              </Link>
              <span className="text-yellow-600 flex items-center gap-1.5">
                {item.expiryDate.toLocaleDateString()}
                <Badge
                  variant="outline"
                  className={expired
                    ? 'text-xs border-red-300 text-red-700'
                    : 'text-xs border-yellow-300 text-yellow-700'}
                >
                  {expired ? `${Math.abs(days)}d ago` : `${days}d left`}
                </Badge>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
