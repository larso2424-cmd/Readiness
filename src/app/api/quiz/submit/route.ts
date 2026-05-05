import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const userId = body.user_id

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  await supabase.from('users').upsert({ id: userId, email: '' }, { onConflict: 'id', ignoreDuplicates: true })

  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      subtopics_selected: body.subtopics_selected,
      questions_asked: body.questions_asked,
      answers_given: body.answers_given,
      correct_count: body.correct_count,
      total_count: body.total_count,
      readiness_score: body.readiness_score,
      weak_subtopics: body.weak_subtopics,
    })
    .select('id')
    .single()

  if (error || !attempt) {
    console.error('Failed to save quiz attempt:', error?.message)
    return NextResponse.json({ ok: true })
  }

  // Store per-question attempts
  const questionAttempts = (body.question_attempts ?? []) as Array<{
    question_id: string
    answer_given: string | null
    correct: boolean
    time_taken_seconds: number | null
    confidence_rating: string | null
  }>

  if (questionAttempts.length > 0 && attempt?.id) {
    const rows = questionAttempts.map((qa) => ({
      user_id: userId,
      quiz_attempt_id: attempt.id,
      question_id: qa.question_id,
      answer_given: qa.answer_given,
      correct: qa.correct,
      time_taken_seconds: qa.time_taken_seconds,
      confidence_rating: qa.confidence_rating,
    }))

    const { error: qaErr } = await supabase.from('question_attempts').insert(rows)
    if (qaErr) {
      console.error('Failed to save question attempts:', qaErr.message)
    }
  }

  return NextResponse.json({ ok: true, quiz_attempt_id: attempt.id })
}
