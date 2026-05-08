'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UpgradePage() {
  const router = useRouter()
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
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-10">

        <div className="text-center space-y-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back</Link>
          <h1 className="text-3xl font-bold mt-4">Know exactly what to study<br />before your exam.</h1>
          <p className="text-gray-400">Stop guessing. Start scoring.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">

          {/* Free */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Free</p>
              <p className="text-3xl font-bold mt-1">€0</p>
              <p className="text-xs text-gray-500 mt-1">Forever</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✓ 1 subject of your choice</li>
              <li>✓ Number & Algebra + Functions</li>
              <li>✓ 1 quiz per day</li>
              <li>✓ Basic readiness %</li>
              <li className="text-gray-600">✗ Weak topic breakdown</li>
              <li className="text-gray-600">✗ "What to study" plan</li>
              <li className="text-gray-600">✗ All topics</li>
            </ul>
            <div className="pt-2">
              <Link href="/" className="block w-full text-center border border-gray-700 text-gray-400 py-2.5 rounded-xl text-sm font-medium hover:border-gray-500 transition-colors">
                Current plan
              </Link>
            </div>
          </div>

          {/* Exam Mode — highlighted */}
          <div className="rounded-2xl border-2 border-orange-500 bg-gray-900 p-6 space-y-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">⭐ MOST POPULAR</span>
            </div>
            <div>
              <p className="text-xs text-orange-400 uppercase tracking-wide font-medium">🔥 Exam Mode</p>
              <p className="text-3xl font-bold mt-1">€19.99</p>
              <p className="text-xs text-orange-400 mt-1 font-medium">Expires after exam season</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>✓ All subjects (AA + AI)</li>
              <li>✓ All topics unlocked</li>
              <li>✓ Unlimited quizzes</li>
              <li>✓ Full readiness breakdown</li>
              <li>✓ Weak topic priority list</li>
              <li>✓ "What to study" day plan</li>
              <li>✓ Progress tracking</li>
            </ul>
            <button
              onClick={() => checkout('exam_mode')}
              disabled={loading !== null}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              {loading === 'exam_mode' ? 'Loading...' : 'Get Exam Mode →'}
            </button>
          </div>

          {/* Study Plan */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Study Plan</p>
              <p className="text-3xl font-bold mt-1">€7.99<span className="text-lg text-gray-500 font-normal">/mo</span></p>
              <p className="text-xs text-gray-500 mt-1">Cancel anytime</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✓ All subjects (AA + AI)</li>
              <li>✓ All topics unlocked</li>
              <li>✓ Unlimited quizzes</li>
              <li>✓ Full readiness breakdown</li>
              <li>✓ Weak topic priority list</li>
              <li>✓ Progress tracking</li>
              <li className="text-gray-600 text-xs">For year-round studying</li>
            </ul>
            <button
              onClick={() => checkout('study_plan')}
              disabled={loading !== null}
              className="w-full border border-gray-600 text-gray-300 hover:border-gray-400 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === 'study_plan' ? 'Loading...' : 'Get Study Plan'}
            </button>
          </div>

        </div>

        <p className="text-center text-xs text-gray-600">
          Payments are processed securely by Stripe. Cancel your Study Plan anytime.
        </p>

      </div>
    </div>
  )
}
