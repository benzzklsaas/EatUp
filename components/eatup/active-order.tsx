'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useStoredValue } from '@/lib/eatup/client-store'
import { formatPickup } from '@/lib/eatup/schedule'
import { ChevronRightIcon, ReceiptIcon } from './icons'

// Dernière commande passée sur cet appareil : permet de retrouver son suivi depuis la carte.
export type StoredOrder = { orderNumber: string; pickupTime: string; createdAt: string }

export const lastOrderKey = (slug: string) => `eatup_last_order_${slug}`

export function parseStoredOrder(raw: string | null): StoredOrder | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return typeof v?.orderNumber === 'string' && typeof v?.pickupTime === 'string' ? v : null
  } catch {
    return null
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Envoyée au restaurant',
  preparing: 'En préparation',
  ready: 'Prête à récupérer',
}

export function ActiveOrderBanner({ slug, now }: { slug: string; now: Date }) {
  const order = useStoredValue(lastOrderKey(slug), parseStoredOrder, null)
  const [status, setStatus] = useState<{ number: string; value: string } | null>(null)
  const recent = order ? new Date(order.pickupTime).getTime() + 3 * 3600_000 > now.getTime() : false

  useEffect(() => {
    if (!order || !recent) return
    const ctrl = new AbortController()
    fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}`, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.order?.status) setStatus({ number: order.orderNumber, value: data.order.status }) })
      .catch(() => {})
    return () => ctrl.abort()
  }, [order, recent])

  if (!order || !recent) return null
  const current = status?.number === order.orderNumber ? status.value : null
  if (current === 'completed' || current === 'cancelled') return null

  return (
    <div className="mx-auto mt-3 max-w-3xl px-4">
      <Link
        href={`/suivi/${encodeURIComponent(order.orderNumber)}`}
        className="eu-press eu-reveal flex items-center gap-3 rounded-[22px] bg-white p-3.5 shadow-[var(--eu-shadow-card)]"
      >
        <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
          <ReceiptIcon size={20} />
          {current === 'ready' && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            {current ? STATUS_LABEL[current] || 'Commande en cours' : 'Votre commande en cours'}
          </span>
          <span className="eu-num block truncate text-[13px] text-muted">
            {order.orderNumber} · retrait {formatPickup(order.pickupTime, now).replace(/^Aujourd’hui /, '').toLowerCase()}
          </span>
        </span>
        <span className="flex items-center gap-0.5 text-[14px] font-semibold">
          Suivre <ChevronRightIcon size={18} />
        </span>
      </Link>
    </div>
  )
}
