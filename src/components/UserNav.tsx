'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UserNav({ email }: { email: string }) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      <span className="hidden sm:inline">{email}</span>
      <button
        onClick={signOut}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
