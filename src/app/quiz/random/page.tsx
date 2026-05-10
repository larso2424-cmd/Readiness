import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActivePlan, FREE_TOPICS } from '@/lib/plans'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function RandomQuizPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plan, plan_expires_at, active_exam_id')
    .eq('id', user.id)
    .single()

  const isOwner = user.email === process.env.UNLIMITED_EMAIL
  const userPlan = isOwner ? 'study_plan' : getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)
  const pro = isOwner || userPlan === 'exam_mode' || userPlan === 'study_plan'

  // Get exam topics if active exam exists
  let allowedTopics: string[] | null = null
  if (userData?.active_exam_id) {
    const { data: examTopics } = await supabase
      .from('exam_topics')
      .select('topic')
      .eq('exam_id', userData.active_exam_id)
    if (examTopics?.length) {
      allowedTopics = examTopics.map((r: any) => r.topic as string)
    }
  }

  // Restrict to free topics if not pro
  const topicFilter = pro ? allowedTopics : FREE_TOPICS

  const { data: available } = await supabase
    .from('generated_questions')
    .select('subtopic_id, subtopics!inner(topic)')
    .eq('status', 'approved')

  let ids = [...new Set((available ?? []).map((r: any) => ({
    id: r.subtopic_id as string,
    topic: r.subtopics?.topic as string,
  })))]

  // Filter by allowed topics
  if (topicFilter) {
    ids = ids.filter(s => topicFilter.includes(s.topic))
  }

  if (ids.length === 0) redirect('/quiz')

  const shuffled = ids.sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, 6).map(s => s.id)

  redirect(`/quiz/take?subtopics=${picked.join(',')}`)
}
