// Plan utilities — shared between server and client

export type Plan = 'free' | 'exam_mode' | 'study_plan'

export const FREE_TOPICS = ['Number and Algebra', 'Functions']

export function isActivePlan(plan: Plan, planExpiresAt: string | null): boolean {
  if (plan === 'free') return true
  if (plan === 'study_plan') return true // managed by Stripe subscription
  if (plan === 'exam_mode') {
    if (!planExpiresAt) return false
    return new Date(planExpiresAt) > new Date()
  }
  return false
}

export function getActivePlan(plan: Plan, planExpiresAt: string | null): Plan {
  if (isActivePlan(plan, planExpiresAt)) return plan
  return 'free'
}

export function isPro(plan: Plan, planExpiresAt: string | null): boolean {
  const active = getActivePlan(plan, planExpiresAt)
  return active === 'exam_mode' || active === 'study_plan'
}
