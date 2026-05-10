import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Dashboard from './Dashboard'
import MathBackground from './MathBackground'
import { getActivePlan } from '@/lib/plans'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'


function computeStreak(attempts: { created_at: string }[]): number {
  if (!attempts.length) return 0
  const days = new Set(attempts.map((a) => new Date(a.created_at).toLocaleDateString('en-CA')))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (days.has(d.toLocaleDateString('en-CA'))) streak++
    else if (i > 0) break
  }
  return streak
}

function predictGrade(score: number | null, target: number | null): { grade: number; nextGrade: number; neededFor: number; target: number | null } | null {
  if (score === null) return null
  const boundaries = [
    { grade: 7, min: 80 }, { grade: 6, min: 65 }, { grade: 5, min: 50 },
    { grade: 4, min: 35 }, { grade: 3, min: 20 }, { grade: 2, min: 10 }, { grade: 1, min: 0 },
  ]
  const current = boundaries.find((b) => score >= b.min)!
  const next = boundaries.find((b) => b.grade === current.grade + 1)
  return { grade: current.grade, nextGrade: current.grade + 1, neededFor: next?.min ?? 100, target }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

export default async function Home() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <MathBackground />
        <div className="relative max-w-sm w-full text-center space-y-6 fade-up fade-up-1" style={{ zIndex: 1, background: 'var(--bg)', borderRadius: '2rem', padding: '2.5rem 1.5rem' }}>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>StudyReady</h1>
            <div className="flex gap-2 justify-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#1d3557', color: '#60a5fa' }}>AA SL</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#2d1d57', color: '#a78bfa' }}>AI SL</span>
            </div>
          </div>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>Know exactly what to study<br />before your IB Math exam.</p>
          <div className="flex flex-col gap-2">
            <Link href="/auth/signup" className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity" style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>
              Get started free
            </Link>
            <Link href="/auth/login" className="w-full py-3 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Fetch user profile + all their exams
  const [{ data: userData }, { data: examsData }] = await Promise.all([
    supabase.from('users').select('active_exam_id, plan, plan_expires_at').eq('id', user.id).single(),
    supabase.from('exams').select('id, name, exam_date, target_grade, archived, course').eq('user_id', user.id).eq('archived', false).order('exam_date', { ascending: true, nullsFirst: false }),
  ])

  const isOwner = user.email === process.env.UNLIMITED_EMAIL
  const userPlan = isOwner ? 'study_plan' : getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)

  const allExams = examsData ?? []

  // If no exams at all → redirect to create first exam
  if (allExams.length === 0) redirect('/exam/new')

  // Determine active exam (from profile, or first upcoming)
  const activeExamId = userData?.active_exam_id ?? allExams[0]?.id
  const activeExam = allExams.find((e) => e.id === activeExamId) ?? allExams[0]

  // Fetch active exam's topics
  const { data: examTopicsData } = await supabase
    .from('exam_topics')
    .select('topic')
    .eq('exam_id', activeExam.id)
  const examTopics = (examTopicsData ?? []).map((r: any) => r.topic as string)

  // Fetch all subtopics
  const { data: subtopics } = await supabase
    .from('subtopics')
    .select('id, topic, subtopic, display_order')
    .order('display_order')
  const allSubtopics = subtopics ?? []
  const subtopicToTopic: Record<string, string> = {}
  for (const s of allSubtopics) subtopicToTopic[s.id] = s.topic

  // Quiz attempts (for streak + last attempt)
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, readiness_score, correct_count, total_count, subtopics_selected, weak_subtopics, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const allAttempts = attempts ?? []
  const streak = computeStreak(allAttempts)

  // Last attempt scoped to this exam's topics
  const examTopicSet = new Set(examTopics)
  const examAttempts = allAttempts.filter((a) => {
    const tested = (a.subtopics_selected as string[]).map((id) => subtopicToTopic[id]).filter(Boolean)
    return tested.some((t) => examTopicSet.has(t))
  })
  const lastAttempt = examAttempts[0] ?? null

  // Per-topic accuracy from question_attempts (scoped to exam topics)
  const { data: questionAttempts } = await supabase
    .from('question_attempts')
    .select('question_id, correct')
    .eq('user_id', user.id)

  const questionIds = [...new Set((questionAttempts ?? []).map((qa: any) => qa.question_id))]
  let questionSubtopicMap: Record<string, string> = {}
  let skillMap: Record<string, string[]> = {}

  if (questionIds.length > 0) {
    const { data: qs } = await supabase
      .from('generated_questions')
      .select('id, subtopic_id, skills')
      .in('id', questionIds)
    for (const q of qs ?? []) {
      questionSubtopicMap[q.id] = q.subtopic_id
      skillMap[q.id] = q.skills ?? []
    }
  }

  const topicAccuracy: Record<string, { correct: number; total: number }> = {}
  const skillStats: Record<string, { correct: number; total: number }> = {}

  for (const qa of questionAttempts ?? []) {
    const subtopicId = questionSubtopicMap[qa.question_id]
    const topic = subtopicId ? subtopicToTopic[subtopicId] : null
    if (topic) {
      if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 }
      topicAccuracy[topic].total++
      if (qa.correct) topicAccuracy[topic].correct++
    }
    for (const skill of skillMap[qa.question_id] ?? []) {
      if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0 }
      skillStats[skill].total++
      if (qa.correct) skillStats[skill].correct++
    }
  }

  const TOPIC_ORDER = ['Number and Algebra', 'Functions', 'Geometry and Trigonometry', 'Statistics and Probability', 'Calculus']

  // Topic mastery scoped to exam topics
  const topicMastery = examTopics
    .map((topic) => {
      const acc = topicAccuracy[topic]
      return acc ? { topic, score: Math.round((acc.correct / acc.total) * 100) } : null
    })
    .filter(Boolean) as { topic: string; score: number }[]

  // Overall readiness = average across exam topics with data
  const overallScore = topicMastery.length > 0
    ? Math.round(topicMastery.reduce((sum, t) => sum + t.score, 0) / topicMastery.length)
    : null

  const predictedGrade = predictGrade(overallScore, activeExam.target_grade ?? null)
  const examDaysLeft = daysUntil(activeExam.exam_date)

  // Weak subtopics from last exam-scoped attempt
  const weakIds = (lastAttempt?.weak_subtopics ?? []) as string[]
  const weakSubtopicNames = allSubtopics
    .filter((s) => weakIds.includes(s.id) && examTopicSet.has(s.topic))
    .map((s) => s.subtopic)

  const rawName = user.email?.split('@')[0] ?? 'there'
  const firstName = rawName.split(/[._\-\d]/)[0] || rawName
  // Capitalise first letter, lowercase rest
  const name = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()

  return (
    <Dashboard
      name={name}
      greeting=""
      date=""
      streak={streak}
      overallScore={overallScore}
      predictedGrade={predictedGrade}
      topicMastery={topicMastery}
      examTopics={examTopics}
      lastAttempt={lastAttempt}
      recentAttempts={examAttempts.slice(0, 5)}
      weakIds={weakIds}
      weakSubtopicNames={weakSubtopicNames}
      skillStats={skillStats}
      activeExam={activeExam}
      allExams={allExams}
      examDaysLeft={examDaysLeft}
      userPlan={userPlan}
    />
  )
}
