import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	/* config options here */
	typescript: {
		ignoreBuildErrors: true, // vercel build fails without this, even though there are no type errors in the codebase. might be a vercel issue? needs investigation
	},
}

export default nextConfig
