'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LANGUAGES, getLang, setLang, type LangCode } from '@/lib/i18n'

interface Props {
  email: string
  userPlan: string
}

export default function SettingsClient({ email, userPlan }: Props) {
  const router = useRouter()
  const [lang, setLangState] = useState<LangCode>('en')
  const [cancelling, setCancelling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLangState(getLang())
  }, [])

  function handleLangChange(code: LangCode) {
    setLangState(code)
    setLang(code)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel? You\'ll keep access until the end of your billing period.')) return
    setCancelling(true)
    const res = await fetch('/api/stripe/cancel', { method: 'POST' })
    const { error } = await res.json()
    setCancelling(false)
    if (error) { alert(error); return }
    alert('Subscription cancelled. You\'ll keep access until the end of your billing period.')
    router.refresh()
  }

  async function handleDelete() {
    const confirmed = confirm('Are you sure you want to delete your account? This cannot be undone.')
    if (!confirmed) return
    const confirmed2 = confirm('All your data, exams and progress will be permanently deleted. Continue?')
    if (!confirmed2) return
    setDeleting(true)
    const res = await fetch('/api/user/delete', { method: 'DELETE' })
    const { error } = await res.json()
    if (error) { alert(error); setDeleting(false); return }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const planLabel = userPlan === 'study_plan' ? 'Study Plan' : userPlan === 'exam_mode' ? 'Exam Mode' : 'Free'
  const planColor = userPlan !== 'free' ? '#5cb88a' : 'var(--text-tertiary)'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-xl mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>←</Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        {/* Account info */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>Account</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{email}</p>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: planColor }}>{planLabel}</p>
            </div>
            {userPlan === 'free' && (
              <Link href="/upgrade" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>Language</p>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLangChange(l.code as LangCode)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  background: lang === l.code ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                  color: lang === l.code ? '#fff' : 'var(--text-secondary)',
                  boxShadow: lang === l.code ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="px-5 pb-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>Affects greetings and labels throughout the app.</p>
        </div>

        {/* Subscription */}
        {userPlan === 'study_plan' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>Subscription</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Study Plan · €7.99/month</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>You'll keep access until the end of your billing period after cancelling.</p>
              </div>
            </div>
            <div className="px-5 pb-4">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: '#c45c5c' }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel subscription'}
              </button>
            </div>
          </div>
        )}

        {/* More */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a8394' }}>More</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <Link href="/privacy" className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</span>
              <span style={{ color: 'var(--text-tertiary)' }}>›</span>
            </Link>
            <Link href="/terms" className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Terms of Use</span>
              <span style={{ color: 'var(--text-tertiary)' }}>›</span>
            </Link>
            <Link href="/cookies" className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cookie Policy</span>
              <span style={{ color: 'var(--text-tertiary)' }}>›</span>
            </Link>
          </div>
        </div>

        {/* Sign out + Delete */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors"
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sign out</span>
              <span style={{ color: 'var(--text-tertiary)' }}>›</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <span className="text-sm font-medium" style={{ color: '#c45c5c' }}>
                {deleting ? 'Deleting...' : 'Delete account'}
              </span>
              <span style={{ color: '#c45c5c', opacity: 0.5 }}>›</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: 'var(--text-tertiary)' }}>StudyReady · studyready.org</p>
      </div>
    </div>
  )
}
