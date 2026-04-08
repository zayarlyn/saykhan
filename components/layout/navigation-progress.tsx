'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type Phase = 'idle' | 'loading' | 'completing'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [width, setWidth] = useState(0)
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start the crawl when a same-page link is clicked.
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || anchor.target === '_blank') return

      setPhase('loading')
      setWidth(0)
      // Let the DOM settle to 0 before ramping up.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWidth(15)
          setTimeout(() => setWidth(72), 150)
        })
      })
    }

    document.addEventListener('click', onLinkClick)
    return () => document.removeEventListener('click', onLinkClick)
  }, [])

  // Complete when the route actually changes.
  useEffect(() => {
    if (phase === 'idle') return

    if (completeTimer.current) clearTimeout(completeTimer.current)

    setPhase('completing')
    setWidth(100)

    completeTimer.current = setTimeout(() => {
      setPhase('idle')
      setWidth(0)
    }, 400)

    return () => {
      if (completeTimer.current) clearTimeout(completeTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (phase === 'idle') return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      style={{ opacity: phase === 'completing' && width === 0 ? 0 : 1 }}
    >
      <div
        className="h-full bg-[#2e37a4]"
        style={{
          width: `${width}%`,
          transition:
            width === 100
              ? 'width 200ms ease-out'
              : width === 0
              ? 'none'
              : 'width 800ms cubic-bezier(0.05, 0.8, 0.5, 1)',
        }}
      />
    </div>
  )
}
