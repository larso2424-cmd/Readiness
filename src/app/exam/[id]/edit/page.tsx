import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import ExamEditClient from './ExamEditClient'
import { getActivePlan } from '@/lib/plans'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function ExamEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: exam } = await supabase
    .from('exams')
    .select('id, name, exam_date, paper_type, target_grade, user_id, course')
    .eq('id', id)
    .single()

  if (!exam || exam.user_id !== user.id) notFound()

  const { data: userData } = await supabase.from('users').select('plan, plan_expires_at').eq('id', user.id).single()
  const isOwner = user.email === process.env.UNLIMITED_EMAIL
  const userPlan = isOwner ? 'study_plan' : getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)
  const pro = isOwner || userPlan === 'exam_mode' || userPlan === 'study_plan'

  const { data: topicsData } = await supabase
    .from('exam_topics')
    .select('topic')
    .eq('exam_id', id)

  const topics = (topicsData ?? []).map((r: any) => r.topic as string)

  return (
    <ExamEditClient
      examId={id}
      initialName={exam.name}
      initialDate={exam.exam_date}
      initialPaperType={exam.paper_type ?? 'both'}
      initialTargetGrade={exam.target_grade}
      initialTopics={topics}
      course={exam.course ?? 'aa'}
      pro={pro}
    />
  )
}
