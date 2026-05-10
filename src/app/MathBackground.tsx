'use client'

import { useEffect, useRef } from 'react'

const SYMBOLS = [
  'π', '∫', '√', 'Σ', 'θ', 'Δ', '∞', 'log', 'sin', 'cos',
  'x²', 'f(x)', 'dy/dx', 'e', 'ln', '±', 'tan', 'lim', 'P(A)',
  '7', '42', '3.14', 'n!', 'μ', 'σ', 'r²', 'ax²+bx+c',
  '∂', 'λ', 'α', 'β', 'φ', 'ω', 'ε', 'ζ',
  'cos²x', 'sinθ', 'log₂', 'e^x', 'x³', '∇', '∈', '⊂',
  '0.5', '2π', '√2', 'n²', 'x̄', "f'(x)", '∑n', 'P(B|A)',
  '1', '2', '3', '5', '8', '13', '21', '0',
  '÷', '×', '=', '%', '∝', '≈', '≠', '≤',
  'i²', 'a+bi', 'r·θ', 'IQR', 'E(X)', 'Var(X)',
  // repeat popular ones to fill grid
  'π', '∫', 'sin', 'cos', 'tan', 'ln', 'log', 'e',
  '∞', 'Σ', 'θ', 'Δ', '√', 'x²', 'lim', '±',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  'α', 'β', 'λ', 'μ', 'σ', 'φ', 'ω', 'γ',
  'dy/dx', 'f(x)', 'n!', '3.14', '42', '2π', '√3',
  'P(A)', 'P(B)', 'E(X)', 'r²', 'x³', 'e^x', 'log₁₀',
  '≥', '≤', '≠', '≈', '∈', '∉', '⊆', '∩', '∪',
  'sin²x', 'cos²x', 'tanθ', 'arcsin', 'cot', 'sec',
  'ax+b', 'mx+c', 'y=mx', 'f\'\'(x)', '∑k', 'nCr',
  '0.25', '0.75', '1/2', '2/3', '1/4', '3.14',
]

const TOTAL = 90

export default function MathBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const items: { el: HTMLSpanElement; x: number; y: number; vx: number; vy: number }[] = []

    // Center "no-go" zone (where the card content lives)
    const NO_X1 = 10, NO_X2 = 90
    const NO_Y1 = 8,  NO_Y2 = 92

    function inDeadZone(x: number, y: number) {
      return x > NO_X1 && x < NO_X2 && y > NO_Y1 && y < NO_Y2
    }

    // Generate positions only in the margin strips
    function safePosition(): { x: number; y: number } {
      // Pick one of 4 strips: top, bottom, left, right
      const strip = Math.floor(Math.random() * 4)
      if (strip === 0) return { x: Math.random() * 100, y: Math.random() * NO_Y1 }
      if (strip === 1) return { x: Math.random() * 100, y: NO_Y2 + Math.random() * (100 - NO_Y2) }
      if (strip === 2) return { x: Math.random() * NO_X1, y: Math.random() * 100 }
      return { x: NO_X2 + Math.random() * (100 - NO_X2), y: Math.random() * 100 }
    }

    // Build a list of TOTAL symbols by cycling through SYMBOLS
    const pool: string[] = []
    for (let i = 0; i < TOTAL; i++) pool.push(SYMBOLS[i % SYMBOLS.length])
    pool.sort(() => Math.random() - 0.5)

    pool.forEach((sym, i) => {
      const el = document.createElement('span')
      el.textContent = sym
      el.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 10 + 11}px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        color: rgba(255,255,255,${Math.random() * 0.08 + 0.12});
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
        font-weight: 500;
        letter-spacing: 0.02em;
      `
      const { x, y } = safePosition()
      el.style.left = `${x}%`
      el.style.top = `${y}%`
      container.appendChild(el)

      items.push({
        el,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.012,
        vy: (Math.random() - 0.5) * 0.012,
      })
    })

    let animId: number
    function animate() {
      items.forEach((item) => {
        item.x += item.vx
        item.y += item.vy
        // Wrap around screen edges
        if (item.x < -5) item.x = 105
        if (item.x > 105) item.x = -5
        if (item.y < -5) item.y = 105
        if (item.y > 105) item.y = -5
        // Bounce out of center dead zone
        if (inDeadZone(item.x, item.y)) {
          item.vx = -item.vx
          item.vy = -item.vy
          item.x += item.vx * 4
          item.y += item.vy * 4
        }
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
