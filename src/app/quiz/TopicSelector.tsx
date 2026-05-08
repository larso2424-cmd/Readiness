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
  userPlan = 'free',
  quizzesToday = 0,
  freeTopics = [],
}: {
  subtopics: Subtopic[]
  allSubtopics: Subtopic[]
  requireAuth?: boolean
  examTopics?: string[]
  userPlan?: string
  quizzesToday?: number
  freeTopics?: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const pro = userPlan === 'exam_mode' || userPlan === 'study_plan'
  const quizLimitReached = !pro && quizzesToday >= 1

  const hasExamFilter = (examTopics?.length ?? 0) > 0
  const displaySubtopics = hasExamFilter && !showAll ? subtopics : allSubtopics

  // All subtopics including locked ones for display
  const allForDisplay = allSubtopics

  // Group by topic
  const grouped: Record<string, Subtopic[]> = {}
  for (const s of displaySubtopics) {
    if (!grouped[s.topic]) grouped[s.topic] = []
    grouped[s.topic].push(s)
  }

  function isLocked(s: Subtopic) {
    if (pro) return false
    return !freeTopics.includes(s.topic)
  }

  function toggle(id: string, locked: boolean) {
    if (locked) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(displaySubtopics.filter(s => !isLocked(s)).map((s) => s.id)))
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Choose your topics</h1>
              <p className="text-gray-400 mt-1 text-sm">Select the subtopics you want to be tested on.</p>
            </div>
            {!pro && (
              <Link href="/upgrade" className="shrink-0 ml-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                🔥 Exam Mode
              </Link>
            )}
          </div>
        </div>

        {/* Quiz limit warning */}
        {quizLimitReached && (
          <div className="bg-gray-900 border border-orange-500/40 rounded-xl px-4 py-4 space-y-3">
            <p className="text-sm font-medium text-white">You've used your free quiz for today 🔒</p>
            <p className="text-xs text-gray-400">Free users get 1 quiz per day. Upgrade to unlock unlimited quizzes.</p>
            <Link href="/upgrade" className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
              🔥 Get Exam Mode — €24.99
            </Link>
          </div>
        )}

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
                {!isLocked(subs[0]) && (
                  <button
                    onClick={() => {
                      const allSelected = subs.filter(s => !isLocked(s)).every((s) => selected.has(s.id))
                      setSelected((prev) => {
                        const next = new Set(prev)
                        subs.filter(s => !isLocked(s)).forEach((s) => allSelected ? next.delete(s.id) : next.add(s.id))
                        return next
                      })
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {subs.filter(s => !isLocked(s)).every((s) => selected.has(s.id)) ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {subs.map((s) => {
                  const locked = isLocked(s)
                  return locked ? (
                    <Link
                      key={s.id}
                      href="/upgrade"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 bg-gray-900/50 opacity-60 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-4 h-4 rounded border-2 border-gray-700 shrink-0 flex items-center justify-center">
                        <span className="text-[10px]">🔒</span>
                      </div>
                      <span className="text-gray-400 text-sm font-medium flex-1">{s.subtopic}</span>
                      <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full">PRO</span>
                    </Link>
                  ) : (
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
                        onChange={() => toggle(s.id, false)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-gray-200 text-sm font-medium">{s.subtopic}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 pb-4">
          <button
            onClick={startQuiz}
            disabled={selected.size === 0 || quizLimitReached}
            className="w-full bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start quiz — {selected.size} {selected.size === 1 ? 'topic' : 'topics'} selected
          </button>
          {selected.size === 0 && !quizLimitReached && (
            <button
              onClick={selectAll}
              className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
            >
              Select all {displaySubtopics.filter(s => !isLocked(s)).length} topics
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
