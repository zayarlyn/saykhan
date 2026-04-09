'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	onConfirm: () => Promise<void>
	isLoading?: boolean
}

export function DeleteDialog({ open, onOpenChange, title, description, onConfirm, isLoading = false }: DeleteDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false)

	async function handleConfirm() {
		setIsDeleting(true)
		try {
			await onConfirm()
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting || isLoading}>Cancel</AlertDialogCancel>
					<Button variant='destructive' onClick={handleConfirm} disabled={isDeleting || isLoading}>
						{isDeleting || isLoading ? 'Deleting…' : 'Delete'}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
