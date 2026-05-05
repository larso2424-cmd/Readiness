'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import katex from 'katex'
import 'katex/dist/katex.min.css'

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
}: {
  questions: Question[]
  subtopicIds: string[]
  userId: string
  timeLimit?: number
  mockMode?: boolean
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null))
  const [confidences, setConfidences] = useState<(Confidence | null)[]>(Array(questions.length).fill(null))
  const [revealed, setRevealed] = useState<boolean[]>(Array(questions.length).fill(false))
  const [showExplanation, setShowExplanation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Per-question timing
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
    // Don't reveal yet — wait for confidence rating
  }

  function selectConfidence(rating: Confidence) {
    if (answers[current] === null) return
    // Record time for this question
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

  function optionStyle(letter: string): string {
    if (answer === null) return 'border-gray-200 bg-white hover:border-blue-300 cursor-pointer'
    if (!isRevealed) return letter === answer ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white opacity-50'
    if (letter === q.correct_answer) return 'border-green-400 bg-green-50'
    if (letter === answer) return 'border-red-400 bg-red-50'
    return 'border-gray-200 bg-gray-50 opacity-60'
  }

  async function finish() {
    // Record time for last question
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

    // Per-question attempt data
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Progress bar + meta */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{mockMode ? 'Mock Exam' : `${q.topic} — ${q.subtopic}`}</span>
          <div className="flex items-center gap-4">
            {timeLimit ? (
              <span className={`tabular-nums font-medium ${timeLimit - elapsed < 300 ? 'text-red-500' : 'text-gray-400'}`}>
                {formatTime(timeLimit - elapsed)} left
              </span>
            ) : (
              <span className="tabular-nums text-gray-400">{formatTime(elapsed)}</span>
            )}
            <span>{current + 1} / {questions.length}</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <p className="text-gray-800 text-base leading-relaxed">
            <Latex text={q.question_text} />
          </p>

          <div className="space-y-2.5">
            {OPTION_LABELS.map((letter) => (
              <button
                key={letter}
                onClick={() => selectAnswer(letter)}
                disabled={answer !== null}
                className={`w-full flex gap-3 text-left p-3 rounded-lg border transition-colors ${optionStyle(letter)}`}
              >
                <span className="font-semibold text-sm w-5 shrink-0 text-gray-500 mt-0.5">{letter}</span>
                <span className="text-gray-800 text-sm leading-relaxed">
                  <Latex text={optionText(letter)} />
                </span>
              </button>
            ))}
          </div>

          {/* Confidence rating — shown after answer selected, before reveal */}
          {answer !== null && !isRevealed && (
            <div className="pt-1 space-y-2">
              <p className="text-sm font-medium text-gray-600">How confident are you?</p>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as Confidence[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => selectConfidence(level)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      level === 'low'
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : level === 'medium'
                        ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer reveal */}
          {isRevealed && (
            <div>
              <div className={`text-sm font-medium mb-2 ${answer === q.correct_answer ? 'text-green-600' : 'text-red-600'}`}>
                {answer === q.correct_answer ? 'Correct!' : `Incorrect — the answer is ${q.correct_answer}`}
              </div>
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showExplanation ? 'Hide explanation' : 'Show explanation'}
              </button>
              {showExplanation && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 leading-relaxed">
                  <Latex text={q.explanation} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {isRevealed && (
          <div className="flex gap-3">
            {!isLast ? (
              <button
                onClick={goToNext}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Next question
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : 'See results'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
