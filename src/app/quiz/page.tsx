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
  let examCourse: string = 'aa'

  if (user) {
    const { data: userData } = await supabase.from('users').select('active_exam_id').eq('id', user.id).single()
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

  // Filter subtopics by course (show course-specific + shared)
  const courseFiltered = (subtopics ?? []).filter((s: any) => {
    if (!availableIds.has(s.id)) return false
    const c = s.course ?? 'aa'
    return c === examCourse || c === 'both'
  })

  const examFiltered = examTopics.length > 0
    ? courseFiltered.filter((s: any) => examTopics.includes(s.topic))
    : courseFiltered

  return (
    <TopicSelector
      subtopics={examFiltered}
      allSubtopics={courseFiltered}
      requireAuth={!user}
      examTopics={examTopics}
    />
  )
}
