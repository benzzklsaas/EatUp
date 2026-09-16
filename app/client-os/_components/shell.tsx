'use client'

/**
 * Coquille de l'application : navigation permanente, recherche globale et
 * accès au bouton « Nouveau client » depuis n'importe quel écran.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PRODUCT_NAME, PRODUCT_OWNER } from '@/lib/client-os/constants'
import { priorityFeed } from '@/lib/client-os/compute'
import { useWorkspace, WorkspaceProvider } from '@/lib/client-os/store'
import { CommandPalette } from './command-palette'
import { Icon, type IconName } from './ui'

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/client-os', label: 'Dashboard', icon: 'dashboard' },
  { href: '/client-os/clients', label: 'Clients', icon: 'clients' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/client-os') return pathname === '/client-os'
  return pathname.startsWith(href)
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { clients } = useWorkspace()

  return (
    <nav className="cos-nav" aria-label="Navigation principale">
      {NAV.map((entry) => (
        <Link
          key={entry.href}
          href={entry.href}
          className="cos-nav-item"
          aria-current={isActive(pathname, entry.href) ? 'page' : undefined}
          onClick={onNavigate}
        >
          <span className="cos-nav-icon">
            <Icon name={entry.icon} />
          </span>
          {entry.label}
          {entry.href === '/client-os/clients' && clients.length > 0 ? (
            <span className="cos-nav-count">{clients.length}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  )
}

function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { clients, workspace } = useWorkspace()
  const urgent = priorityFeed(clients, 50).filter((action) => action.severity === 'critique').length
  const user = workspace.users[0]

  return (
    <aside className="cos-sidebar">
      <Link href="/client-os" className="cos-brand">
        <span className="cos-brand-mark">BK</span>
        <span>
          <span className="cos-brand-name">{PRODUCT_OWNER}</span>
          <span className="cos-brand-sub" style={{ display: 'block' }}>
            {PRODUCT_NAME}
          </span>
        </span>
      </Link>

      <Navigation />

      {urgent > 0 ? (
        <>
          <p className="cos-nav-label">Attention</p>
          <Link href="/client-os" className="cos-nav-item" style={{ color: 'var(--cos-danger)' }}>
            <span className="cos-nav-icon">
              <Icon name="alert" />
            </span>
            {urgent} point{urgent > 1 ? 's' : ''} critique{urgent > 1 ? 's' : ''}
          </Link>
        </>
      ) : null}

      <div className="cos-sidebar-foot">
        <button type="button" className="cos-search-trigger" onClick={onOpenPalette}>
          <Icon name="search" size={14} />
          Rechercher
          <span className="cos-kbd">⌘K</span>
        </button>

        <Link href="/client-os/clients/new" className="cos-btn cos-btn--primary cos-btn--block">
          <Icon name="plus" size={15} />
          Nouveau client
        </Link>

        {user ? (
          <div className="cos-user">
            <span className="cos-avatar cos-avatar--sm cos-avatar--t0">{user.initials}</span>
            <span style={{ minWidth: 0 }}>
              <span className="cos-row-title" style={{ fontSize: 12.5 }}>
                {user.name}
              </span>
              <span className="cos-meta" style={{ display: 'block', fontSize: 11.5 }}>
                Espace {PRODUCT_OWNER}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname()

  return (
    <header className="cos-topbar">
      <Link href="/client-os" className="cos-inline cos-inline-8" style={{ flexShrink: 0 }}>
        <span className="cos-brand-mark">BK</span>
        <span className="cos-brand-name">{PRODUCT_NAME}</span>
      </Link>

      <div className="cos-topbar-nav">
        {NAV.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="cos-nav-item"
            aria-current={isActive(pathname, entry.href) ? 'page' : undefined}
            style={{ padding: '6px 9px', fontSize: 13 }}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      <div className="cos-inline cos-inline-6 cos-push">
        <button
          type="button"
          className="cos-btn cos-btn--ghost cos-btn--icon"
          onClick={onOpenPalette}
          aria-label="Rechercher"
        >
          <Icon name="search" size={15} />
        </button>
        <Link href="/client-os/clients/new" className="cos-btn cos-btn--primary cos-btn--sm">
          <Icon name="plus" size={14} />
          Client
        </Link>
      </div>
    </header>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="cos-root">
      <div className="cos-shell">
        <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
        <div className="cos-main">
          <TopBar onOpenPalette={() => setPaletteOpen(true)} />
          {children}
        </div>
      </div>
      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  )
}

export function ClientOsShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Frame>{children}</Frame>
    </WorkspaceProvider>
  )
}
