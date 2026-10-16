'use client'

import { useEffect, useRef, useState } from 'react'

// Feuille modale : glisse depuis le bas sur mobile, fenêtre centrée sur grand écran.
// Gère l'animation de sortie, le verrouillage du défilement, Échap, le piège de focus
// et le glisser vers le bas pour fermer.

let scrollLocks = 0
let lockedScrollY = 0

function lockScroll() {
  if (scrollLocks++ > 0) return
  lockedScrollY = window.scrollY
  const s = document.body.style
  s.position = 'fixed'
  s.top = `-${lockedScrollY}px`
  s.left = '0'
  s.right = '0'
  s.overflow = 'hidden'
}

function unlockScroll() {
  if (--scrollLocks > 0) return
  scrollLocks = 0
  const s = document.body.style
  s.position = ''
  s.top = ''
  s.left = ''
  s.right = ''
  s.overflow = ''
  window.scrollTo(0, lockedScrollY)
}

/**
 * Le bouton « retour » du téléphone ferme les feuilles ouvertes au lieu de quitter la page.
 * Une seule entrée d'historique couvre l'ensemble des feuilles d'un écran.
 */
export function useBackToClose(active: boolean, onBack: () => void) {
  const callback = useRef(onBack)
  useEffect(() => { callback.current = onBack }, [onBack])
  useEffect(() => {
    if (!active) return
    const id = Math.random().toString(36).slice(2)
    window.history.pushState({ ...(window.history.state || {}), __euSheet: id }, '')
    let popped = false
    const onPop = () => {
      if (window.history.state?.__euSheet === id) return
      popped = true
      callback.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (!popped && window.history.state?.__euSheet === id) window.history.back()
    }
  }, [active])
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

type SheetProps = {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Contenu pleine largeur sans marge (ex. photo produit) affiché au-dessus du contenu. */
  media?: React.ReactNode
}

export function Sheet({ open, onClose, labelledBy, children, footer, media }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  if (open && !mounted) setMounted(true)
  if (open && closing) setClosing(false)
  if (!open && mounted && !closing) setClosing(true)

  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => { setMounted(false); setClosing(false) }, 230)
    return () => clearTimeout(t)
  }, [closing])

  useEffect(() => {
    if (!mounted) return
    lockScroll()
    return unlockScroll
  }, [mounted])

  // Focus : dans la feuille à l'ouverture, restitué à la fermeture.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (panel) {
      // Réinitialise un éventuel glisser interrompu (réouverture pendant l'animation de sortie).
      panel.style.transform = ''
      panel.style.transition = ''
      panel.style.animation = ''
      panel.focus({ preventScroll: true })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [open])

  // Glisser vers le bas pour fermer (uniquement si le contenu est en haut).
  useEffect(() => {
    const panel = panelRef.current
    if (!mounted || !panel) return
    let startY = 0, dy = 0, dragging = false
    const onStart = (e: TouchEvent) => {
      if (window.matchMedia('(min-width: 640px)').matches) return
      if ((scrollRef.current?.scrollTop || 0) > 0) return
      startY = e.touches[0].clientY; dy = 0; dragging = true
      panel.style.transition = 'none'
    }
    const onMove = (e: TouchEvent) => {
      if (!dragging) return
      dy = e.touches[0].clientY - startY
      if (dy <= 0 || (scrollRef.current?.scrollTop || 0) > 0) { panel.style.transform = ''; return }
      e.preventDefault()
      panel.style.transform = `translate3d(0, ${dy * 0.9}px, 0)`
    }
    const onEnd = () => {
      if (!dragging) return
      dragging = false
      panel.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
      if (dy > 110) {
        panel.style.animation = 'none'
        panel.style.transform = 'translate3d(0, 100%, 0)'
        onCloseRef.current()
      }
      else panel.style.transform = ''
    }
    panel.addEventListener('touchstart', onStart, { passive: true })
    panel.addEventListener('touchmove', onMove, { passive: false })
    panel.addEventListener('touchend', onEnd)
    panel.addEventListener('touchcancel', onEnd)
    return () => {
      panel.removeEventListener('touchstart', onStart)
      panel.removeEventListener('touchmove', onMove)
      panel.removeEventListener('touchend', onEnd)
      panel.removeEventListener('touchcancel', onEnd)
    }
  }, [mounted])

  if (!mounted) return null
  const state = closing ? 'closing' : 'open'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="eu-backdrop absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
        data-state={state}
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-state={state}
        className="eu-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-cream shadow-[0_-12px_48px_rgba(23,23,23,0.25)] outline-none sm:max-h-[88vh] sm:max-w-[540px] sm:rounded-[28px]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-ink/20 mix-blend-multiply" />
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {media}
          {children}
        </div>
        {footer && (
          <div className="border-t border-line bg-cream/95 px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
