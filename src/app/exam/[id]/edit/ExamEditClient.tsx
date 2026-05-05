'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const ALL_TOPICS = [
  { id: 'Number and Algebra', label: 'Number & Algebra' },
  { id: 'Functions', label: 'Functions' },
  { id: 'Geometry and Trigonometry', label: 'Geometry & Trig' },
  { id: 'Statistics and Probability', label: 'Stats & Probability' },
  { id: 'Calculus', label: 'Calculus' },
]

interface Props {
  examId: string
  initialName: string
  initialDate: string | null
  initialPaperType: string
  initialTargetGrade: number | null
  initialTopics: string[]
}

export default function ExamEditClient({
  examId, initialName, initialDate, initialPaperType, initialTargetGrade, initialTopics,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [date, setDate] = useState(initialDate ?? '')
  const [paperType, setPaperType] = useState(initialPaperType)
  const [targetGrade, setTargetGrade] = useState(initialTargetGrade?.toString() ?? '')
  const [topics, setTopics] = useState<Set<string>>(new Set(initialTopics))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  function toggleTopic(id: string) {
    setTopics((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    if (!name.trim() || topics.size === 0) {
      setError('Name and at least one topic are required.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    await supabase.from('exams').update({
      name: name.trim(),
      exam_date: date || null,
      paper_type: paperType,
      target_grade: targetGrade ? parseInt(targetGrade) : null,
    }).eq('id', examId)

    // Replace topics
    await supabase.from('exam_topics').delete().eq('exam_id', examId)
    await supabase.from('exam_topics').insert(
      Array.from(topics).map((topic) => ({ exam_id: examId, topic }))
    )

    router.push('/')
    router.refresh()
  }

  async function deleteExam() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('exams').delete().eq('id', examId)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">

        <div className="space-y-1">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Edit exam</h1>
        </div>

        <div className="space-y-5">

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Exam name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Exam date <span className="text-gray-600 font-normal">(optional)</span></label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Topics</label>
              <button onClick={() => setTopics(new Set(ALL_TOPICS.map(t => t.id)))} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Select all
              </button>
            </div>
            <div className="space-y-2">
              {ALL_TOPICS.map((topic) => {
                const isSelected = topics.has(topic.id)
                return (
                  <button key={topic.id} onClick={() => toggleTopic(topic.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-950' : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-200">{topic.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Paper type</label>
              <select value={paperType} onChange={(e) => setPaperType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="both">Both papers</option>
                <option value="calculator">Calculator</option>
                <option value="no-calculator">No calculator</option>
                <option value="mock">Mock style</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Target grade</label>
              <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="">No target</option>
                {[7, 6, 5, 4, 3, 2, 1].map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={save} disabled={saving || !name.trim() || topics.size === 0}
            className="w-full bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        {/* Delete */}
        <div className="border-t border-gray-800 pt-6 space-y-3">
          <p className="text-sm font-medium text-gray-500">Danger zone</p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-900 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-950 transition-colors">
              Delete exam
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-red-400">This will permanently delete this exam and all its settings. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={deleteExam} disabled={deleting}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:border-gray-500 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
