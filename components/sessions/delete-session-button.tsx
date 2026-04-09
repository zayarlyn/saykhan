'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeleteDialog } from '@/components/ui/delete-dialog'

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
	const router = useRouter()
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	async function handleDeleteConfirm() {
		const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
		if (res.ok) router.push('/sessions')
	}

	return (
		<>
			<Button variant='destructive' size='sm' onClick={() => setDeleteDialogOpen(true)}>
				Delete
			</Button>

			<DeleteDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title='Delete session'
				description='This session will be permanently deleted and medication stock will be restored. This action cannot be undone.'
				onConfirm={handleDeleteConfirm}
			/>
		</>
	)
}
