'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function RestockDeleteButton({ restockId }: { restockId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this restock batch? This will decrement medication stock accordingly.')) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/restock/${restockId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/inventory?tab=restocks')
      } else {
        setError('Failed to delete restock batch')
      }
    } catch (err) {
      setError('An error occurred while deleting')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleDelete}
        disabled={isLoading}
        variant="destructive"
        size="sm"
        className="gap-2"
      >
        <Trash2 className="size-4" />
        {isLoading ? 'Deleting...' : 'Delete'}
      </Button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}
