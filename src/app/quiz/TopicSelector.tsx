'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getTranslations, type LangCode } from '@/lib/i18n'

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
  lang,
}: {
  subtopics: Subtopic[]
  allSubtopics: Subtopic[]
  requireAuth?: boolean
  examTopics?: string[]
  userPlan?: string
  quizzesToday?: number
  freeTopics?: string[]
  lang?: LangCode
}) {
  const router = useRouter()
  const t = getTranslations(lang ?? 'en')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const pro = userPlan === 'exam_mode' || userPlan === 'study_plan'
  const quizLimitReached = !pro && quizzesToday >= 1

  const hasExamFilter = (examTopics?.length ?? 0) > 0
  const displaySubtopics = hasExamFilter && !showAll ? subtopics : allSubtopics

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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.noQuestionsAvailable}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="space-y-3 fade-up fade-up-1">
          <Link href="/" className="inline-flex items-center gap-1 text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            ← Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.practiceQuiz}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t.chooseTopicsDesc}</p>
            </div>
            {!pro && (
              <Link href="/upgrade" className="shrink-0 ml-4 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                border: '1px solid rgba(224,122,95,0.3)',
              }}>
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Quiz limit */}
        {quizLimitReached && (
          <div className="rounded-xl px-4 py-4 space-y-3 fade-up fade-up-2" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(224,122,95,0.3)',
          }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.dailyQuizUsed}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.dailyQuizUsedDesc}</p>
            <Link href="/upgrade" className="block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-opacity" style={{
              background: 'var(--accent)',
              color: '#fff',
            }}>
              {t.getExamMode}
            </Link>
          </div>
        )}

        {/* Exam filter toggle */}
        {hasExamFilter && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 fade-up fade-up-2" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {showAll ? t.allTopics : t.yourExamTopics}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {showAll ? t.showingEverything : `${subtopics.length} ${t.subtopics}`}
              </p>
            </div>
            <button
              onClick={() => { setShowAll((v) => !v); setSelected(new Set()) }}
              className="text-xs transition-colors shrink-0 ml-4"
              style={{ color: 'var(--accent)' }}
            >
              {showAll ? t.showExamOnly : t.showAll}
            </button>
          </div>
        )}

        {/* Topic groups */}
        <div className="space-y-6 fade-up fade-up-3">
          {Object.entries(grouped).map(([topic, subs]) => (
            <div key={topic}>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{topic}</h2>
                {!isLocked(subs[0]) && (
                  <button
                    onClick={() => {
                      const allSel = subs.filter(s => !isLocked(s)).every((s) => selected.has(s.id))
                      setSelected((prev) => {
                        const next = new Set(prev)
                        subs.filter(s => !isLocked(s)).forEach((s) => allSel ? next.delete(s.id) : next.add(s.id))
                        return next
                      })
                    }}
                    className="text-xs transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {subs.filter(s => !isLocked(s)).every((s) => selected.has(s.id)) ? t.deselectAll : t.selectAll}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {subs.map((s) => {
                  const locked = isLocked(s)
                  const sel = selected.has(s.id)
                  return locked ? (
                    <Link
                      key={s.id}
                      href="/upgrade"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity opacity-50 hover:opacity-70"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center" style={{
                        border: '1.5px solid var(--text-tertiary)',
                      }}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--text-tertiary)' }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-tertiary)' }}>{s.subtopic}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                        background: 'var(--accent-muted)',
                        color: 'var(--accent)',
                      }}>PRO</span>
                    </Link>
                  ) : (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id, false)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                      style={{
                        background: sel ? 'rgba(224,122,95,0.08)' : 'var(--bg-card)',
                        border: sel ? '1px solid rgba(224,122,95,0.4)' : '1px solid var(--border)',
                      }}
                    >
                      <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors" style={{
                        background: sel ? 'var(--accent)' : 'transparent',
                        border: sel ? '1.5px solid var(--accent)' : '1.5px solid var(--text-tertiary)',
                      }}>
                        {sel && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.subtopic}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 pb-6 fade-up fade-up-4">
          <button
            onClick={startQuiz}
            disabled={selected.size === 0 || quizLimitReached}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
          >
            {t.startQuizBtn} {selected.size} {selected.size === 1 ? t.topicSelected : t.topicsSelected}
          </button>
          {selected.size === 0 && !quizLimitReached && (
            <button
              onClick={selectAll}
              className="w-full py-2 text-sm transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t.selectAllTopics} {displaySubtopics.filter(s => !isLocked(s)).length} {t.topics}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
