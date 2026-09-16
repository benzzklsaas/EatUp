'use client'

/**
 * Livraison — checklist finale et suivi d'après-livraison.
 * Quand les quinze points sont verts, le bandeau de livraison apparaît.
 */

import {
  addOpportunity,
  setDeliveryAll,
  setOpportunityStatus,
  toggleDeliveryItem,
  toggleFollowUpCall,
  patchFollowUp,
} from '@/lib/client-os/actions'
import { OPPORTUNITY_STATUS } from '@/lib/client-os/constants'
import { deliveryProgressOf, isStepDone } from '@/lib/client-os/compute'
import { formatDate } from '@/lib/client-os/format'
import type { OpportunityStatus } from '@/lib/client-os/types'
import { Card, Check, Icon, Pill, Progress, Section } from '../ui'
import type { PanelProps } from './shared'

const OPPORTUNITY_CYCLE: OpportunityStatus[] = ['identifiee', 'proposee', 'signee', 'refusee']

export function DeliveryPanel({ client, update }: PanelProps) {
  const delivery = deliveryProgressOf(client)
  const delivered = isStepDone(client, 'livraison')
  const share = (delivery.done / Math.max(1, delivery.total)) * 100

  return (
    <div className="cos-panel">
      {delivery.ready ? (
        <Card
          style={{
            marginBottom: 18,
            borderColor: 'rgba(31,122,76,0.25)',
            background: 'var(--cos-success-bg)',
          }}
        >
          <div className="cos-inline cos-inline-14">
            <span style={{ color: 'var(--cos-success)', display: 'flex' }}>
              <Icon name="rocket" size={22} />
            </span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--cos-success)' }}>
                Projet prêt à être livré 🚀
              </p>
              <p className="cos-meta" style={{ marginTop: 2 }}>
                Les {delivery.total} vérifications sont validées.
                {delivered ? ' Le projet est en ligne.' : ' Reste la mise en ligne et la transmission des accès.'}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Section
        title="Checklist de livraison"
        hint={`${delivery.done} sur ${delivery.total} vérifications`}
        action={
          <button
            type="button"
            className="cos-btn cos-btn--ghost cos-btn--sm"
            onClick={() => update((c) => setDeliveryAll(c, !delivery.ready))}
          >
            {delivery.ready ? 'Tout décocher' : 'Tout cocher'}
          </button>
        }
      >
        <Card pad={false}>
          <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--cos-line)' }}>
            <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between', marginBottom: 9 }}>
              <span className="cos-meta cos-meta-strong">
                {delivery.ready ? 'Toutes les vérifications sont faites' : 'Vérifications restantes'}
              </span>
              <span className="cos-num cos-meta cos-meta-strong">
                {delivery.done}/{delivery.total}
              </span>
            </div>
            <Progress value={share} tall tone={delivery.ready ? 'success' : undefined} />
          </div>

          <div style={{ padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {client.delivery.map((entry) => (
              <Check
                key={entry.id}
                checked={entry.done}
                onChange={() => update((c) => toggleDeliveryItem(c, entry.id))}
              >
                {entry.label}
              </Check>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Après livraison" hint="La partie que les agences oublient — et qui ramène du chiffre.">
        <div className="cos-split">
          <Card>
            <p className="cos-section-title" style={{ marginBottom: 12 }}>
              Suivi client
            </p>

            <Check checked={client.followUp.j1Done} onChange={() => update((c) => toggleFollowUpCall(c, 'j1'))}>
              <span className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between' }}>
                <span>
                  <strong style={{ fontWeight: 600 }}>J+1</strong> — contact effectué
                </span>
                {client.followUp.j1At ? (
                  <span className="cos-num cos-meta">{formatDate(client.followUp.j1At)}</span>
                ) : null}
              </span>
            </Check>

            <Check checked={client.followUp.j7Done} onChange={() => update((c) => toggleFollowUpCall(c, 'j7'))}>
              <span className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between' }}>
                <span>
                  <strong style={{ fontWeight: 600 }}>J+7</strong> — contact effectué
                </span>
                {client.followUp.j7At ? (
                  <span className="cos-num cos-meta">{formatDate(client.followUp.j7At)}</span>
                ) : null}
              </span>
            </Check>

            <div className="cos-divider" style={{ margin: '12px 0' }} />
            <p className="cos-field-label">Avis client</p>

            <Check
              checked={client.followUp.reviewRequested}
              onChange={() => update((c) => patchFollowUp(c, { reviewRequested: !c.followUp.reviewRequested }))}
            >
              Demandé
            </Check>
            <Check
              checked={client.followUp.reviewReceived}
              onChange={() => update((c) => patchFollowUp(c, { reviewReceived: !c.followUp.reviewReceived }))}
            >
              Reçu
            </Check>
          </Card>

          <Card pad={false}>
            <div className="cos-inline cos-inline-8" style={{ padding: '16px 18px 12px', justifyContent: 'space-between' }}>
              <p className="cos-section-title">Opportunités supplémentaires</p>
              <span className="cos-meta cos-num">
                {client.followUp.opportunities.filter((item) => item.status === 'signee').length} signée(s)
              </span>
            </div>

            <div className="cos-rows">
              {client.followUp.opportunities.map((opportunity) => {
                const meta = OPPORTUNITY_STATUS[opportunity.status]
                return (
                  <div key={opportunity.id} className="cos-row">
                    <span className="cos-row-main cos-row-title">{opportunity.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        update((c) => {
                          const index = OPPORTUNITY_CYCLE.indexOf(opportunity.status)
                          return setOpportunityStatus(
                            c,
                            opportunity.id,
                            OPPORTUNITY_CYCLE[(index + 1) % OPPORTUNITY_CYCLE.length],
                          )
                        })
                      }
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      aria-label={`${opportunity.label} — ${meta.label}, changer le statut`}
                      title="Cliquer pour faire avancer"
                    >
                      <Pill tone={meta.tone} dot>
                        {meta.label}
                      </Pill>
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--cos-line)' }}>
              <form
                className="cos-inline cos-inline-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  const input = event.currentTarget.elements.namedItem('label') as HTMLInputElement
                  if (!input.value.trim()) return
                  const label = input.value
                  update((c) => addOpportunity(c, label))
                  input.value = ''
                }}
              >
                <input
                  name="label"
                  className="cos-input"
                  placeholder="Autre opportunité…"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="submit" className="cos-btn cos-btn--secondary cos-btn--sm">
                  Ajouter
                </button>
              </form>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
