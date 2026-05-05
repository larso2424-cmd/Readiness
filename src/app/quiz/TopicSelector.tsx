'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Subtopic {
  id: string
  topic: string
  subtopic: string
}

export default function TopicSelector({
  subtopics,
  allSubtopics,
  requireAuth,
  examTopics,
}: {
  subtopics: Subtopic[]
  allSubtopics: Subtopic[]
  requireAuth?: boolean
  examTopics?: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const hasExamFilter = (examTopics?.length ?? 0) > 0
  const displaySubtopics = hasExamFilter && !showAll ? subtopics : allSubtopics

  // Group by topic
  const grouped: Record<string, Subtopic[]> = {}
  for (const s of displaySubtopics) {
    if (!grouped[s.topic]) grouped[s.topic] = []
    grouped[s.topic].push(s)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(displaySubtopics.map((s) => s.id)))
  }

  function startQuiz() {
    const ids = Array.from(selected).join(',')
    if (requireAuth) {
      router.push(`/auth/login?from=${encodeURIComponent(`/quiz/take?subtopics=${ids}`)}`)
      return
    }
    router.push(`/quiz/take?subtopics=${ids}`)
  }

  if (allSubtopics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-gray-400 font-medium">No questions available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Choose your topics</h1>
            <p className="text-gray-400 mt-1 text-sm">Select the subtopics you want to be tested on.</p>
          </div>
        </div>

        {/* Exam filter toggle */}
        {hasExamFilter && (
          <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">
                {showAll ? 'Showing all topics' : 'Showing your exam topics'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {showAll
                  ? 'Switch back to see only your exam topics'
                  : `${subtopics.length} subtopics from your exam setup`}
              </p>
            </div>
            <button
              onClick={() => { setShowAll((v) => !v); setSelected(new Set()) }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0 ml-4"
            >
              {showAll ? 'Show exam only' : 'Show all'}
            </button>
          </div>
        )}

        {/* Topic groups */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([topic, subs]) => (
            <div key={topic}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{topic}</h2>
                <button
                  onClick={() => {
                    const allSelected = subs.every((s) => selected.has(s.id))
                    setSelected((prev) => {
                      const next = new Set(prev)
                      subs.forEach((s) => allSelected ? next.delete(s.id) : next.add(s.id))
                      return next
                    })
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {subs.every((s) => selected.has(s.id)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {subs.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selected.has(s.id)
                        ? 'border-blue-500 bg-blue-950'
                        : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-gray-200 text-sm font-medium">{s.subtopic}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 pb-4">
          <button
            onClick={startQuiz}
            disabled={selected.size === 0}
            className="w-full bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start quiz — {selected.size} {selected.size === 1 ? 'topic' : 'topics'} selected
          </button>
          {selected.size === 0 && (
            <button
              onClick={selectAll}
              className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
            >
              Select all {displaySubtopics.length} topics
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
