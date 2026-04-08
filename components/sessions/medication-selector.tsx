'use client'

import { useFieldArray, Control, UseFormSetValue } from 'react-hook-form'
import type { SessionFormData } from '@/lib/validations/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Medication { id: string; name: string; cost: number; sellingPrice: number }

export function MedicationSelector({ control, medications, setValue }: {
  control: Control<SessionFormData>
  medications: Medication[]
  setValue: UseFormSetValue<SessionFormData>
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medications' })

  function handleMedChange(index: number, medId: string) {
    setValue(`medications.${index}.medicationId`, medId)
    const med = medications.find(m => m.id === medId)
    if (med) {
      setValue(`medications.${index}.unitCost`, med.cost)
      setValue(`medications.${index}.sellingPrice`, med.sellingPrice)
    }
  }

  return (
    <div className="space-y-3">
      <Label>Medications Used</Label>
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-center gap-2">
          <Select onValueChange={(v: string | null) => v && handleMedChange(i, v)}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select medication…" /></SelectTrigger>
            <SelectContent>
              {medications.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Qty" className="w-20" {...control.register(`medications.${i}.quantity`, { valueAsNumber: true })} />
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs shrink-0" onClick={() => remove(i)}>✕</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm"
        onClick={() => append({ medicationId: '', quantity: 1, unitCost: 0, sellingPrice: 0 })}>
        + Add Medication
      </Button>
    </div>
  )
}
