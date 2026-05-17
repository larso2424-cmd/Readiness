'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isPro } from '@/lib/plans'
import { getLang, getTranslations } from '@/lib/i18n'

interface Exam {
  id: string
  name: string
  exam_date: string | null
  target_grade: number | null
  archived: boolean
  course?: string
}

interface Props {
  name: string
  greeting: string
  date: string
  streak: number
  overallScore: number | null
  predictedGrade: { grade: number; nextGrade: number; neededFor: number; target: number | null } | null
  topicMastery: { topic: string; score: number }[]
  examTopics: string[]
  lastAttempt: any
  recentAttempts: any[]
  weakIds: string[]
  weakSubtopicNames: string[]
  skillStats: Record<string, { correct: number; total: number }>
  activeExam: Exam
  allExams: Exam[]
  examDaysLeft: number | null
  userPlan?: string
}

const TOPIC_SHORT: Record<string, string> = {
  'Number and Algebra': 'Number & Algebra',
  'Functions': 'Functions',
  'Geometry and Trigonometry': 'Geometry & Trig',
  'Statistics and Probability': 'Stats & Probability',
  'Calculus': 'Calculus',
}

function scoreColor(score: number): string {
  if (score >= 70) return '#5cb88a'
  if (score >= 40) return '#e07a5f'
  return '#c45c5c'
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Well prepared'
  if (score >= 70) return 'On track'
  if (score >= 50) return 'Getting there'
  if (score >= 30) return 'Needs focus'
  return 'At risk'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatSkillTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function daysLabel(days: number | null): string {
  if (days === null) return ''
  if (days < 0) return 'Exam passed'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 14) return `${days} days left`
  if (days < 60) return `${Math.round(days / 7)} weeks left`
  return `${Math.round(days / 30)} months left`
}

function daysUrgency(days: number | null): string {
  if (days === null) return 'text-[var(--text-tertiary)]'
  if (days <= 7) return 'text-[#c45c5c]'
  if (days <= 21) return 'text-[#e07a5f]'
  return 'text-[var(--text-secondary)]'
}

function ReadinessRing({ score }: { score: number }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = scoreColor(score)
  return (
    <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
      <svg className="absolute" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          className="ring-animate"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <span className="text-2xl font-semibold text-white">{score}%</span>
    </div>
  )
}

