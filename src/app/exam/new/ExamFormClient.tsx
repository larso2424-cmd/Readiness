'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALL_TOPICS = [
  { id: 'Number and Algebra', label: 'Number & Algebra' },
  { id: 'Functions', label: 'Functions' },
  { id: 'Geometry and Trigonometry', label: 'Geometry & Trig' },
  { id: 'Statistics and Probability', label: 'Stats & Probability' },
  { id: 'Calculus', label: 'Calculus' },
]

const FREE_TOPICS = ['Number and Algebra', 'Functions']

type Course = 'aa' | 'ai'

export default function ExamFormClient({ userId, pro = false, hasExistingExam = false }: { userId: string; pro?: boolean; hasExistingExam?: boolean }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [paperType, setPaperType] = useState<string>('both')
  const [targetGrade, setTargetGrade] = useState<string>('')
  const [topics, setTopics] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleTopic(id: string) {
    setTopics((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    const allowed = pro ? ALL_TOPICS.map(t => t.id) : FREE_TOPICS
    setTopics(new Set(allowed))
  }

  async function save() {
    if (!name.trim() || topics.size === 0 || !course) {
      setError('Add a name and select at least one topic.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        name: name.trim(),
        exam_date: date || null,
        paper_type: paperType,
        target_grade: targetGrade ? parseInt(targetGrade) : null,
        course,
      })
      .select('id')
      .single()

    if (examErr || !exam) {
      setError('Failed to create exam. Try again.')
      setSaving(false)
      return
    }

    await supabase.from('exam_topics').insert(
      Array.from(topics).map((topic) => ({ exam_id: exam.id, topic }))
    )

    await fetch('/api/exam/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: exam.id }),
    })

    router.push('/quiz')
    router.refresh()
  }

  const inputStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  // Step 1: Course selection
  if (!course) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <div className="max-w-lg mx-auto space-y-8">
          <div className="fade-up fade-up-1">
            {hasExistingExam && (
              <a href="/" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Dashboard</a>
            )}
            <p className="text-xs uppercase tracking-widest font-medium mt-4" style={{ color: 'var(--text-tertiary)' }}>New exam</p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Which course?</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Choose the IB Math course your exam is for.</p>
          </div>
          <div className="space-y-3 fade-up fade-up-2">
            <button
              onClick={() => setCourse('aa')}
              className="w-full flex items-start gap-4 px-5 py-4 rounded-xl text-left transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm" style={{ background: '#3b82f6' }}>AA</div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Math AA SL</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Analysis & Approaches — algebra, functions, calculus</p>
              </div>
            </button>
            <button
              onClick={() => setCourse('ai')}
              className="w-full flex items-start gap-4 px-5 py-4 rounded-xl text-left transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm" style={{ background: '#8b5cf6' }}>AI</div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Math AI SL</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Applications & Interpretation — statistics, modelling, finance</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-lg mx-auto space-y-8">

        <div className="fade-up fade-up-1">
          <button onClick={() => setCourse(null)} className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Change course</button>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center" style={{
              background: course === 'aa' ? '#3b82f6' : '#8b5cf6',
              color: '#fff',
            }}>
              {course.toUpperCase()}
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {course === 'aa' ? 'Math AA SL' : 'Math AI SL'}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Set up your exam</h1>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Your readiness score and quizzes will be scoped to this exam.
          </p>
        </div>

        <div className="space-y-5 fade-up fade-up-2">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Exam name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Mock — June 12" or "IB Final May 2027"'
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{ ...inputStyle, ['--tw-placeholder-color' as any]: 'var(--text-tertiary)' }}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Exam date <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Topics on this exam</label>
              <button onClick={selectAll} className="text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                Select all
              </button>
            </div>
            <div className="space-y-1.5">
              {ALL_TOPICS.map((topic) => {
                const isSelected = topics.has(topic.id)
                const locked = !pro && !FREE_TOPICS.includes(topic.id)
                if (locked) {
                  return (
                    <a
                      key={topic.id}
                      href="/upgrade"
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity opacity-50 hover:opacity-70"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center" style={{ border: '1.5px solid var(--text-tertiary)' }}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--text-tertiary)' }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-tertiary)' }}>{topic.label}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>PRO</span>
                    </a>
                  )
                }
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                    style={{
                      background: isSelected ? 'rgba(224,122,95,0.08)' : 'var(--bg-card)',
                      border: isSelected ? '1px solid rgba(224,122,95,0.4)' : '1px solid var(--border)',
                    }}
                  >
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

          {/* Paper type + target grade */}
          <div className={`grid gap-3 ${course === 'ai' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {course !== 'ai' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Paper type</label>
                <select
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none transition-colors"
                  style={inputStyle}
                >
                  <option value="both">Both papers</option>
                  <option value="calculator">Calculator</option>
                  <option value="no-calculator">No calculator</option>
                  <option value="mock">Mock style</option>
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Target grade <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(opt.)</span>
              </label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              >
                <option value="">No target</option>
                {[7, 6, 5, 4, 3, 2, 1].map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: '#c45c5c' }}>{error}</p>}

          <button
            onClick={save}
            disabled={saving || !name.trim() || topics.size === 0}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
          >
            {saving ? 'Creating...' : 'Create exam →'}
          </button>
        </div>

      </div>
    </div>
  )
}
