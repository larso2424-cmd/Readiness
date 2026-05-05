import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamFormClient from './ExamFormClient'

export const dynamic = 'force-dynamic'

export default async function NewExamPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  return <ExamFormClient userId={user.id} />
}
