import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import WrongQuestions from './WrongQuestions'
import { getActivePlan } from '@/lib/plans'

const supabase = createServiceClient(
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
  if (score >= 70) return '#5cb88a'
  if (score >= 30) return '#e07a5f'
  return '#c45c5c'
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

  // Check user plan
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  let pro = false
  if (user) {
    const { data: userData } = await supabase
      .from('users').select('plan, plan_expires_at').eq('id', user.id).single()
    const userPlan = getActivePlan(userData?.plan ?? 'free', userData?.plan_expires_at ?? null)
    pro = userPlan === 'exam_mode' || userPlan === 'study_plan'
  }

  const wrongItems = (params.wrong ?? '')
    .split(',')
    .filter(Boolean)
    .map((item) => {
      const [id, given, correct] = item.split(':')
      return { id, given, correct }
    })
  const wrongIds = wrongItems.map((w) => w.id)

  let allAskedQuestions: { id: string; skills: string[]; estimated_time_seconds: number | null; subtopic: string }[] = []
  if (attemptId) {
    const { data: attempt } = await supabase
      .from('quiz_attempts').select('questions_asked').eq('id', attemptId).single()
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

  const skillStats: Record<string, { correct: number; total: number }> = {}
  for (const q of allAskedQuestions) {
    const wasCorrect = !wrongIds.includes(q.id)
    for (const skill of q.skills) {
      if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0 }
      skillStats[skill].total++
      if (wasCorrect) skillStats[skill].correct++
    }
  }
  const weakSkills = Object.entries(skillStats)
    .filter(([, s]) => s.correct < s.total)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))

  const confidentlyWrong = questionAttemptData.filter(
    (qa) => !qa.correct && qa.confidence_rating === 'high'
  )
  const uncertainlyRight = questionAttemptData.filter(
    (qa) => qa.correct && qa.confidence_rating === 'low'
  )

  const slowQuestions = questionAttemptData.filter((qa) => {
    const q = allAskedQuestions.find((q) => q.id === qa.question_id)
    if (!q?.estimated_time_seconds || !qa.time_taken_seconds) return false
    return qa.time_taken_seconds > q.estimated_time_seconds * 2
  })

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
  if (!adaptiveSubtopicId && weakIds.length > 0) adaptiveSubtopicId = weakIds[0]

  const { data: weakSubtopics } = weakIds.length
    ? await supabase.from('subtopics').select('id, topic, subtopic').in('id', weakIds)
    : { data: [] }

  const color = scoreColor(score)
  const label = scoreLabel(score)

  // Fake blur data for free users teaser
  const fakeGaps = ['Exponential Equation', 'Log Power Rule', 'Quadratic Vertex Form']
  const fakeStudyNext = ['Exponent and Log Functions', 'Quadratic Functions']

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-lg mx-auto space-y-4">

        {/* Score card */}
        <div className="rounded-2xl p-8 text-center space-y-2" style={{
          background: 'var(--bg-card)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>Readiness score</p>
          <p className="text-7xl font-bold" style={{ color }}>{score}%</p>
          <p className="text-lg font-semibold" style={{ color }}>{label}</p>
          <div className="flex items-center justify-center gap-4 text-sm pt-1" style={{ color: 'var(--text-secondary)' }}>
            <span>{correct} of {total} correct</span>
            {timeTaken > 0 && <><span>·</span><span>{formatTime(timeTaken)}</span></>}
          </div>
        </div>

        {/* Blind spot — always shown */}
        {confidentlyWrong.length > 0 && (
          <div className="rounded-2xl p-5 space-y-1" style={{
            background: 'rgba(224,122,95,0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(224,122,95,0.2)',
          }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Blind spot detected</p>
            <p className="text-xs leading-relaxed" style={{ color: '#c4956a' }}>
              You were <span className="font-medium">highly confident</span> on {confidentlyWrong.length} question{confidentlyWrong.length > 1 ? 's' : ''} you got wrong. That's a red flag — you think you understand this material but there's a gap. Focus here first.
            </p>
          </div>
        )}

        {/* Specific gaps — PRO or blurred teaser */}
        {weakSkills.length > 0 && (
          pro ? (
            <div className="rounded-2xl p-5 space-y-4" style={{
              background: 'var(--bg-card)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Specific gaps found</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>These are the exact skills you missed — not just the topic.</p>
              </div>
              <div className="space-y-3">
                {weakSkills.map(([skill, stats]) => {
                  const pct = Math.round((stats.correct / stats.total) * 100)
                  return (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatSkillTag(skill)}</span>
                        <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{stats.correct}/{stats.total} correct</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 70 ? '#5cb88a' : pct >= 30 ? '#e07a5f' : '#c45c5c'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Blurred teaser for free users
            <div className="rounded-2xl overflow-hidden relative" style={{
              background: 'var(--bg-card)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              {/* Blurred fake content */}
              <div className="p-5 space-y-4 select-none" style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Specific gaps found</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>These are the exact skills you missed — not just the topic.</p>
                </div>
                <div className="space-y-3">
                  {fakeGaps.map((skill) => (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{skill}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>0/1 correct</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: '0%', backgroundColor: '#c45c5c' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Lock overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{
                background: 'rgba(11,15,26,0.6)',
                backdropFilter: 'blur(2px)',
              }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>See your exact skill gaps</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>Know precisely what to fix, not just which topic.</p>
                <Link href="/upgrade" className="text-sm font-bold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90" style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}>
                  Unlock Exam Mode — €19.99
                </Link>
              </div>
            </div>
          )
        )}

        {/* Hidden strength — pro only */}
        {pro && uncertainlyRight.length > 0 && (
          <div className="rounded-2xl p-5 space-y-1" style={{
            background: 'rgba(59,130,246,0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.2)',
          }}>
            <p className="text-sm font-semibold" style={{ color: '#60a5fa' }}>Hidden strength</p>
            <p className="text-xs leading-relaxed" style={{ color: '#7cb3f5' }}>
              You got {uncertainlyRight.length} question{uncertainlyRight.length > 1 ? 's' : ''} right while feeling uncertain. Trust your instincts more — the knowledge is there.
            </p>
          </div>
        )}

        {/* Speed warning — pro only */}
        {pro && slowQuestions.length > 0 && (
          <div className="rounded-2xl p-5 space-y-1" style={{
            background: 'var(--bg-card)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Speed to work on</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {slowQuestions.length} question{slowQuestions.length > 1 ? 's took' : ' took'} more than twice the expected time. In the real exam that costs marks on later questions.
            </p>
          </div>
        )}

        {/* Study these next — PRO or blurred teaser */}
        {weakSubtopics && weakSubtopics.length > 0 && (
          pro ? (
            <div className="rounded-2xl p-5 space-y-3" style={{
              background: 'var(--bg-card)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Study these next</p>
              <ul className="space-y-2">
                {weakSubtopics.map((s: any) => (
                  <li key={s.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5" style={{ color: 'var(--accent)' }}>•</span>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.subtopic}</span>
                      <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>— {s.topic}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden relative" style={{
              background: 'var(--bg-card)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              <div className="p-5 space-y-3 select-none" style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Study these next</p>
                <ul className="space-y-2">
                  {fakeStudyNext.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm">
                      <span style={{ color: 'var(--accent)' }}>•</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{
                background: 'rgba(11,15,26,0.6)',
                backdropFilter: 'blur(2px)',
              }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Get your personalised study plan</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>Know exactly what to study next after every quiz.</p>
                <Link href="/upgrade" className="text-sm font-bold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90" style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}>
                  Unlock Exam Mode — €19.99
                </Link>
              </div>
            </div>
          )
        )}

        {/* All strong */}
        {weakSubtopics?.length === 0 && score >= 70 && (
          <div className="rounded-2xl p-5 text-center" style={{
            background: 'rgba(92,184,138,0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(92,184,138,0.2)',
          }}>
            <p className="font-medium" style={{ color: '#5cb88a' }}>Strong across all topics</p>
            <p className="text-sm mt-1" style={{ color: '#4a9970' }}>Try adding more subtopics to your next quiz.</p>
          </div>
        )}

        {/* Wrong question review — always shown */}
        {wrongWithAnswers.length > 0 && (
          <WrongQuestions questions={wrongWithAnswers} />
        )}

        {/* Recommended next session — PRO or blurred teaser */}
        {adaptiveSubtopicId && (
          pro ? (
            <div className="rounded-2xl p-5 space-y-3" style={{
              background: 'var(--bg-card)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recommended next session</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {weakSkills.length > 0
                  ? `Your biggest gap is "${formatSkillTag(weakSkills[0][0])}". Focus on this subtopic next to close it.`
                  : `You scored below 50% on ${weakSubtopics?.[0] ? (weakSubtopics[0] as any).subtopic : 'some subtopics'}. Drill these before moving on.`
                }
              </p>
              <Link
                href={`/quiz/take?subtopics=${adaptiveSubtopicId}`}
                className="block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
              >
                Start focused session →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden relative" style={{
              background: 'var(--bg-card)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              <div className="p-5 space-y-3 select-none" style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recommended next session</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your biggest gap is "Exponential Equation". Focus on this subtopic next to close it.</p>
                <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold" style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>
                  Start focused session →
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{
                background: 'rgba(11,15,26,0.6)',
                backdropFilter: 'blur(2px)',
              }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Unlock your next session</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>Get a focused drill targeting your exact weak spot.</p>
                <Link href="/upgrade" className="text-sm font-bold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90" style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}>
                  Unlock Exam Mode — €19.99
                </Link>
              </div>
            </div>
          )
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Link href="/quiz" className="flex-1 text-center py-3 rounded-xl font-medium text-sm transition-colors" style={{
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
          }}>
            New quiz
          </Link>
          <Link href="/" className="flex-1 text-center py-3 rounded-xl font-medium text-sm transition-colors" style={{
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
          }}>
            Dashboard
          </Link>
        </div>

      </div>
    </div>
  )
}
