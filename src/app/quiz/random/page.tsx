import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function RandomQuizPage() {
  const { data: available } = await supabase
    .from('generated_questions')
    .select('subtopic_id')
    .eq('status', 'approved')

  const ids = [...new Set((available ?? []).map((r: any) => r.subtopic_id as string))]

  if (ids.length === 0) {
    redirect('/quiz')
  }

  // Pick 6 random subtopics (or fewer if not enough)
  const shuffled = ids.sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, 6)

  redirect(`/quiz/take?subtopics=${picked.join(',')}`)
}
