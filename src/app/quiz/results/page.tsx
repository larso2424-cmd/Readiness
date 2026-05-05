import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import WrongQuestions from './WrongQuestions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

function scoreLabel(score: number): string {
  if (score >= 90) return 'Mastered'
  if (score >= 70) return 'Solid'
  if (score >= 50) return 'Getting there'
  if (score >= 30) return 'Needs work'
  return 'Struggling'
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 30) return '#f97316'
  return '#ef4444'
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatSkillTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{
    score?: string
    correct?: string
    total?: string
    time?: string
    weak?: string
    subtopics?: string
    wrong?: string
    attempt?: string
  }>
}) {
  const params = await searchParams
  const score = parseInt(params.score ?? '0', 10)
  const correct = parseInt(params.correct ?? '0', 10)
  const total = parseInt(params.total ?? '0', 10)
  const timeTaken = parseInt(params.time ?? '0', 10)
  const weakIds = (params.weak ?? '').split(',').filter(Boolean)
  const attemptId = params.attempt ?? null

  const wrongItems = (params.wrong ?? '')
    .split(',')
    .filter(Boolean)
    .map((item) => {
      const [id, given, correct] = item.split(':')
      return { id, given, correct }
    })
  const wrongIds = wrongItems.map((w) => w.id)

  // Fetch all asked question IDs + skill tags via quiz_attempt
  let allAskedQuestions: { id: string; skills: string[]; estimated_time_seconds: number | null; subtopic: string }[] = []
  if (attemptId) {
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('questions_asked')
      .eq('id', attemptId)
      .single()

    if (attempt?.questions_asked?.length) {
      const { data: qs } = await supabase
        .from('generated_questions')
        .select('id, skills, estimated_time_seconds, subtopics(subtopic)')
        .in('id', attempt.questions_asked)
      allAskedQuestions = (qs ?? []).map((q: any) => ({
        id: q.id,
        skills: q.skills ?? [],
        estimated_time_seconds: q.estimated_time_seconds ?? null,
        subtopic: q.subtopics?.subtopic ?? '',
      }))
    }
  }

  // Per-question attempt data (confidence + time per question)
  let questionAttemptData: {
    question_id: string
    correct: boolean
    time_taken_seconds: number | null
    confidence_rating: string | null
  }[] = []
  if (attemptId) {
    const { data: qas } = await supabase
      .from('question_attempts')
      .select('question_id, correct, time_taken_seconds, confidence_rating')
      .eq('quiz_attempt_id', attemptId)
    questionAttemptData = qas ?? []
  }

  // Skill gap analysis
  const skillStats: Record<string, { correct: number; total: number }> = {}
  for (const q of allAskedQuestions) {
    const wasCorrect = !wrongIds.includes(q.id)
    for (const skill of q.skills) {
      if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0 }
      skillStats[skill].total++
      if (wasCorrect) skillStats[skill].correct++
    }
  }
  // Only show skills where student got at least one wrong
  const weakSkills = Object.entries(skillStats)
    .filter(([, s]) => s.correct < s.total)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))

  // Confidence vs accuracy mismatches
  const confidentlyWrong = questionAttemptData.filter(
    (qa) => !qa.correct && qa.confidence_rating === 'high'
  )
  const uncertainlyRight = questionAttemptData.filter(
    (qa) => qa.correct && qa.confidence_rating === 'low'
  )

  // Time warnings: questions that took >2x estimated time
  const slowQuestions = questionAttemptData.filter((qa) => {
    const q = allAskedQuestions.find((q) => q.id === qa.question_id)
    if (!q?.estimated_time_seconds || !qa.time_taken_seconds) return false
    return qa.time_taken_seconds > q.estimated_time_seconds * 2
  })

  // Fetch wrong questions with full data + common_mistakes
  const { data: wrongQuestions } = wrongIds.length
    ? await supabase
        .from('generated_questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, common_mistakes, skills')
        .in('id', wrongIds)
    : { data: [] }

  const wrongWithAnswers = (wrongQuestions ?? []).map((q: any) => {
    const item = wrongItems.find((w) => w.id === q.id)
    const qa = questionAttemptData.find((qa) => qa.question_id === q.id)
    return {
      ...q,
      given: item?.given ?? null,
      time_taken_seconds: qa?.time_taken_seconds ?? null,
      confidence_rating: qa?.confidence_rating ?? null,
    }
  })

  // Adaptive next step: find the subtopic with the worst skill performance
  let adaptiveSubtopicId: string | null = null
  let adaptiveSubtopicName: string | null = null
  if (weakSkills.length > 0 && attemptId) {
    const worstSkill = weakSkills[0][0]
    const { data: skillQuestions } = await supabase
      .from('generated_questions')
      .select('subtopic_id, subtopics(subtopic)')
      .contains('skills', [worstSkill])
      .eq('status', 'approved')
      .limit(1)
    if (skillQuestions?.[0]) {
      adaptiveSubtopicId = (skillQuestions[0] as any).subtopic_id
      adaptiveSubtopicName = (skillQuestions[0] as any).subtopics?.subtopic ?? null
    }
  }
  if (!adaptiveSubtopicId && weakIds.length > 0) {
    adaptiveSubtopicId = weakIds[0]
  }

  // Fetch weak subtopic names
  const { data: weakSubtopics } = weakIds.length
    ? await supabase.from('subtopics').select('id, topic, subtopic').in('id', weakIds)
    : { data: [] }

  const color = scoreColor(score)
  const label = scoreLabel(score)

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Score card */}
        <div className="bg-gray-900 rounded-2xl p-8 text-center space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Readiness score</p>
          <p className="text-7xl font-bold" style={{ color }}>{score}%</p>
          <p className="text-lg font-semibold" style={{ color }}>{label}</p>
          <div className="flex items-center justify-center gap-4 text-gray-400 text-sm pt-1">
            <span>{correct} of {total} correct</span>
            {timeTaken > 0 && (
              <>
                <span>·</span>
                <span>{formatTime(timeTaken)}</span>
              </>
            )}
          </div>
        </div>

        {/* Skill gap analysis */}
        {weakSkills.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-white">Specific gaps found</p>
              <p className="text-xs text-gray-400 mt-0.5">These are the exact skills you missed — not just the topic.</p>
            </div>
            <div className="space-y-3">
              {weakSkills.map(([skill, stats]) => {
                const pct = Math.round((stats.correct / stats.total) * 100)
                return (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-200 font-medium">{formatSkillTag(skill)}</span>
                      <span className="text-gray-400 tabular-nums">{stats.correct}/{stats.total} correct</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? '#22c55e' : pct >= 30 ? '#f97316' : '#ef4444' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Confidence mismatch warning */}
        {confidentlyWrong.length > 0 && (
          <div className="bg-amber-950 border border-amber-800 rounded-2xl p-5 space-y-1">
            <p className="text-sm font-semibold text-amber-300">
              Blind spot detected
            </p>
            <p className="text-xs text-amber-400 leading-relaxed">
              You were <span className="font-medium">highly confident</span> on {confidentlyWrong.length} question{confidentlyWrong.length > 1 ? 's' : ''} you got wrong. That's a red flag — you think you understand this material but there's a gap. Focus here first.
            </p>
          </div>
        )}

        {uncertainlyRight.length > 0 && (
          <div className="bg-blue-950 border border-blue-800 rounded-2xl p-5 space-y-1">
            <p className="text-sm font-semibold text-blue-300">
              Hidden strength
            </p>
            <p className="text-xs text-blue-400 leading-relaxed">
              You got {uncertainlyRight.length} question{uncertainlyRight.length > 1 ? 's' : ''} right while feeling uncertain. Trust your instincts more — the knowledge is there.
            </p>
          </div>
        )}

        {/* Time warnings */}
        {slowQuestions.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-1">
            <p className="text-sm font-semibold text-white">Speed to work on</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {slowQuestions.length} question{slowQuestions.length > 1 ? 's took' : ' took'} more than twice the expected time. In the real exam that would cost you marks on later questions. Drill these for speed, not just accuracy.
            </p>
          </div>
        )}

        {/* Weak subtopics */}
        {weakSubtopics && weakSubtopics.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-white">Study these next</p>
            <ul className="space-y-2">
              {weakSubtopics.map((s: any) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <div>
                    <span className="font-medium text-gray-200">{s.subtopic}</span>
                    <span className="text-gray-500 ml-1">— {s.topic}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All strong */}
        {weakSubtopics?.length === 0 && score >= 70 && (
          <div className="bg-green-950 border border-green-800 rounded-2xl p-5 text-center">
            <p className="text-green-300 font-medium">Strong across all topics</p>
            <p className="text-green-500 text-sm mt-1">Try adding more subtopics to your next quiz.</p>
          </div>
        )}

        {/* Wrong question review */}
        {wrongWithAnswers.length > 0 && (
          <WrongQuestions questions={wrongWithAnswers} />
        )}

        {/* Adaptive next step */}
        {adaptiveSubtopicId && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-white">Recommended next session</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {weakSkills.length > 0
                ? `Your biggest gap is "${formatSkillTag(weakSkills[0][0])}". Focus on this subtopic next to close it.`
                : `You scored below 50% on ${weakSubtopics?.[0] ? (weakSubtopics[0] as any).subtopic : 'some subtopics'}. Drill these before moving on.`
              }
            </p>
            <Link
              href={`/quiz/take?subtopics=${adaptiveSubtopicId}`}
              className="block w-full text-center bg-white text-gray-900 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
            >
              Start focused session →
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Link
            href="/quiz"
            className="flex-1 text-center bg-gray-800 text-gray-200 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors text-sm"
          >
            New quiz
          </Link>
          <Link
            href="/"
            className="flex-1 text-center border border-gray-700 text-gray-300 py-3 rounded-xl font-medium hover:border-gray-500 transition-colors text-sm"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
