import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ExamFormClient from './ExamFormClient'
import { getActivePlan } from '@/lib/plans'
import Link from 'next/link'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function NewExamPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  const userPlan = getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)
  const pro = userPlan === 'exam_mode' || userPlan === 'study_plan'

  if (!pro) {
    // Count existing exams
    const { count } = await supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('archived', false)

    if ((count ?? 0) >= 1) {
      return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center space-y-5">
            <p className="text-4xl">🔒</p>
            <h1 className="text-xl font-bold">Multiple exams is a Pro feature</h1>
            <p className="text-gray-400 text-sm">Free users can only have 1 exam. Upgrade to Exam Mode to track multiple exams.</p>
            <Link href="/upgrade" className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors">
              🔥 Get Exam Mode — €19.99
            </Link>
            <Link href="/" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back to dashboard</Link>
          </div>
        </div>
      )
    }
  }

  return <ExamFormClient userId={user.id} />
}
