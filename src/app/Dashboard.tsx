'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isPro } from '@/lib/plans'

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

function ExamSwitcher({ activeExam, allExams, onSwitch, onSignOut, name }: {
  activeExam: Exam; allExams: Exam[]; onSwitch: (id: string) => void; onSignOut: () => void; name: string
}) {
  const [open, setOpen] = useState(false)

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
        <span className="truncate max-w-[130px] font-medium text-[var(--text-primary)]">{activeExam.name}</span>
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
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Dashboard({
  name, greeting, date, streak, overallScore, predictedGrade,
  topicMastery, examTopics, lastAttempt, recentAttempts,
  weakIds, weakSubtopicNames, skillStats,
  activeExam, allExams, examDaysLeft, userPlan = 'free',
}: Props) {
  const router = useRouter()
  const pro = isPro(userPlan as any, null)

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
        <div className="flex items-center justify-between fade-up fade-up-1 relative z-10">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium tracking-wide uppercase">{date}</p>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mt-0.5">{greeting}, {name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs font-medium text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5cb88a]" />
                {streak}d
              </div>
            )}
            <ExamSwitcher activeExam={activeExam} allExams={allExams} onSwitch={switchExam} onSignOut={signOut} name={name} />
          </div>
        </div>

        {/* Exam context */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-[var(--border-subtle)] fade-up fade-up-2">
          <div className="flex flex-wrap gap-1.5">
            {examTopics.map((t) => (
              <span key={t} className="text-xs text-[var(--text-tertiary)] bg-white/5 px-2 py-0.5 rounded-md">
                {TOPIC_SHORT[t] ?? t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            {examDaysLeft !== null && examDaysLeft >= 0 && (
              <span className={`text-xs font-medium whitespace-nowrap ${daysUrgency(examDaysLeft)}`}>
                {daysLabel(examDaysLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Upgrade banner — subtle, premium */}
        {!pro && (
          <Link href="/upgrade" className="block fade-up fade-up-2 group">
            <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-muted)] px-4 py-3.5 flex items-center justify-between hover:border-[var(--accent)]/40 transition-all duration-300">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Exam Mode</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Unlock all topics, weak topics & study plan — €19.99</p>
              </div>
              <span className="text-[var(--accent)] text-sm font-medium shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </Link>
        )}

        {/* Readiness — emotional center */}
        {overallScore !== null ? (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 fade-up fade-up-3">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-4">{activeExam.name}</p>
            <div className="flex items-center gap-6">
              <ReadinessRing score={overallScore} />
              <div className="flex-1 min-w-0">
                {pro ? (
                  <>
                    <p className="text-lg font-semibold text-[var(--text-primary)]" style={{ color: scoreColor(overallScore) }}>
                      {scoreLabel(overallScore)}
                    </p>
                    {strongest && weakest && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed">
                        Strong in {TOPIC_SHORT[strongest.topic] ?? strongest.topic} · Weakest in {TOPIC_SHORT[weakest.topic] ?? weakest.topic}
                      </p>
                    )}
                    {predictedGrade && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs bg-white/8 px-2.5 py-1 rounded-lg font-medium text-[var(--text-primary)]">
                          Predicted grade {predictedGrade.grade}
                        </span>
                        {predictedGrade.grade < 7 && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            +{predictedGrade.neededFor - overallScore}% → grade {predictedGrade.nextGrade}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-[var(--text-primary)]">You're not fully ready</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed">Unlock your weak topic breakdown to know exactly what to study</p>
                    <Link href="/upgrade" className="inline-block mt-3 text-xs font-medium text-[var(--accent)] hover:opacity-80 transition-opacity">
                      See full breakdown →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-8 text-center fade-up fade-up-3 space-y-2">
            <p className="text-[var(--text-primary)] font-medium">No data yet</p>
            <p className="text-sm text-[var(--text-tertiary)]">Take your first quiz to see your readiness score</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-3 fade-up fade-up-3">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Practice</p>
          <div className="grid grid-cols-2 gap-2.5">
            {weakIds.length > 0 && (
              <Link href={`/quiz/take?subtopics=${weakIds.join(',')}`}
                className="rounded-xl bg-[var(--bg-elevated)] hover:bg-white/8 border border-[var(--border-subtle)] p-4 transition-colors group">
                <p className="text-sm font-medium text-[var(--text-primary)]">Weak topics</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">{weakSubtopicNames.slice(0, 2).join(', ')}</p>
              </Link>
            )}
            <Link href="/quiz"
              className="rounded-xl bg-[var(--bg-elevated)] hover:bg-white/8 border border-[var(--border-subtle)] p-4 transition-colors">
              <p className="text-sm font-medium text-[var(--text-primary)]">By topic</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Choose subtopics</p>
            </Link>
            <Link href="/quiz/random"
              className="rounded-xl bg-[var(--bg-elevated)] hover:bg-white/8 border border-[var(--border-subtle)] p-4 transition-colors">
              <p className="text-sm font-medium text-[var(--text-primary)]">Random mix</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">All exam topics</p>
            </Link>
            <Link href="/quiz/mock"
              className="rounded-xl bg-[var(--bg-elevated)] hover:bg-white/8 border border-[var(--border-subtle)] p-4 transition-colors">
              <p className="text-sm font-medium text-[var(--text-primary)]">Mock exam</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">60 min · timed</p>
            </Link>
          </div>
        </div>

        {/* Last attempt */}
        {lastAttempt && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 fade-up fade-up-4">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-4">Last session</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                  style={{ background: `${scoreColor(lastAttempt.readiness_score)}15`, color: scoreColor(lastAttempt.readiness_score) }}>
                  {lastAttempt.readiness_score}%
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{lastAttempt.correct_count} of {lastAttempt.total_count} correct</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{formatDate(lastAttempt.created_at)}</p>
                </div>
              </div>
              <Link
                href={weakIds.length > 0 ? `/quiz/take?subtopics=${weakIds.join(',')}` : '/quiz'}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] px-3 py-1.5 rounded-lg hover:border-white/15"
              >
                {weakIds.length > 0 ? 'Retake weak' : 'New quiz'}
              </Link>
            </div>
          </div>
        )}

        {/* Topic mastery */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 fade-up fade-up-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Topic mastery</p>
          <div className="space-y-3.5">
            {examTopics.map((topic) => {
              const entry = topicMastery.find((t) => t.topic === topic)
              const score = entry?.score
              return (
                <div key={topic} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-[var(--text-secondary)]">{TOPIC_SHORT[topic] ?? topic}</span>
                    {score !== undefined ? (
                      <span className="text-xs font-semibold tabular-nums" style={{ color: scoreColor(score) }}>{score}%</span>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">No data</span>
                    )}
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    {score !== undefined && (
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${score}%`, backgroundColor: scoreColor(score), opacity: 0.8 }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Skill patterns — pro only */}
        {pro && (masteredSkills.length > 0 || strugglingSkills.length > 0) && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 fade-up fade-up-5">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Skill patterns</p>
            {masteredSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[#5cb88a] font-medium">Mastered</p>
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((skill) => (
                    <span key={skill} className="text-xs bg-[#5cb88a]/10 border border-[#5cb88a]/15 text-[#5cb88a] px-2.5 py-1 rounded-lg">
                      {formatSkillTag(skill)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {strugglingSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--accent)] font-medium">Needs work</p>
                <div className="flex flex-wrap gap-1.5">
                  {strugglingSkills.map((skill) => (
                    <span key={skill} className="text-xs bg-[var(--accent-muted)] border border-[var(--accent)]/15 text-[var(--accent)] px-2.5 py-1 rounded-lg">
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
          <Link href="/upgrade" className="block rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 hover:border-white/10 transition-colors fade-up fade-up-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-1">Skill patterns</p>
                <p className="text-sm text-[var(--text-tertiary)]">Unlock to see which skills need work</p>
              </div>
              <span className="text-[var(--text-tertiary)] text-base">🔒</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 opacity-20 pointer-events-none select-none">
              {['Algebra', 'Integration', 'Probability', 'Trig'].map(s => (
                <span key={s} className="text-xs bg-[var(--accent-muted)] border border-[var(--accent)]/15 text-[var(--accent)] px-2.5 py-1 rounded-lg">{s}</span>
              ))}
            </div>
          </Link>
        )}

        {/* Recent activity */}
        {recentAttempts.length > 1 && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-3 fade-up fade-up-5">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Recent activity</p>
            <div className="space-y-2">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ background: `${scoreColor(attempt.readiness_score)}15`, color: scoreColor(attempt.readiness_score) }}>
                      {attempt.readiness_score}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{attempt.correct_count}/{attempt.total_count} correct</p>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatDate(attempt.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentAttempts.length === 0 && overallScore === null && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-10 text-center space-y-4 fade-up fade-up-3">
            <p className="text-[var(--text-secondary)] font-medium">Ready when you are</p>
            <p className="text-sm text-[var(--text-tertiary)]">Take your first quiz to start tracking your readiness</p>
            <Link href="/quiz"
              className="inline-block mt-2 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Start a quiz
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
