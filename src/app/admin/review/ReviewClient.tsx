'use client'

import { useEffect, useRef, useState } from 'react'
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
  verification_method: string
  subtopic: string
  topic: string
  pending_count: number
}

function renderLatex(raw: string): { html: string; error: boolean } {
  try {
    // Replace display math $$...$$ then inline $...$
    let html = raw
      .replace(/\$\$([^$]+)\$\$/g, (_, math) =>
        katex.renderToString(math.trim(), { displayMode: true, throwOnError: true })
      )
      .replace(/\$([^$\n]+)\$/g, (_, math) =>
        katex.renderToString(math.trim(), { displayMode: false, throwOnError: true })
      )
    return { html, error: false }
  } catch {
    return { html: raw, error: true }
  }
}

function MathBlock({ text, label }: { text: string; label?: string }) {
  const { html, error } = renderLatex(text)
  return (
    <div className="relative">
      {label && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>}
      {error && (
        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
          render failed
        </span>
      )}
      <div
        className={`mt-1 text-gray-800 leading-relaxed ${error ? 'font-mono text-sm text-red-800 bg-red-50 p-2 rounded' : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export default function ReviewClient({ question }: { question: Question | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-gray-600 font-medium">No pending questions</p>
          <p className="text-gray-400 text-sm mt-1">Run the generator to create more</p>
        </div>
      </div>
    )
  }

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(action)
    await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question!.id, action }),
    })
    setShowExplanation(false)
    router.refresh()
  }

  const options: [string, string][] = [
    ['A', question.option_a],
    ['B', question.option_b],
    ['C', question.option_c],
    ['D', question.option_d],
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-800">{question.topic} — {question.subtopic}</span>
          <span className="ml-3 text-xs text-gray-400 capitalize">{question.difficulty}</span>
          <span className="ml-2 text-xs text-gray-400">· {question.verification_method}</span>
        </div>
        <span className="text-sm text-gray-500">{question.pending_count} pending</span>
      </div>

      {/* Question card */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">

          {/* Question */}
          <MathBlock text={question.question_text} label="Question" />

          {/* Options */}
          <div className="space-y-3">
            {options.map(([letter, text]) => {
              const isCorrect = letter === question.correct_answer
              return (
                <div
                  key={letter}
                  className={`flex gap-3 p-3 rounded-md border ${
                    isCorrect
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <span className={`font-semibold text-sm w-5 shrink-0 mt-0.5 ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>
                    {letter}
                  </span>
                  <MathBlock text={text} />
                </div>
              )
            })}
          </div>

          {/* Explanation toggle */}
          <div>
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showExplanation ? 'Hide explanation' : 'Show explanation'}
            </button>
            {showExplanation && (
              <div className="mt-3 p-4 bg-blue-50 rounded-md border border-blue-100">
                <MathBlock text={question.explanation} label="Explanation" />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('approve')}
            disabled={loading !== null}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'approve' ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={loading !== null}
            className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {loading === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}
