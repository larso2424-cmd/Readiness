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

    // Build a list of TOTAL symbols by cycling through SYMBOLS
    const pool: string[] = []
    for (let i = 0; i < TOTAL; i++) pool.push(SYMBOLS[i % SYMBOLS.length])
    // Shuffle
    pool.sort(() => Math.random() - 0.5)

    // Grid: find cols/rows that fit TOTAL symbols as evenly as possible
    const COLS = 13
    const ROWS = Math.ceil(TOTAL / COLS)
    const cellW = 100 / COLS
    const cellH = 100 / ROWS

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
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = col * cellW + Math.random() * cellW * 0.8 + cellW * 0.1
      const y = row * cellH + Math.random() * cellH * 0.8 + cellH * 0.1
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
