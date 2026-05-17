import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getActivePlan } from '@/lib/plans'
import SettingsClient from './SettingsClient'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  const isOwner = user.email === process.env.UNLIMITED_EMAIL
  const userPlan = isOwner ? 'study_plan' : getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)

  return <SettingsClient email={user.email ?? ''} userPlan={userPlan} />
}
