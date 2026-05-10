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

const FREE_TOPICS = ['Number and Algebra', 'Functions']

interface Props {
  examId: string
  initialName: string
  initialDate: string | null
  initialPaperType: string
  initialTargetGrade: number | null
  initialTopics: string[]
  course: string
  pro?: boolean
}

export default function ExamEditClient({
  examId, initialName, initialDate, initialPaperType, initialTargetGrade, initialTopics, course, pro = false,
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

  const inputStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-lg mx-auto space-y-8">

        <div className="fade-up fade-up-1">
          <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>Edit exam</h1>
        </div>

        <div className="space-y-5 fade-up fade-up-2">

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Exam name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Exam date <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Topics</label>
              {pro && (
                <button onClick={() => setTopics(new Set(ALL_TOPICS.map(t => t.id)))} className="text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  Select all
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {ALL_TOPICS.map((topic) => {
                const isSelected = topics.has(topic.id)
                const locked = !pro && !FREE_TOPICS.includes(topic.id)
                if (locked) {
                  return (
                    <a key={topic.id} href="/upgrade"
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity opacity-50 hover:opacity-70"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                      <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center" style={{ border: '1.5px solid var(--text-tertiary)' }}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--text-tertiary)' }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-tertiary)' }}>{topic.label}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>PRO</span>
                    </a>
                  )
                }
                return (
                  <button key={topic.id} onClick={() => toggleTopic(topic.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                    style={{
                      background: isSelected ? 'rgba(224,122,95,0.08)' : 'var(--bg-card)',
                      border: isSelected ? '1px solid rgba(224,122,95,0.4)' : '1px solid var(--border)',
                    }}>
                    <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors" style={{
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid var(--text-tertiary)',
                    }}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{topic.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className={`grid gap-3 ${course === 'ai' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {course !== 'ai' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Paper type</label>
                <select value={paperType} onChange={(e) => setPaperType(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none" style={inputStyle}>
                  <option value="both">Both papers</option>
                  <option value="calculator">Calculator</option>
                  <option value="no-calculator">No calculator</option>
                  <option value="mock">Mock style</option>
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Target grade</label>
              <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none" style={inputStyle}>
                <option value="">No target</option>
                {[7, 6, 5, 4, 3, 2, 1].map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: '#c45c5c' }}>{error}</p>}

          <button onClick={save} disabled={saving || !name.trim() || topics.size === 0}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        <div className="pt-2 space-y-3 fade-up fade-up-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Danger zone</p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(196,92,92,0.3)', color: '#c45c5c' }}>
              Delete exam
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: '#c45c5c' }}>This will permanently delete this exam. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={deleteExam} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                  style={{ background: '#c45c5c', color: '#fff' }}>
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
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
