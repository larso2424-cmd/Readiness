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
  if (score >= 70) return '#22c55e'
  if (score >= 30) return '#f97316'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Mastered'
  if (score >= 70) return 'Solid'
  if (score >= 50) return 'Getting there'
  if (score >= 30) return 'Needs work'
  return 'Struggling'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatSkillTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function urgencyColor(days: number | null): string {
  if (days === null) return 'text-gray-500'
  if (days < 0) return 'text-gray-600'
  if (days <= 14) return 'text-red-400'
  if (days <= 42) return 'text-amber-400'
  return 'text-green-400'
}

function daysLabel(days: number | null): string {
  if (days === null) return 'no date set'
  if (days < 0) return 'past'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 14) return `${days} days`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  return `${Math.round(days / 30)} months`
}

function RadialScore({ score }: { score: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = scoreColor(score)
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="absolute" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#374151" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="text-xl font-bold text-white">{score}%</span>
    </div>
  )
}

function ExamSwitcher({ activeExam, allExams, onSwitch, onSignOut, name }: {
  activeExam: Exam
  allExams: Exam[]
  onSwitch: (id: string) => void
  onSignOut: () => void
  name: string
}) {
  const [open, setOpen] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full text-sm transition-colors max-w-[180px]"
      >
        {activeExam.course && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${activeExam.course === 'ai' ? 'bg-purple-600' : 'bg-blue-600'} text-white`}>
            {activeExam.course === 'ai' ? 'AI' : 'AA'}
          </span>
        )}
        <span className="truncate font-medium">{activeExam.name}</span>
        <span className="text-gray-400 shrink-0">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-500 font-medium px-2 py-1.5">Your exams</p>
              {allExams.map((exam) => (
                <div key={exam.id} className={`flex items-center gap-1 rounded-xl ${exam.id === activeExam.id ? 'bg-gray-700' : 'hover:bg-gray-700'}`}>
                  <button
                    onClick={() => { setOpen(false); onSwitch(exam.id) }}
                    className="flex-1 text-left px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1.5">
                      {exam.course && (
                        <span className={`text-xs font-bold px-1 py-0.5 rounded ${exam.course === 'ai' ? 'bg-purple-600' : 'bg-blue-600'} text-white`}>
                          {exam.course === 'ai' ? 'AI' : 'AA'}
                        </span>
                      )}
                      <p className="text-sm font-medium text-white">{exam.name}</p>
                    </div>
                    {exam.exam_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </button>
                  <Link
                    href={`/exam/${exam.id}/edit`}
                    onClick={() => setOpen(false)}
                    className="px-2 py-2 text-gray-600 hover:text-gray-300 transition-colors text-xs shrink-0"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 p-2">
              <Link
                href="/exam/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-sm text-blue-400"
              >
                + New exam
              </Link>
              <button
                onClick={() => { setOpen(false); onSignOut() }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-sm text-gray-400"
              >
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
    await fetch('/api/exam/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: examId }),
    })
    router.refresh()
  }

  const sorted = [...topicMastery]
  const strongest = sorted.length > 1 ? [...sorted].sort((a, b) => b.score - a.score)[0] : null
  const weakest = sorted.length > 1 ? [...sorted].sort((a, b) => a.score - b.score)[0] : null

  const masteredSkills = Object.entries(skillStats)
    .filter(([, s]) => s.total >= 3 && s.correct / s.total >= 0.75)
    .map(([skill]) => skill)
  const strugglingSkills = Object.entries(skillStats)
    .filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.4)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 4)
    .map(([skill]) => skill)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-gray-400 text-sm shrink-0">{date}</p>
            <div className="flex items-center gap-2 shrink-0">
              {streak > 0 && (
                <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full text-sm whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <span className="font-medium">{streak}d</span>
                </div>
              )}
              <ExamSwitcher
                activeExam={activeExam}
                allExams={allExams}
                onSwitch={switchExam}
                onSignOut={signOut}
                name={name}
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{greeting}, {name}</h1>
        </div>

        {/* Exam context bar */}
        <div className="flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {examTopics.map((t) => (
              <span key={t} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-md">
                {TOPIC_SHORT[t] ?? t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            {examDaysLeft !== null && (
              <span className={`text-xs font-medium whitespace-nowrap ${urgencyColor(examDaysLeft)}`}>
                {daysLabel(examDaysLeft)}
              </span>
            )}
            <Link href="/exam/new" className="text-xs text-gray-600 hover:text-gray-400 transition-colors whitespace-nowrap">
              + exam
            </Link>
          </div>
        </div>

        {/* Upgrade banner for free users */}
        {!pro && (
          <Link href="/upgrade" className="block bg-gradient-to-r from-orange-950 to-gray-900 border border-orange-500/30 rounded-2xl px-4 py-3.5 hover:border-orange-500/60 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">🔥 Exam Mode — €19.99</p>
                <p className="text-xs text-gray-400 mt-0.5">Unlock all topics, weak topic breakdown & study plan</p>
              </div>
              <span className="text-orange-400 text-sm font-bold shrink-0">Upgrade →</span>
            </div>
          </Link>
        )}

        {/* Readiness */}
        {overallScore !== null ? (
          <div className="bg-gray-900 rounded-2xl p-5 flex items-center gap-5">
            <RadialScore score={overallScore} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Readiness for {activeExam.name}</p>
              {pro ? (
                <>
                  <p className="text-lg font-semibold mt-0.5" style={{ color: scoreColor(overallScore) }}>
                    {scoreLabel(overallScore)}
                  </p>
                  {strongest && weakest && (
                    <p className="text-xs text-gray-400 mt-1">
                      Strongest: {TOPIC_SHORT[strongest.topic] ?? strongest.topic}
                      {' · '}
                      Weakest: {TOPIC_SHORT[weakest.topic] ?? weakest.topic}
                    </p>
                  )}
                  {predictedGrade && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-gray-800 px-2.5 py-1 rounded-full font-semibold text-white">
                        Predicted grade {predictedGrade.grade}
                      </span>
                      {predictedGrade.target && predictedGrade.grade < predictedGrade.target && (
                        <span className="text-xs text-amber-400 font-medium">
                          +{predictedGrade.neededFor - overallScore}% to hit grade {predictedGrade.target}
                        </span>
                      )}
                      {predictedGrade.grade < 7 && !predictedGrade.target && (
                        <span className="text-xs text-gray-500">
                          +{predictedGrade.neededFor - overallScore}% → grade {predictedGrade.nextGrade}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold mt-0.5 text-white">You're not fully ready 🔒</p>
                  <p className="text-xs text-gray-500 mt-1">Unlock weak topic breakdown to see exactly what to fix</p>
                  <Link href="/upgrade" className="inline-block mt-2 text-xs text-orange-400 font-medium hover:text-orange-300 transition-colors">
                    Unlock full breakdown →
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-5 text-center space-y-1">
            <p className="text-gray-300 font-medium">No quiz data yet for this exam</p>
            <p className="text-gray-500 text-sm">Take a quiz to see your readiness score.</p>
          </div>
        )}

        {/* Continue where you left off */}
        {lastAttempt && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-gray-400">Pick up where you left off</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${scoreColor(lastAttempt.readiness_score)}22`, color: scoreColor(lastAttempt.readiness_score) }}
                >
                  {lastAttempt.readiness_score}%
                </div>
                <div>
                  <p className="font-medium text-sm">Last quiz</p>
                  <p className="text-xs text-gray-400">
                    {lastAttempt.correct_count} of {lastAttempt.total_count} correct · {formatDate(lastAttempt.created_at)}
                  </p>
                </div>
              </div>
              {weakIds.length > 0 ? (
                <Link href={`/quiz/take?subtopics=${weakIds.join(',')}`}
                  className="bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                  Retake weak
                </Link>
              ) : (
                <Link href="/quiz"
                  className="bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                  New quiz
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Quick access */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-medium text-gray-400">Check your readiness</p>
          <div className="grid grid-cols-2 gap-2">
            {weakIds.length > 0 && (
              <Link href={`/quiz/take?subtopics=${weakIds.join(',')}`}
                className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3.5 transition-colors">
                <p className="font-medium text-sm">Focus weak topics</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{weakSubtopicNames.slice(0, 2).join(', ')}</p>
              </Link>
            )}
            <Link href="/quiz" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3.5 transition-colors">
              <p className="font-medium text-sm">By topic</p>
              <p className="text-xs text-gray-400 mt-0.5">Pick subtopics</p>
            </Link>
            <Link href="/quiz/random" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3.5 transition-colors">
              <p className="font-medium text-sm">Random mix</p>
              <p className="text-xs text-gray-400 mt-0.5">All exam topics</p>
            </Link>
            <Link href="/quiz/mock" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3.5 transition-colors">
              <p className="font-medium text-sm">Mock exam</p>
              <p className="text-xs text-gray-400 mt-0.5">{activeExam.name} · 60 min</p>
            </Link>
          </div>
        </div>

        {/* Skill patterns */}
        {pro && (masteredSkills.length > 0 || strugglingSkills.length > 0) && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-medium text-gray-400">Skill patterns</p>
            {masteredSkills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-green-400 font-medium uppercase tracking-wide">Mastered</p>
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((skill) => (
                    <span key={skill} className="text-xs bg-green-950 border border-green-900 text-green-300 px-2 py-1 rounded-md">
                      {formatSkillTag(skill)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {strugglingSkills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-orange-400 font-medium uppercase tracking-wide">Still working on</p>
                <div className="flex flex-wrap gap-1.5">
                  {strugglingSkills.map((skill) => (
                    <span key={skill} className="text-xs bg-orange-950 border border-orange-900 text-orange-300 px-2 py-1 rounded-md">
                      {formatSkillTag(skill)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Locked skill patterns for free users */}
        {!pro && overallScore !== null && (
          <Link href="/upgrade" className="block bg-gray-900 rounded-2xl p-5 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Skill patterns & weak topics</p>
                <p className="text-xs text-gray-600 mt-1">See exactly which skills are costing you marks</p>
              </div>
              <span className="text-lg">🔒</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 opacity-30 pointer-events-none select-none">
              {['Algebra', 'Integration', 'Probability', 'Trigonometry'].map(s => (
                <span key={s} className="text-xs bg-orange-950 border border-orange-900 text-orange-300 px-2 py-1 rounded-md">{s}</span>
              ))}
            </div>
          </Link>
        )}

        {/* Topic mastery */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-medium text-gray-400">Topic mastery</p>
          <div className="space-y-3">
            {examTopics.map((topic) => {
              const entry = topicMastery.find((t) => t.topic === topic)
              const score = entry?.score
              return (
                <div key={topic} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">{TOPIC_SHORT[topic] ?? topic}</span>
                    {score !== undefined ? (
                      <span className="font-medium tabular-nums" style={{ color: scoreColor(score) }}>{score}%</span>
                    ) : (
                      <span className="text-xs text-gray-600">No data yet</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    {score !== undefined && (
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${score}%`, backgroundColor: scoreColor(score) }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        {recentAttempts.length > 1 && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-gray-400">Recent activity</p>
            <div className="space-y-2">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `${scoreColor(attempt.readiness_score)}22`, color: scoreColor(attempt.readiness_score) }}>
                      {attempt.readiness_score}
                    </div>
                    <p className="text-sm text-gray-300">{attempt.correct_count}/{attempt.total_count} correct</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(attempt.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentAttempts.length === 0 && overallScore === null && (
          <div className="bg-gray-900 rounded-2xl p-8 text-center space-y-3">
            <p className="text-gray-400">No quizzes yet for this exam</p>
            <Link href="/quiz"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
              Take your first quiz
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
