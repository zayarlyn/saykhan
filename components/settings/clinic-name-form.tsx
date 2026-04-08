'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ClinicNameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    const res = await fetch('/api/clinic-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicName: name }),
    })
    setStatus(res.ok ? 'saved' : 'error')
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-medium text-gray-700">Clinic Name</h2>
      <div className="flex gap-2 max-w-sm">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter clinic name"
          maxLength={100}
        />
        <Button type="submit" disabled={status === 'saving' || !name.trim()}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save'}
        </Button>
      </div>
      {status === 'error' && <p className="text-sm text-red-500">Failed to save. Try again.</p>}
    </form>
  )
}
