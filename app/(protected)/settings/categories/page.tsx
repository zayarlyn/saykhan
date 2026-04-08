import { prisma } from '@/lib/prisma'
import { LookupManager } from '@/components/settings/lookup-manager'
import { Separator } from '@/components/ui/separator'
import { BackButton } from '@/components/layout/back-button'

export default async function CategoriesSettingsPage() {
  const [medCategories, serviceTypes, paymentMethods, expenseCategories] = await Promise.all([
    prisma.medicationCategory.findMany({ orderBy: { name: 'asc' } }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <BackButton label="Settings" />
      <h1 className="text-2xl font-bold">Manage Categories</h1>
      <LookupManager label="Medication Categories" entity="medication-category" initial={medCategories} />
      <Separator />
      <LookupManager label="Service Types" entity="service-type" initial={serviceTypes} />
      <Separator />
      <LookupManager label="Payment Methods" entity="payment-method" initial={paymentMethods} />
      <Separator />
      <LookupManager label="Expense Categories" entity="expense-category" initial={expenseCategories} />
    </div>
  )
}
