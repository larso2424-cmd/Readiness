'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALL_TOPICS = [
  { id: 'Number and Algebra', label: 'Number & Algebra', description: 'Sequences, binomial theorem, logs, complex numbers' },
  { id: 'Functions', label: 'Functions', description: 'Quadratics, transformations, rational & trig functions' },
  { id: 'Geometry and Trigonometry', label: 'Geometry & Trigonometry', description: 'Triangle trig, circles, vectors' },
  { id: 'Statistics and Probability', label: 'Statistics & Probability', description: 'Probability, distributions, hypothesis testing' },
  { id: 'Calculus', label: 'Calculus', description: 'Differentiation, integration, kinematics' },
]

export default function ExamSetupClient({
  userId,
  currentTopics,
}: {
  userId: string
  currentTopics: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(currentTopics))
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(ALL_TOPICS.map((t) => t.id)))
  }

  async function save() {
    if (selected.size === 0) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('users')
      .update({ exam_topics: Array.from(selected) })
      .eq('id', userId)
    router.push('/quiz')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">

        <div className="space-y-2">
          <p className="text-gray-400 text-sm">Exam setup</p>
          <h1 className="text-2xl font-bold">Which topics are on your exam?</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your readiness score will be calculated only for the topics you select. You can change this any time.
          </p>
        </div>

        <div className="space-y-3">
          {ALL_TOPICS.map((topic) => {
            const isSelected = selected.has(topic.id)
            return (
              <button
                key={topic.id}
                onClick={() => toggle(topic.id)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-white">{topic.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{topic.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <button
            onClick={save}
            disabled={selected.size === 0 || saving}
            className="w-full bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : `Save — ${selected.size} topic${selected.size !== 1 ? 's' : ''} selected`}
          </button>
          <button
            onClick={selectAll}
            className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
          >
            Select all topics
          </button>
        </div>

      </div>
    </div>
  )
}
