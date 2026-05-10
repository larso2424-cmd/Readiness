'use client'

import { useEffect, useRef } from 'react'

const SYMBOLS = [
  'π', '∫', '√', 'Σ', 'θ', 'Δ', '∞', 'log', 'sin', 'cos',
  'x²', 'f(x)', 'dy/dx', 'e', 'ln', '±', 'tan', 'lim', 'P(A)',
  '7', '42', '3.14', 'n!', 'μ', 'σ', 'r²', 'ax²+bx+c',
]

export default function MathBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const items: { el: HTMLSpanElement; x: number; y: number; vx: number; vy: number }[] = []

    SYMBOLS.forEach((sym, i) => {
      const el = document.createElement('span')
      el.textContent = sym
      el.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 12 + 13}px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        color: rgba(255,255,255,${Math.random() * 0.08 + 0.12});
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
        font-weight: 500;
        letter-spacing: 0.02em;
      `
      const x = Math.random() * 100
      const y = Math.random() * 100
      el.style.left = `${x}%`
      el.style.top = `${y}%`
      container.appendChild(el)

      items.push({
        el,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.015,
        vy: (Math.random() - 0.5) * 0.015,
      })
    })

    let animId: number
    function animate() {
      items.forEach((item) => {
        item.x += item.vx
        item.y += item.vy
        if (item.x < -5) item.x = 105
        if (item.x > 105) item.x = -5
        if (item.y < -5) item.y = 105
        if (item.y > 105) item.y = -5
        item.el.style.left = `${item.x}%`
        item.el.style.top = `${item.y}%`
      })
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      items.forEach(({ el }) => el.remove())
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    />
  )
}
