import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe, EXAM_MODE_PRICE_ID, STUDY_PLAN_PRICE_ID } from '@/lib/stripe'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { priceType } = await req.json()
  if (!priceType || !['exam_mode', 'study_plan'].includes(priceType)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = priceType === 'exam_mode' ? EXAM_MODE_PRICE_ID : STUDY_PLAN_PRICE_ID
  const origin = req.headers.get('origin') ?? 'https://readiness-al3yup616-larso2424-7445s-projects.vercel.app'

  // Get or create Stripe customer
  const { data: userData } = await supabase.from('users').select('stripe_customer_id').eq('id', user.id).single()
  let customerId = userData?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: priceType === 'study_plan' ? 'subscription' : 'payment',
    ...(priceType === 'study_plan' && {
      subscription_data: { trial_period_days: 2 },
    }),
    success_url: `${origin}/?upgraded=true`,
    cancel_url: `${origin}/upgrade`,
    metadata: { supabase_user_id: user.id, plan: priceType },
  })

  return NextResponse.json({ url: session.url })
}
