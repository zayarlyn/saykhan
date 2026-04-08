import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { NavigationProgress } from '@/components/layout/navigation-progress'
import { VercelToolbar } from '@vercel/toolbar/next'
import './globals.css'

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
	title: 'Saykhan — Clinic Management',
	description: 'Clinic management system for tracking patients, sessions, medications, and expenses',
	openGraph: {
		title: 'Saykhan — Clinic Management',
		description: 'Clinic management system for tracking patients, sessions, medications, and expenses',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Saykhan — Clinic Management',
		description: 'Clinic management system for tracking patients, sessions, medications, and expenses',
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'Saykhan',
	},
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	minimumScale: 1,
	themeColor: '#2e37a4',
	viewportFit: 'cover',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en' className={`${inter.variable} h-full antialiased`}>
			<body className='min-h-full flex flex-col'>
				<Suspense>
					<NavigationProgress />
				</Suspense>
				{children}
				{process.env.NODE_ENV === 'development' && <VercelToolbar />}
			</body>
		</html>
	)
}
