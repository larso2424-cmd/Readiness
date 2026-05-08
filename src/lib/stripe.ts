import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export const EXAM_MODE_PRICE_ID = process.env.STRIPE_EXAM_MODE_PRICE_ID!
export const STUDY_PLAN_PRICE_ID = process.env.STRIPE_STUDY_PLAN_PRICE_ID!