function ExamSwitcher({ activeExam, allExams, onSwitch, onSignOut, name, userPlan }: {
  activeExam: Exam; allExams: Exam[]; onSwitch: (id: string) => void; onSignOut: () => void; name: string; userPlan: string
}) {
  const [open, setOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel? You\'ll keep access until the end of your billing period.')) return
    setCancelling(true)
    setOpen(false)
    const res = await fetch('/api/stripe/cancel', { method: 'POST' })
    const { error } = await res.json()
    setCancelling(false)
    if (error) { alert(error); return }
    alert('Your subscription has been cancelled. You\'ll keep access until the end of your billing period.')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-[var(--text-secondary)]"
      >
        {activeExam.course && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeExam.course === 'ai' ? 'bg-violet-600/80' : 'bg-blue-600/80'} text-white`}>
            {activeExam.course === 'ai' ? 'AI' : 'AA'}
          </span>
        )}
        <span className="truncate max-w-[160px] font-medium text-[var(--text-primary)]">{activeExam.name}</span>
        <span className="text-[var(--text-tertiary)] text-xs">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-60 bg-[#161d2e] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-1.5">
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium px-2.5 py-2 uppercase tracking-wider">Your exams</p>
              {allExams.map((exam) => (
                <div key={exam.id} className={`flex items-center rounded-lg ${exam.id === activeExam.id ? 'bg-white/5' : 'hover:bg-white/5'} transition-colors`}>
                  <button onClick={() => { setOpen(false); onSwitch(exam.id) }} className="flex-1 text-left px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      {exam.course && (
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${exam.course === 'ai' ? 'bg-violet-600/80' : 'bg-blue-600/80'} text-white`}>
                          {exam.course === 'ai' ? 'AI' : 'AA'}
                        </span>
                      )}
                      <p className="text-sm font-medium text-[var(--text-primary)]">{exam.name}</p>
                    </div>
                    {exam.exam_date && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </button>
                  <Link href={`/exam/${exam.id}/edit`} onClick={() => setOpen(false)} className="px-2.5 py-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors text-xs">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] p-1.5">
              <Link href="/exam/new" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-[var(--text-secondary)]">
                + New exam
              </Link>
              <button onClick={() => { setOpen(false); onSignOut() }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-[var(--text-tertiary)]">
                Sign out
              </button>
              {userPlan === 'study_plan' && (
                <button
                  onClick={cancelSubscription}
                  disabled={cancelling}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm disabled:opacity-50"
                  style={{ color: '#c45c5c' }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel subscription'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function getLocalGreeting(): string {
  return 'Hello'
}

function getLocalDate(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function Dashboard({
  name, greeting: _greeting, date: _date, streak, overallScore, predictedGrade,
  topicMastery, examTopics, lastAttempt, recentAttempts,
  weakIds, weakSubtopicNames, skillStats,
  activeExam, allExams, examDaysLeft, userPlan = 'free',
}: Props) {
  const router = useRouter()
  const pro = isPro(userPlan as any, null)
  const [t, setT] = useState(() => getTranslations('en'))

  useEffect(() => {
    setT(getTranslations(getLang()))
  }, [])

  // Compute greeting and date client-side so they use the user's local timezone
  const greeting = t.hello
  const date = getLocalDate()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  async function switchExam(examId: string) {
    await fetch('/api/exam/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_id: examId }) })
    router.refresh()
  }

  const sorted = [...topicMastery]
  const strongest = sorted.length > 1 ? [...sorted].sort((a, b) => b.score - a.score)[0] : null
  const weakest = sorted.length > 1 ? [...sorted].sort((a, b) => a.score - b.score)[0] : null

  const masteredSkills = Object.entries(skillStats)
    .filter(([, s]) => s.total >= 3 && s.correct / s.total >= 0.75).map(([skill]) => skill)
  const strugglingSkills = Object.entries(skillStats)
    .filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.4)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 4).map(([skill]) => skill)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto px-5 py-7 space-y-5">

        {/* Header */}
        <div className="fade-up fade-up-1 relative z-10 space-y-2">
          {/* Top row: date + badges */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-secondary)] font-medium tracking-wide uppercase">{date}</p>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs font-medium text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5cb88a]" />
                  {streak}d
                </div>
              )}
              {pro ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(92,184,138,0.1)', color: '#5cb88a' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5cb88a]" />
                  {userPlan === 'study_plan' ? 'Study Plan' : 'Exam Mode'}
                </div>
              ) : (
                <Link href="/upgrade" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  Upgrade
                </Link>
              )}
            </div>
          </div>
          {/* Bottom row: greeting + exam switcher + settings */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{greeting}, {name}</h1>
            <div className="flex items-center gap-1">
              <Link href="/settings" className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </Link>
              <ExamSwitcher activeExam={activeExam} allExams={allExams} onSwitch={switchExam} onSignOut={signOut} name={name} userPlan={userPlan} />
            </div>
          </div>
        </div>

        {/* Exam context — 2. Softer, thinner topic pills */}
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/[0.02] fade-up fade-up-2" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex flex-wrap gap-1">
            {examTopics.map((t) => (
              <span key={t} className="text-[11px] font-medium px-2 py-px rounded-md" style={{
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.04)',
              }}>
                {TOPIC_SHORT[t] ?? t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            {examDaysLeft !== null && examDaysLeft >= 0 && (
              <span className={`text-[11px] font-medium whitespace-nowrap ${daysUrgency(examDaysLeft)}`}>
                {daysLabel(examDaysLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Upgrade banner — 4. No hard border, internal glow instead */}
        {!pro && (
          <Link href="/upgrade" className="block fade-up fade-up-2 group">
            <div className="rounded-xl px-4 py-3.5 flex items-center justify-between transition-all duration-300"
              style={{
                background: 'rgba(224,122,95,0.09)',
                boxShadow: 'inset 0 0 0 1px rgba(224,122,95,0.15)',
              }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Exam Mode</p>
                {/* 1. Sharper subtitle */}
                <p className="text-xs mt-0.5" style={{ color: '#9aa3b0' }}>Unlock all topics, weak topics & study plan — €19.99</p>
              </div>
              <span className="text-sm font-medium shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--accent)' }}>→</span>
            </div>
          </Link>
        )}

        {/* Readiness card — no hard border */}
        {overallScore !== null ? (
          <div className="rounded-2xl p-6 fade-up fade-up-3" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            {/* 1. Sharper label */}
            <p className="text-[11px] font-medium uppercase tracking-wider mb-4" style={{ color: '#7a8394' }}>{activeExam.name}</p>
            <div className="flex items-center gap-6">
              <ReadinessRing score={overallScore} />
              <div className="flex-1 min-w-0">
                {pro ? (
                  <>
                    <p className="text-lg font-semibold" style={{ color: scoreColor(overallScore) }}>
                      {scoreLabel(overallScore)}
                    </p>
                    {strongest && weakest && (
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#7a8394' }}>
                        Strong in {TOPIC_SHORT[strongest.topic] ?? strongest.topic} · Weakest in {TOPIC_SHORT[weakest.topic] ?? weakest.topic}
                      </p>
                    )}
                    {predictedGrade && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}>
                          Predicted grade {predictedGrade.grade}
                        </span>
                        {predictedGrade.grade < 7 && (
                          <span className="text-xs" style={{ color: '#7a8394' }}>
                            +{predictedGrade.neededFor - overallScore}% → grade {predictedGrade.nextGrade}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>You're not fully ready</p>
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#7a8394' }}>Unlock your weak topic breakdown to know exactly what to study</p>
                    <Link href="/upgrade" className="inline-block mt-3 text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--accent)' }}>
                      See full breakdown →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center fade-up fade-up-3 space-y-2" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No data yet</p>
            <p className="text-sm" style={{ color: '#7a8394' }}>Take your first quiz to see your readiness score</p>
          </div>
        )}

        {/* Practice grid — 3. Larger, more luxurious cards */}
        <div className="rounded-2xl p-5 fade-up fade-up-3" style={{
          background: 'var(--bg-card)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-4" style={{ color: '#7a8394' }}>{t.practice}</p>
          <div className="grid grid-cols-2 gap-3">
            {weakIds.length > 0 && (
              <Link href={`/quiz/take?subtopics=${weakIds.join(',')}`}
                className="rounded-xl p-5 transition-colors group"
                style={{ background: 'rgba(255,255,255,0.035)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.weakTopics}</p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#7a8394' }}>{weakSubtopicNames.slice(0, 2).join(', ')}</p>
              </Link>
            )}
            <Link href="/quiz"
              className="rounded-xl p-5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.035)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.byTopic}</p>
              <p className="text-xs mt-1.5" style={{ color: '#7a8394' }}>Choose subtopics</p>
            </Link>
            <Link href="/quiz/random"
              className="rounded-xl p-5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.035)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.randomMix}</p>
              <p className="text-xs mt-1.5" style={{ color: '#7a8394' }}>All exam topics</p>
            </Link>
            <Link href="/quiz/mock"
              className="rounded-xl p-5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.035)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.mockExam}</p>
              <p className="text-xs mt-1.5" style={{ color: '#7a8394' }}>60 min · timed</p>
            </Link>
          </div>
        </div>

        {/* Last attempt */}
        {lastAttempt && (
          <div className="rounded-2xl p-5 fade-up fade-up-4" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <p className="text-[11px] font-medium uppercase tracking-wider mb-4" style={{ color: '#7a8394' }}>{t.lastSession}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                  style={{ background: `${scoreColor(lastAttempt.readiness_score)}15`, color: scoreColor(lastAttempt.readiness_score) }}>
                  {lastAttempt.readiness_score}%
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{lastAttempt.correct_count} of {lastAttempt.total_count} correct</p>
                  <p className="text-xs mt-0.5" style={{ color: '#7a8394' }}>{formatDate(lastAttempt.created_at)}</p>
                </div>
              </div>
              <Link
                href={weakIds.length > 0 ? `/quiz/take?subtopics=${weakIds.join(',')}` : '/quiz'}
                className="text-xs font-medium transition-colors px-3 py-1.5 rounded-lg"
                style={{
                  color: 'var(--text-secondary)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                }}
              >
                {weakIds.length > 0 ? 'Retake weak' : 'New quiz'}
              </Link>
            </div>
          </div>
        )}

        {/* Topic mastery */}
        <div className="rounded-2xl p-5 space-y-4 fade-up fade-up-4" style={{
          background: 'var(--bg-card)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>{t.topicMastery}</p>
          <div className="space-y-3.5">
            {examTopics.map((topic) => {
              const entry = topicMastery.find((t) => t.topic === topic)
              const score = entry?.score
              return (
                <div key={topic} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    {/* 1. Sharper topic labels */}
                    <span className="text-sm font-medium" style={{ color: '#9aa3b0' }}>{TOPIC_SHORT[topic] ?? topic}</span>
                    {score !== undefined ? (
                      <span className="text-xs font-semibold tabular-nums" style={{ color: scoreColor(score) }}>{score}%</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No data</span>
                    )}
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {score !== undefined && (
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${score}%`, backgroundColor: scoreColor(score), opacity: 0.75 }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Skill patterns — pro */}
        {pro && (masteredSkills.length > 0 || strugglingSkills.length > 0) && (
          <div className="rounded-2xl p-5 space-y-4 fade-up fade-up-5" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>{t.skillPatterns}</p>
            {masteredSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: '#5cb88a' }}>Mastered</p>
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((skill) => (
                    <span key={skill} className="text-[11px] font-medium px-2.5 py-0.5 rounded-md" style={{
                      background: 'rgba(92,184,138,0.08)',
                      color: '#5cb88a',
                    }}>
                      {formatSkillTag(skill)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {strugglingSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{t.needsWork}</p>
                <div className="flex flex-wrap gap-1.5">
                  {strugglingSkills.map((skill) => (
                    <span key={skill} className="text-[11px] font-medium px-2.5 py-0.5 rounded-md" style={{
                      background: 'var(--accent-muted)',
                      color: 'var(--accent)',
                    }}>
                      {formatSkillTag(skill)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Locked skills — free users */}
        {!pro && overallScore !== null && (
          <Link href="/upgrade" className="block rounded-2xl p-5 hover:bg-white/[0.02] transition-colors fade-up fade-up-5" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: '#7a8394' }}>Skill patterns</p>
                <p className="text-sm" style={{ color: '#7a8394' }}>Unlock to see which skills need work</p>
              </div>
              <span style={{ color: 'var(--text-tertiary)' }}>🔒</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 opacity-20 pointer-events-none select-none">
              {['Algebra', 'Integration', 'Probability', 'Trig'].map(s => (
                <span key={s} className="text-[11px] font-medium px-2.5 py-0.5 rounded-md" style={{
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                }}>{s}</span>
              ))}
            </div>
          </Link>
        )}

        {/* Recent activity */}
        {recentAttempts.length > 1 && (
          <div className="rounded-2xl p-5 space-y-3 fade-up fade-up-5" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>{t.recentActivity}</p>
            <div className="space-y-2">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ background: `${scoreColor(attempt.readiness_score)}15`, color: scoreColor(attempt.readiness_score) }}>
                      {attempt.readiness_score}
                    </div>
                    <p className="text-sm" style={{ color: '#9aa3b0' }}>{attempt.correct_count}/{attempt.total_count} correct</p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(attempt.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentAttempts.length === 0 && overallScore === null && (
          <div className="rounded-2xl p-10 text-center space-y-4 fade-up fade-up-3" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{t.readyWhenYouAre}</p>
            <p className="text-sm" style={{ color: '#7a8394' }}>{t.takeFirstQuiz}</p>
            <Link href="/quiz"
              className="inline-block mt-2 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {t.startAQuiz}
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
