export function resolveRange(preset: string | undefined, from: string | undefined, to: string | undefined) {
	const now = new Date()
	const today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }

	if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
		return {
			start: new Date(from + 'T00:00:00'),
			end: new Date(to + 'T23:59:59'),
			activePreset: 'custom' as const,
		}
	}

	switch (preset) {
		case 'today':
			return {
				start: new Date(today.y, today.m, today.d),
				end: new Date(today.y, today.m, today.d, 23, 59, 59),
				activePreset: 'today' as const,
			}
		case 'yesterday': {
			const d = new Date(today.y, today.m, today.d - 1)
			return {
				start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
				end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
				activePreset: 'yesterday' as const,
			}
		}
		case 'this-week': {
			const start = new Date(today.y, today.m, today.d - now.getDay())
			return {
				start,
				end: new Date(today.y, today.m, today.d, 23, 59, 59),
				activePreset: 'this-week' as const,
			}
		}
		case 'last-month':
			return {
				start: new Date(today.y, today.m - 1, 1),
				end: new Date(today.y, today.m, 0, 23, 59, 59),
				activePreset: 'last-month' as const,
			}
		case 'last-30':
			return {
				start: new Date(today.y, today.m, today.d - 29),
				end: new Date(today.y, today.m, today.d, 23, 59, 59),
				activePreset: 'last-30' as const,
			}
		default:
			return {
				start: new Date(today.y, today.m, 1),
				end: new Date(today.y, today.m, today.d, 23, 59, 59),
				activePreset: 'this-month' as const,
			}
	}
}
