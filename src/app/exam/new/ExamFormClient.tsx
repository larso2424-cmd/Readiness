'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALL_TOPICS = [
  { id: 'Number and Algebra', label: 'Number & Algebra' },
  { id: 'Functions', label: 'Functions' },
  { id: 'Geometry and Trigonometry', label: 'Geometry & Trig' },
  { id: 'Statistics and Probability', label: 'Stats & Probability' },
  { id: 'Calculus', label: 'Calculus' },
]

export default function ExamFormClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [paperType, setPaperType] = useState<string>('both')
  const [targetGrade, setTargetGrade] = useState<string>('')
  const [topics, setTopics] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleTopic(id: string) {
    setTopics((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setTopics(new Set(ALL_TOPICS.map((t) => t.id)))
  }

  async function save() {
    if (!name.trim() || topics.size === 0) {
      setError('Add a name and select at least one topic.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        name: name.trim(),
        exam_date: date || null,
        paper_type: paperType,
        target_grade: targetGrade ? parseInt(targetGrade) : null,
      })
      .select('id')
      .single()

    if (examErr || !exam) {
      setError('Failed to create exam. Try again.')
      setSaving(false)
      return
    }

    await supabase.from('exam_topics').insert(
      Array.from(topics).map((topic) => ({ exam_id: exam.id, topic }))
    )

    await fetch('/api/exam/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: exam.id }),
    })

    router.push('/quiz')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">

        <div>
          <p className="text-gray-400 text-sm">New exam</p>
          <h1 className="text-2xl font-bold mt-1">Set up your exam</h1>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Your readiness score, weak topics, and quizzes will all be scoped to this exam.
          </p>
        </div>

        <div className="space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Exam name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Mock — June 12" or "IB Final May 2027"'
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Exam date <span className="text-gray-600 font-normal">(optional)</span></label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Topics on this exam</label>
              <button onClick={selectAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Select all
              </button>
            </div>
            <div className="space-y-2">
              {ALL_TOPICS.map((topic) => {
                const isSelected = topics.has(topic.id)
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-950' : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-200">{topic.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Paper type + target grade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Paper type</label>
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="both">Both papers</option>
                <option value="calculator">Calculator</option>
                <option value="no-calculator">No calculator</option>
                <option value="mock">Mock style</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Target grade <span className="text-gray-600 font-normal">(opt.)</span></label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">No target</option>
                {[7, 6, 5, 4, 3, 2, 1].map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={save}
            disabled={saving || !name.trim() || topics.size === 0}
            className="w-full bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Creating...' : 'Create exam & choose topics →'}
          </button>
        </div>

      </div>
    </div>
  )
}
