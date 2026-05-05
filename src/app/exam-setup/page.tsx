import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ExamSetupClient from './ExamSetupClient'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function ExamSetupPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('exam_topics')
    .eq('id', user.id)
    .single()

  return (
    <ExamSetupClient
      userId={user.id}
      currentTopics={(userData?.exam_topics ?? []) as string[]}
    />
  )
}
