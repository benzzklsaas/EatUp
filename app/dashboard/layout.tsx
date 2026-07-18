'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/auth/login'); return }

      const { data: sub } = await supabase
        .from('restaurant_subscriptions')
        .select('status, past_due_since')
        .eq('restaurant_id', resto.id)
        .single()

      const gracePeriodExpired = sub?.status === 'past_due' && sub.past_due_since
        && (Date.now() - new Date(sub.past_due_since).getTime()) > 2 * 24 * 3600_000

      if (!sub || (sub.status !== 'active' && sub.status !== 'past_due') || gracePeriodExpired) {
        router.push('/subscribe')
        return
      }

      setChecked(true)
    }
    // Ne pas re-vérifier sur la page index (elle fait déjà sa propre vérification complète)
    if (pathname !== '/dashboard') check()
    else setChecked(true)
  }, [pathname])

  if (!checked) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 20px #6366f1', animation: 'pulse 1s infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )

  return <>{children}</>
}
