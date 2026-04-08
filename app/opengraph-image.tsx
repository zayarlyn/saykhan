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
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
            fontSize: 80,
          }}
        >
          🩺
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
