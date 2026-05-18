'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { getTranslations, type LangCode } from '@/lib/i18n'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty: string
  subtopic_id: string
  subtopic: string
  topic: string
}

type Confidence = 'low' | 'medium' | 'high'

function renderLatex(raw: string): string {
  try {
    return raw
      .replace(/\$\$([^$]+)\$\$/g, (_, math) =>
        katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })
      )
      .replace(/\$([^$\n]+)\$/g, (_, math) =>
        katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })
      )
  } catch {
    return raw
  }
}

function Latex({ text }: { text: string }) {
  return (
    <span
      className="leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderLatex(text) }}
    />
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export default function QuizClient({
  questions,
  subtopicIds,
  userId,
  timeLimit,
  mockMode,
  lang,
}: {
  questions: Question[]
  subtopicIds: string[]
  userId: string
  timeLimit?: number
  mockMode?: boolean
  lang?: LangCode
}) {
  const router = useRouter()
  const t = getTranslations(lang ?? 'en')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null))
  const [confidences, setConfidences] = useState<(Confidence | null)[]>(Array(questions.length).fill(null))
  const [revealed, setRevealed] = useState<boolean[]>(Array(questions.length).fill(false))
  const [showExplanation, setShowExplanation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const quizStartTime = useRef(Date.now())
  const questionStartTime = useRef(Date.now())
  const questionTimes = useRef<number[]>(Array(questions.length).fill(0))

  useEffect(() => {
    const interval = setInterval(() => {
      const e = Math.floor((Date.now() - quizStartTime.current) / 1000)
      setElapsed(e)
      if (timeLimit && e >= timeLimit) finish()
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const q = questions[current]
  const answer = answers[current]
  const confidence = confidences[current]
  const isRevealed = revealed[current]
  const isLast = current === questions.length - 1

  function selectAnswer(letter: string) {
    if (answer !== null) return
    const next = [...answers]
    next[current] = letter
    setAnswers(next)
  }

  function selectConfidence(rating: Confidence) {
    if (answers[current] === null) return
    questionTimes.current[current] = Math.round((Date.now() - questionStartTime.current) / 1000)
    const nextC = [...confidences]
    nextC[current] = rating
    setConfidences(nextC)
    const nextR = [...revealed]
    nextR[current] = true
    setRevealed(nextR)
  }

  function goToNext() {
    questionStartTime.current = Date.now()
    setCurrent(current + 1)
    setShowExplanation(false)
  }

  function optionText(letter: string): string {
    return ({ A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d } as any)[letter]
  }

  function optionStyle(letter: string): React.CSSProperties {
    const base: React.CSSProperties = {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: 'var(--text-primary)',
    }
    if (answer === null) return base
    if (!isRevealed) {
      if (letter === answer) return { background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.4)', color: 'var(--text-primary)' }
      return { ...base, opacity: 0.4 }
    }
    if (letter === q.correct_answer) return { background: 'rgba(92,184,138,0.12)', border: '1px solid rgba(92,184,138,0.4)', color: 'var(--text-primary)' }
    if (letter === answer) return { background: 'rgba(196,92,92,0.12)', border: '1px solid rgba(196,92,92,0.4)', color: 'var(--text-primary)' }
    return { ...base, opacity: 0.4 }
  }

  async function finish() {
    questionTimes.current[current] = Math.round((Date.now() - questionStartTime.current) / 1000)
    setSubmitting(true)
    const totalSeconds = Math.floor((Date.now() - quizStartTime.current) / 1000)
    const correctCount = answers.filter((a, i) => a === questions[i].correct_answer).length

    const subtopicStats: Record<string, { correct: number; total: number }> = {}
    for (let i = 0; i < questions.length; i++) {
      const sid = questions[i].subtopic_id
      if (!subtopicStats[sid]) subtopicStats[sid] = { correct: 0, total: 0 }
      subtopicStats[sid].total++
      if (answers[i] === questions[i].correct_answer) subtopicStats[sid].correct++
    }
    const weakSubtopics = Object.entries(subtopicStats)
      .filter(([, s]) => s.correct / s.total < 0.5)
      .map(([id]) => id)

    const score = Math.round((correctCount / questions.length) * 100)
    const wrongItems = questions
      .map((q, i) => ({ id: q.id, given: answers[i], correct: q.correct_answer }))
      .filter((item) => item.given !== item.correct)

    const questionAttempts = questions.map((q, i) => ({
      question_id: q.id,
      answer_given: answers[i],
      correct: answers[i] === q.correct_answer,
      time_taken_seconds: questionTimes.current[i],
      confidence_rating: confidences[i],
    }))

    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        subtopics_selected: subtopicIds,
        questions_asked: questions.map((q) => q.id),
        answers_given: answers,
        correct_count: correctCount,
        total_count: questions.length,
        readiness_score: score,
        weak_subtopics: weakSubtopics,
        total_seconds: totalSeconds,
        question_attempts: questionAttempts,
      }),
    })
    const { quiz_attempt_id } = await res.json().catch(() => ({}))

    const params = new URLSearchParams({
      score: String(score),
      correct: String(correctCount),
      total: String(questions.length),
      time: String(totalSeconds),
      weak: weakSubtopics.join(','),
      subtopics: subtopicIds.join(','),
      wrong: wrongItems.map((w) => `${w.id}:${w.given}:${w.correct}`).join(','),
      ...(quiz_attempt_id ? { attempt: quiz_attempt_id } : {}),
    })
    router.push(`/quiz/results?${params}`)
  }

  const progressPct = ((current + 1) / questions.length) * 100
  const timeWarning = timeLimit && (timeLimit - elapsed) < 300

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto space-y-5">

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>{mockMode ? t.mockExamLabel : `${q.subtopic}`}</span>
            <div className="flex items-center gap-3">
              {timeLimit ? (
                <span className={`tabular-nums font-semibold ${timeWarning ? 'text-[#c45c5c]' : ''}`}>
                  {formatTime(timeLimit - elapsed)} {t.timeLeft}
                </span>
              ) : (
                <span className="tabular-nums">{formatTime(elapsed)}</span>
              )}
              <span>{current + 1} / {questions.length}</span>
            </div>
          </div>
          <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            <Latex text={q.question_text} />
          </p>

          <div className="space-y-2.5">
            {OPTION_LABELS.map((letter) => (
              <button
                key={letter}
                onClick={() => selectAnswer(letter)}
                disabled={answer !== null}
                className="w-full flex gap-3 text-left px-4 py-3 rounded-xl transition-colors disabled:cursor-default"
                style={optionStyle(letter)}
              >
                <span className="font-semibold text-sm w-5 shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{letter}</span>
                <span className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  <Latex text={optionText(letter)} />
                </span>
              </button>
            ))}
          </div>

          {/* Confidence */}
          {answer !== null && !isRevealed && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t.confidenceQuestion}</p>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as Confidence[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => selectConfidence(level)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={level === 'low'
                      ? { border: '1px solid rgba(196,92,92,0.3)', color: '#c45c5c' }
                      : level === 'medium'
                      ? { border: '1px solid rgba(224,170,95,0.3)', color: '#e0aa5f' }
                      : { border: '1px solid rgba(92,184,138,0.3)', color: '#5cb88a' }
                    }
                  >
                    {level === 'low' ? t.confidenceLow : level === 'medium' ? t.confidenceMedium : t.confidenceHigh}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer reveal */}
          {isRevealed && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-semibold" style={{ color: answer === q.correct_answer ? '#5cb88a' : '#c45c5c' }}>
                {answer === q.correct_answer ? t.correctAnswer : `${t.incorrectAnswer} ${q.correct_answer}`}
              </p>
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                {showExplanation ? t.hideExplanation : t.showExplanation}
              </button>
              {showExplanation && (
                <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                  <Latex text={q.explanation} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next / Finish */}
        {isRevealed && (
          <div>
            {!isLast ? (
              <button
                onClick={goToNext}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
              >
                {t.nextQuestion}
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40"
                style={{ background: '#5cb88a', color: '#fff' }}
              >
                {submitting ? t.saving : t.seeResults}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
