'use client'

/**
 * Dashboard — l'écran d'ouverture.
 *
 * Il répond dans cet ordre : qu'est-ce qui brûle, qu'est-ce qui arrive,
 * où en est le portefeuille. Les chiffres viennent après les actions :
 * un indicateur ne fait pas avancer un projet.
 */

import Link from 'next/link'
import { PRODUCT_TAGLINE } from '@/lib/client-os/constants'
import {
  activeProjects,
  kpisOf,
  priorityFeed,
  SEVERITY_LABEL,
  upcomingDeadlines,
  type ActionSeverity,
} from '@/lib/client-os/compute'
import { formatDate, formatFullDate, formatMoney, today } from '@/lib/client-os/format'
import { useWorkspace } from '@/lib/client-os/store'
import { ClientCard } from './_components/client-card'
import { Avatar, Card, Empty, Icon, Pill, Section, Stat } from './_components/ui'

const SEVERITY_TONE: Record<ActionSeverity, 'danger' | 'warn' | 'neutral' | 'success'> = {
  critique: 'danger',
  important: 'warn',
  a_suivre: 'neutral',
  pret: 'success',
}

export default function DashboardPage() {
  const { clients, ready } = useWorkspace()

  if (!ready) return <LoadingState />

  if (clients.length === 0) {
    return (
      <div className="cos-page">
        <header className="cos-page-head">
          <div>
            <p className="cos-eyebrow">BK Labs — Client OS</p>
            <h1 className="cos-title">Dashboard</h1>
            <p className="cos-subtitle">{PRODUCT_TAGLINE}</p>
          </div>
        </header>
        <Card>
          <Empty
            title="Aucun dossier pour le moment"
            text="Créez votre premier client : l'application génère la structure complète du dossier, du premier appel à la livraison."
            action={
              <Link href="/client-os/clients/new" className="cos-btn cos-btn--primary">
                <Icon name="plus" size={15} />
                Nouveau client
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const kpis = kpisOf(clients)
  const actions = priorityFeed(clients, 7)
  const deadlines = upcomingDeadlines(clients, 5)
  const projects = activeProjects(clients)
  const critical = actions.filter((action) => action.severity === 'critique').length

  return (
    <div className="cos-page">
      <header className="cos-page-head">
        <div>
          <p className="cos-eyebrow">BK Labs — Client OS</p>
          <h1 className="cos-title">Dashboard</h1>
          <p className="cos-subtitle">
            {critical > 0
              ? `${critical} point${critical > 1 ? 's' : ''} critique${critical > 1 ? 's' : ''} à traiter aujourd’hui.`
              : 'Aucun point critique. Le portefeuille avance.'}
          </p>
        </div>
        <div className="cos-inline cos-inline-8">
          <span className="cos-meta cos-num">{formatFullDate(today())}</span>
          <Link href="/client-os/clients/new" className="cos-btn cos-btn--primary">
            <Icon name="plus" size={15} />
            Nouveau client
          </Link>
        </div>
      </header>

      <Section title="Portefeuille">
        <div className="cos-grid cos-grid--kpi">
          <Stat label="Prospects" value={kpis.prospects} foot="À convertir" />
          <Stat label="Clients actifs" value={kpis.clientsActifs} foot="Dossiers ouverts" />
          <Stat label="Projets en cours" value={kpis.projetsEnCours} foot="En production" />
          <Stat label="En attente client" value={kpis.attenteClient} foot="Bloqués côté client" />
          <Stat label="Projets livrés" value={kpis.projetsLivres} foot="Mis en ligne" />
        </div>
      </Section>

      <Section title="Argent">
        <div className="cos-grid cos-grid--kpi">
          <Stat
            label="CA des projets en cours"
            value={formatMoney(kpis.caEnCours)}
            foot="Montant signé, en production"
            small
          />
          <Stat
            label="Paiements en attente"
            value={formatMoney(kpis.paiementsEnAttente)}
            foot={kpis.paiementsEnAttente > 0 ? 'Acomptes et soldes non encaissés' : 'Tout est encaissé'}
            small
          />
          <Stat
            label="Récurrent mensuel"
            value={formatMoney(kpis.recurrentMensuel)}
            foot="Maintenance et hébergement"
            small
          />
        </div>
      </Section>

      <div className="cos-split" style={{ marginBottom: 34 }}>
        <Section title="Qu’est-ce que je dois faire maintenant ?" hint="Trié par urgence réelle, tous dossiers confondus.">
          <Card pad={false}>
            {actions.length === 0 ? (
              <Empty title="Rien ne bloque" text="Aucune action urgente sur l’ensemble du portefeuille." />
            ) : (
              <div className="cos-rows">
                {actions.map((action) => (
                  <Link
                    key={action.id}
                    href={`/client-os/clients/${action.clientId}?tab=${action.tab}`}
                    className="cos-row cos-row--link"
                  >
                    <Avatar name={action.clientName} size="sm" />
                    <div className="cos-row-main">
                      <p className="cos-row-title">{action.title}</p>
                      <p className="cos-row-sub">
                        {action.clientName} · {action.detail}
                      </p>
                    </div>
                    <Pill tone={SEVERITY_TONE[action.severity]} dot>
                      {SEVERITY_LABEL[action.severity]}
                    </Pill>
                    <span style={{ color: 'var(--cos-ink-4)', display: 'flex' }}>
                      <Icon name="chevronRight" size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </Section>

        <Section title="Prochaines échéances">
          <Card pad={false}>
            {deadlines.length === 0 ? (
              <Empty title="Aucune échéance" text="Aucun projet en cours n’a de date de livraison." />
            ) : (
              <div className="cos-rows">
                {deadlines.map(({ client, days, progress }) => (
                  <Link
                    key={client.id}
                    href={`/client-os/clients/${client.id}?tab=suivi`}
                    className="cos-row cos-row--link"
                  >
                    <div className="cos-row-main">
                      <p className="cos-row-title">{client.company.name}</p>
                      <p className="cos-row-sub cos-num">
                        {formatDate(client.deadline)} · {progress} %
                      </p>
                    </div>
                    <span
                      className="cos-num"
                      style={{
                        fontSize: 12.5,
                        fontWeight: 550,
                        color: days < 0 ? 'var(--cos-danger)' : days <= 7 ? 'var(--cos-warn)' : 'var(--cos-ink-3)',
                      }}
                    >
                      {days < 0 ? `J+${Math.abs(days)}` : `J−${days}`}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </Section>
      </div>

      <Section
        title="Projets en cours"
        hint={`${projects.length} dossier${projects.length > 1 ? 's' : ''} en production`}
        action={
          <Link href="/client-os/clients" className="cos-btn cos-btn--ghost cos-btn--sm">
            Tous les clients
            <Icon name="arrowRight" size={14} />
          </Link>
        }
      >
        {projects.length === 0 ? (
          <Card>
            <Empty title="Aucun projet en cours" text="Les dossiers actifs apparaîtront ici." />
          </Card>
        ) : (
          <div className="cos-grid cos-grid--cards">
            {projects.map(({ client }) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="cos-page">
      <header className="cos-page-head">
        <div>
          <p className="cos-eyebrow">BK Labs — Client OS</p>
          <h1 className="cos-title">Dashboard</h1>
        </div>
      </header>
      <div className="cos-grid cos-grid--kpi">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} pad={false} className="cos-stat">
            <span className="cos-sr">Chargement</span>
            <div style={{ height: 11, width: '55%', borderRadius: 4, background: 'var(--cos-surface-3)' }} />
            <div style={{ height: 24, width: '38%', marginTop: 14, borderRadius: 5, background: 'var(--cos-surface-3)' }} />
          </Card>
        ))}
      </div>
    </div>
  )
}
