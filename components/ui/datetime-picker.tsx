'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time' }: DateTimePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? formatDateTime(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(day) => {
            if (!day) { onChange(undefined); return }
            const next = new Date(day)
            // preserve current time if value already set
            if (value) {
              next.setHours(value.getHours(), value.getMinutes(), 0, 0)
            }
            onChange(next)
          }}
          initialFocus
        />
        <div className="border-t p-3">
          <input
            type="time"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={value ? toTimeString(value) : ''}
            onChange={(e) => {
              if (!e.target.value) return
              const parts = e.target.value.split(':')
              const hours = Number(parts[0])
              const minutes = Number(parts[1])
              if (isNaN(hours) || isNaN(minutes)) return
              const next = value ? new Date(value) : new Date()
              next.setHours(hours, minutes, 0, 0)
              onChange(next)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
