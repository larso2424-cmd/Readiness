import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('stripe_customer_id').eq('id', user.id).single()
  if (!userData?.stripe_customer_id) return NextResponse.json({ error: 'No subscription found' }, { status: 400 })

  const origin = req.headers.get('origin') ?? 'https://readiness-al3yup616-larso2424-7445s-projects.vercel.app'
  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripe_customer_id,
    return_url: `${origin}/`,
  })

  return NextResponse.json({ url: session.url })
}
