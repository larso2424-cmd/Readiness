import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import TopicSelector from './TopicSelector'
import { isPro, FREE_TOPICS, getActivePlan } from '@/lib/plans'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function QuizPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()

  let examTopics: string[] = []
  let examCourse: string = 'aa'
  let userPlan = 'free'
  let quizzesToday = 0

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('active_exam_id, plan, plan_expires_at')
      .eq('id', user.id)
      .single()

    userPlan = getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)

    // Count quizzes today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
    quizzesToday = count ?? 0

    if (userData?.active_exam_id) {
      const { data: examData } = await supabase
        .from('exams')
        .select('course')
        .eq('id', userData.active_exam_id)
        .single()
      examCourse = examData?.course ?? 'aa'

      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('topic')
        .eq('exam_id', userData.active_exam_id)
      examTopics = (topicsData ?? []).map((r: any) => r.topic as string)
    }
  }

  const { data: subtopics } = await supabase
    .from('subtopics')
    .select('id, topic, subtopic, display_order, course')
    .order('display_order')

  const { data: available } = await supabase
    .from('generated_questions')
    .select('subtopic_id')
    .eq('status', 'approved')

  const availableIds = new Set((available ?? []).map((r: any) => r.subtopic_id))

  const pro = isPro(userPlan as any, null)

  // Filter subtopics by course
  const courseFiltered = (subtopics ?? []).filter((s: any) => {
    if (!availableIds.has(s.id)) return false
    const c = s.course ?? 'aa'
    // Free users only see their chosen subject (aa by default)
    if (!pro && examCourse !== c && c !== 'both') return false
    return c === examCourse || c === 'both'
  })

  // For exam filter: scope to exam topics but always show all course topics for free users so they see locked ones
  const examFiltered = examTopics.length > 0
    ? courseFiltered.filter((s: any) => examTopics.includes(s.topic))
    : courseFiltered

  // For free users, merge in all course topics so locked ones are always visible
  const displaySubtopics = pro
    ? examFiltered
    : courseFiltered  // show everything so locked topics are visible

  return (
    <TopicSelector
      subtopics={displaySubtopics}
      allSubtopics={courseFiltered}
      requireAuth={!user}
      examTopics={examTopics}
      userPlan={userPlan}
      quizzesToday={quizzesToday}
      freeTopics={FREE_TOPICS}
    />
  )
}
