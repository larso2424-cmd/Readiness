import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const getUserId = async (customerId: string) => {
    const { data } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single()
    return data?.id
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const userId = session.metadata?.supabase_user_id || await getUserId(session.customer)
      const plan = session.metadata?.plan

      if (!userId || !plan) break

      if (plan === 'exam_mode') {
        // Expires end of May
        const expires = new Date('2026-05-31T23:59:59Z')
        await supabase.from('users').update({
          plan: 'exam_mode',
          plan_expires_at: expires.toISOString(),
        }).eq('id', userId)
      } else if (plan === 'study_plan') {
        await supabase.from('users').update({
          plan: 'study_plan',
          stripe_subscription_id: session.subscription,
          plan_expires_at: null,
        }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as any
      const userId = await getUserId(sub.customer)
      if (userId) {
        await supabase.from('users').update({
          plan: 'free',
          plan_expires_at: null,
          stripe_subscription_id: null,
        }).eq('id', userId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const userId = await getUserId(invoice.customer)
      if (userId) {
        await supabase.from('users').update({ plan: 'free' }).eq('id', userId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
