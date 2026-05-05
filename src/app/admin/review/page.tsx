import { createClient } from '@supabase/supabase-js'
import ReviewClient from './ReviewClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  // Count total pending
  const { count } = await supabase
    .from('generated_questions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')

  // Fetch next pending question with subtopic info
  const { data } = await supabase
    .from('generated_questions')
    .select(`
      id, question_text, option_a, option_b, option_c, option_d,
      correct_answer, explanation, difficulty, verification_method,
      subtopics!inner(topic, subtopic)
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(1)

  const row = data?.[0] as any ?? null

  const question = row
    ? {
        id: row.id,
        question_text: row.question_text,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
        correct_answer: row.correct_answer,
        explanation: row.explanation,
        difficulty: row.difficulty,
        verification_method: row.verification_method,
        topic: row.subtopics.topic,
        subtopic: row.subtopics.subtopic,
        pending_count: count ?? 0,
      }
    : null

  return <ReviewClient question={question} />
}
