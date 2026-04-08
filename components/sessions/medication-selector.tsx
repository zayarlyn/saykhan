'use client'

import { useFieldArray, Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Medication { id: string; name: string; cost: number; sellingPrice: number }

export function MedicationSelector({ control, medications, setValue }: {
  control: Control<any>
  medications: Medication[]
  setValue: any
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
        <div key={field.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => remove(i)}>Remove</Button>
          </div>
          <Select onValueChange={(v: string | null) => v && handleMedChange(i, v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select medication…" /></SelectTrigger>
            <SelectContent>
              {medications.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Qty</Label>
              <Input type="number" placeholder="Quantity" {...control.register(`medications.${i}.quantity`, { valueAsNumber: true })} />
            </div>
            <div>
              <Label className="text-xs">Unit Cost</Label>
              <Input type="number" step="0.01" placeholder="Cost" {...control.register(`medications.${i}.unitCost`, { valueAsNumber: true })} />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm"
        onClick={() => append({ medicationId: '', quantity: 1, unitCost: 0, sellingPrice: 0 })}>
        + Add Medication
      </Button>
    </div>
  )
}
