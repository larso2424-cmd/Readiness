import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import TopicSelector from './TopicSelector'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function QuizPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()

  let examTopics: string[] = []
  if (user) {
    const { data: userData } = await supabase.from('users').select('active_exam_id').eq('id', user.id).single()
    if (userData?.active_exam_id) {
      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('topic')
        .eq('exam_id', userData.active_exam_id)
      examTopics = (topicsData ?? []).map((r: any) => r.topic as string)
    }
  }

  const { data: subtopics } = await supabase
    .from('subtopics')
    .select('id, topic, subtopic, display_order')
    .order('display_order')

  const { data: available } = await supabase
    .from('generated_questions')
    .select('subtopic_id')
    .eq('status', 'approved')

  const availableIds = new Set((available ?? []).map((r: any) => r.subtopic_id))
  const allFiltered = (subtopics ?? []).filter((s: any) => availableIds.has(s.id))
  const examFiltered = examTopics.length > 0
    ? allFiltered.filter((s: any) => examTopics.includes(s.topic))
    : allFiltered

  return (
    <TopicSelector
      subtopics={examFiltered}
      allSubtopics={allFiltered}
      requireAuth={!user}
      examTopics={examTopics}
    />
  )
}
