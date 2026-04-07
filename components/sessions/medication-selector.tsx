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
        <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
          <div>
            <Select onValueChange={v => handleMedChange(i, v)}>
              <SelectTrigger><SelectValue placeholder="Select med…" /></SelectTrigger>
              <SelectContent>
                {medications.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input type="number" placeholder="Qty" {...control.register(`medications.${i}.quantity`, { valueAsNumber: true })} />
          </div>
          <div>
            <Input type="number" step="0.01" placeholder="Unit cost" {...control.register(`medications.${i}.unitCost`, { valueAsNumber: true })} />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm"
        onClick={() => append({ medicationId: '', quantity: 1, unitCost: 0, sellingPrice: 0 })}>
        + Add Medication
      </Button>
    </div>
  )
}
