import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuizClient from '../take/QuizClient'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function MockExamPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all approved questions grouped by subtopic
  const { data: allQuestions } = await supabase
    .from('generated_questions')
    .select(`
      id, question_text, option_a, option_b, option_c, option_d,
      correct_answer, explanation, difficulty,
      subtopics!inner(id, topic, subtopic)
    `)
    .eq('status', 'approved')

  if (!allQuestions?.length) redirect('/quiz')

  // Group by topic, pick 4 questions per topic (5 topics × 4 = 20 questions)
  const byTopic: Record<string, any[]> = {}
  for (const q of allQuestions) {
    const topic = (q as any).subtopics.topic
    if (!byTopic[topic]) byTopic[topic] = []
    byTopic[topic].push(q)
  }

  const PER_TOPIC = 4
  const picked: any[] = []
  for (const pool of Object.values(byTopic)) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    picked.push(...shuffled.slice(0, PER_TOPIC))
  }

  const seen = new Set<string>()
  const questions = picked
    .filter((q) => { if (seen.has(q.id)) return false; seen.add(q.id); return true })
    .sort(() => Math.random() - 0.5)
    .map((q) => {
      const labels = ['A', 'B', 'C', 'D'] as const
      const origOptions = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d } as Record<string, string>
      const correctText = origOptions[q.correct_answer]
      const texts = [q.option_a, q.option_b, q.option_c, q.option_d].sort(() => Math.random() - 0.5)
      const shuffled = Object.fromEntries(labels.map((l, i) => [l, texts[i]])) as Record<string, string>
      const newCorrect = labels.find((l) => shuffled[l] === correctText) ?? q.correct_answer
      return {
        id: q.id,
        question_text: q.question_text,
        option_a: shuffled.A,
        option_b: shuffled.B,
        option_c: shuffled.C,
        option_d: shuffled.D,
        correct_answer: newCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty,
        subtopic_id: q.subtopics.id,
        subtopic: q.subtopics.subtopic,
        topic: q.subtopics.topic,
      }
    })

  const subtopicIds = [...new Set(questions.map((q) => q.subtopic_id))]

  return (
    <QuizClient
      questions={questions}
      subtopicIds={subtopicIds}
      userId={user.id}
      timeLimit={3600}
      mockMode
    />
  )
}
