import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Cancel any active Stripe subscriptions first
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (userData?.stripe_customer_id) {
    const subscriptions = await stripe.subscriptions.list({
      customer: userData.stripe_customer_id,
      status: 'active',
      limit: 10,
    })
    for (const sub of subscriptions.data) {
      await stripe.subscriptions.cancel(sub.id)
    }
  }

  // Delete the user from Supabase Auth (cascades to DB via RLS/triggers)
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
