import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QuizClient from './QuizClient'
import { getActivePlan, FREE_TOPICS } from '@/lib/plans'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function TakePage({
  searchParams,
}: {
  searchParams: Promise<{ subtopics?: string }>
}) {
  const params = await searchParams
  const subtopicIds = (params.subtopics ?? '').split(',').filter(Boolean)

  if (subtopicIds.length === 0) redirect('/quiz')

  // Get authenticated user
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check user plan
  const { data: userData } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()
  const isUnlimited = user.email === process.env.UNLIMITED_EMAIL
  const userPlan = isUnlimited ? 'study_plan' : getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)
  const pro = isUnlimited || userPlan === 'exam_mode' || userPlan === 'study_plan'

  // Server-side topic restriction for free users
  if (!pro && !isUnlimited) {
    const { data: subtopicRows } = await supabase
      .from('subtopics')
      .select('id, topic')
      .in('id', subtopicIds)
    const hasLockedTopic = (subtopicRows ?? []).some(s => !FREE_TOPICS.includes(s.topic))
    if (hasLockedTopic) redirect('/upgrade')
  }

  // Daily limit check — 1 quiz per day
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfDay.toISOString())

  if (!isUnlimited && !pro && (count ?? 0) >= 1) {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const hoursLeft = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60))

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="bg-gray-900 rounded-2xl p-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto text-2xl">
              🔒
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-semibold text-lg">Quiz limit reached</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                One quiz per day keeps the learning consistent. Your next quiz unlocks in{' '}
                <span className="text-white font-medium">{hoursLeft}h</span>.
              </p>
            </div>
            <div className="pt-1 space-y-2">
              <Link
                href="/"
                className="block w-full bg-white text-gray-900 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
              >
                Back to dashboard
              </Link>
              <Link
                href="/quiz"
                className="block w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
              >
                View topics
              </Link>
            </div>
          </div>
          <p className="text-gray-600 text-xs">
            Spaced repetition works best with consistent daily practice.
          </p>
        </div>
      </div>
    )
  }

  // Fetch approved questions for selected subtopics
  const { data: allQuestions } = await supabase
    .from('generated_questions')
    .select(`
      id, question_text, option_a, option_b, option_c, option_d,
      correct_answer, explanation, difficulty,
      subtopics!inner(id, topic, subtopic)
    `)
    .eq('status', 'approved')
    .in('subtopic_id', subtopicIds)

  if (!allQuestions?.length) redirect('/quiz')

  const subtopicIdSet = new Set(subtopicIds)

  const bySubtopic: Record<string, any[]> = {}
  for (const q of allQuestions) {
    const sid = (q as any).subtopics.id
    if (!subtopicIdSet.has(sid)) continue
    if (!bySubtopic[sid]) bySubtopic[sid] = []
    bySubtopic[sid].push(q)
  }

  const selectedIds = subtopicIds.filter((id) => bySubtopic[id]?.length)
  // 2 questions per subtopic, minimum 6, maximum 28
  const perSubtopic = 2
  const maxTotal = Math.max(6, selectedIds.length * perSubtopic)

  const picked: any[] = []
  for (const sid of selectedIds) {
    const pool = [...(bySubtopic[sid] ?? [])].sort(() => Math.random() - 0.5)
    picked.push(...pool.slice(0, perSubtopic))
  }

  const seen = new Set<string>()
  const questions = picked
    .filter((q) => { if (seen.has(q.id)) return false; seen.add(q.id); return true })
    .sort(() => Math.random() - 0.5)
    .slice(0, maxTotal)
    .map((q) => {
      const labels = ['A', 'B', 'C', 'D'] as const
      const origOptions = {
        A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d,
      } as Record<string, string>
      const correctText = origOptions[q.correct_answer]

      // Shuffle option texts
      const texts = [q.option_a, q.option_b, q.option_c, q.option_d]
        .sort(() => Math.random() - 0.5)

      const shuffled = Object.fromEntries(labels.map((l, i) => [l, texts[i]])) as Record<string, string>
      const newCorrect = labels.find((l) => shuffled[l] === correctText) ?? q.correct_answer

      return {
        id: q.id,
        question_text: q.question_text,
        option_a: shuffled.A,
        option_b: shuffled.B,
        option_c: shuffled.C,
        option_d: shuffled.D,
        correct_answer: newCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty,
        subtopic_id: q.subtopics.id,
        subtopic: q.subtopics.subtopic,
        topic: q.subtopics.topic,
      }
    })

  return <QuizClient questions={questions} subtopicIds={subtopicIds} userId={user.id} />
}
