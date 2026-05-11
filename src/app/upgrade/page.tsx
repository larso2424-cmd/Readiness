'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function checkout(priceType: 'exam_mode' | 'study_plan') {
    setLoading(priceType)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceType }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setLoading(null); return }
    window.location.href = url
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>
          ← Back
        </Link>

        {/* Header */}
        <div className="space-y-2 fade-up fade-up-1">
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>Plans</p>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            Know exactly what to study<br />before your exam.
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Stop guessing. Start scoring.</p>
        </div>

        {/* Cards */}
        <div className="space-y-3 fade-up fade-up-2">

          {/* Exam Mode — hero card */}
          <div className="rounded-2xl p-6 space-y-5 relative" style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--accent)',
          }}>
            <div className="absolute -top-3 left-5">
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                MOST POPULAR
              </span>
            </div>

            <div className="flex items-start justify-between pt-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Exam Mode</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>€19.99</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>One-time · valid through exam season</p>
              </div>
            </div>

            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {[
                'All topics unlocked',
                'Unlimited quizzes per day',
                'Full readiness breakdown',
                'Weak topic priority list',
                '"What to study" plan',
                'Progress tracking',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span style={{ color: 'var(--accent)' }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => checkout('exam_mode')}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading === 'exam_mode' ? 'Loading...' : 'Get Exam Mode →'}
            </button>
          </div>

          {/* Study Plan */}
          <div className="rounded-2xl p-6 space-y-5" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Study Plan</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(92,184,138,0.12)', color: '#5cb88a' }}>2-day free trial</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>€7.99</p>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/month</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Cancel anytime · free for 2 days</p>
            </div>

            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {[
                'Everything in Exam Mode',
                'Study all year round',
                'Cancel anytime',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-tertiary)' }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => checkout('study_plan')}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {loading === 'study_plan' ? 'Loading...' : 'Start free trial'}
            </button>
          </div>

          {/* Free */}
          <div className="rounded-2xl p-5 space-y-3" style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Free</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>€0</p>
              </div>
              <Link href="/" className="text-xs px-3 py-1.5 rounded-lg" style={{
                border: '1px solid var(--border)',
                color: 'var(--text-tertiary)',
              }}>
                Current plan
              </Link>
            </div>
            <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <li>✓ 2 topics (Number & Algebra, Functions)</li>
              <li>✓ 1 quiz per day</li>
              <li>✓ Basic readiness %</li>
            </ul>
          </div>

        </div>

        <p className="text-center text-xs pb-4" style={{ color: 'var(--text-tertiary)' }}>
          Payments processed securely by Stripe.
        </p>

      </div>
    </div>
  )
}
