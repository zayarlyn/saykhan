import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Saykhan — Clinic Management'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2e37a4',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        {/* Icon badge */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          >
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6v-3" />
            <circle cx="20" cy="10" r="2" />
          </svg>
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'white', fontSize: 72, fontWeight: 700, letterSpacing: '-2px', lineHeight: 1 }}>
            Saykhan
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 32, letterSpacing: '0.5px' }}>
            Clinic Management
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
