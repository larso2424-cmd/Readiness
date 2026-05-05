'use client'

import { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface WrongQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  given: string | null
  common_mistakes: string | null
  skills: string[]
  time_taken_seconds: number | null
  confidence_rating: string | null
}

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
  return <span dangerouslySetInnerHTML={{ __html: renderLatex(text) }} />
}

function optionText(q: WrongQuestion, letter: string): string {
  return ({ A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d } as any)[letter]
}

function formatSkillTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function WrongQuestionCard({ q, index }: { q: WrongQuestion; index: number }) {
  const [open, setOpen] = useState(false)
  const wasConfidentlyWrong = q.confidence_rating === 'high'

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="shrink-0 w-5 h-5 rounded-full bg-red-900 text-red-400 text-xs flex items-center justify-center font-semibold mt-0.5">
          {index + 1}
        </span>
        <span className="text-sm text-gray-300 leading-relaxed flex-1 line-clamp-2">
          <Latex text={q.question_text} />
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {wasConfidentlyWrong && (
            <span className="text-xs bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded font-medium">blind spot</span>
          )}
          <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800 p-4 space-y-4 bg-gray-900">
          {/* Full question */}
          <p className="text-sm text-gray-200 leading-relaxed">
            <Latex text={q.question_text} />
          </p>

          {/* Options */}
          <div className="space-y-1.5">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const isCorrect = letter === q.correct_answer
              const isGiven = letter === q.given
              return (
                <div
                  key={letter}
                  className={`flex gap-2 p-2.5 rounded-lg text-sm ${
                    isCorrect
                      ? 'bg-green-950 border border-green-800 text-green-200'
                      : isGiven
                      ? 'bg-red-950 border border-red-800 text-red-300 line-through'
                      : 'text-gray-500'
                  }`}
                >
                  <span className="font-semibold w-4 shrink-0">{letter}</span>
                  <Latex text={optionText(q, letter)} />
                  {isCorrect && <span className="ml-auto text-green-500 text-xs font-medium">✓</span>}
                  {isGiven && !isCorrect && <span className="ml-auto text-red-500 text-xs font-medium">yours</span>}
                </div>
              )
            })}
          </div>

          {/* Common mistake */}
          {q.common_mistakes && (
            <div className="p-3 bg-amber-950 border border-amber-900 rounded-lg text-sm text-amber-200 leading-relaxed">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">Common mistake</p>
              {q.common_mistakes}
            </div>
          )}

          {/* Explanation */}
          <div className="p-3 bg-blue-950 border border-blue-900 rounded-lg text-sm text-blue-100 leading-relaxed">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Explanation</p>
            <Latex text={q.explanation} />
          </div>

          {/* Skills + meta */}
          <div className="flex flex-wrap items-center gap-2">
            {q.skills?.map((skill) => (
              <span key={skill} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md">
                {formatSkillTag(skill)}
              </span>
            ))}
            {q.time_taken_seconds != null && (
              <span className="text-xs text-gray-600 ml-auto">
                {q.time_taken_seconds}s · {q.confidence_rating ?? '—'} confidence
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WrongQuestions({ questions }: { questions: WrongQuestion[] }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-medium text-white">
        Review incorrect answers
        <span className="ml-2 text-gray-500 font-normal">({questions.length})</span>
      </h2>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <WrongQuestionCard key={q.id} q={q} index={i} />
        ))}
      </div>
    </div>
  )
}
