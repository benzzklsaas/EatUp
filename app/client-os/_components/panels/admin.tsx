'use client'

/**
 * Administratif — l'argent, le contrat, le récurrent.
 * Les trois indicateurs du haut doivent se lire sans réfléchir.
 */

import {
  patchAdmin,
  toggleBalanceReceived,
  toggleContractSigned,
  toggleDepositReceived,
} from '@/lib/client-os/actions'
import { collectedOf, outstandingOf, recurringOf } from '@/lib/client-os/compute'
import { formatDate, formatMoney } from '@/lib/client-os/format'
import { Card, Check, Field, Icon, Pill, Progress, Section } from '../ui'
import type { PanelProps } from './shared'

export function AdminPanel({ client, update }: PanelProps) {
  const { admin } = client
  const collected = collectedOf(client)
  const outstanding = outstandingOf(client)
  const recurring = recurringOf(client)
  const share = admin.total > 0 ? (collected / admin.total) * 100 : 0

  return (
    <div className="cos-panel">
      <Section title="État des paiements">
        <div className="cos-grid cos-grid--kpi">
          <StatusCard
            label="Acompte"
            amount={admin.deposit}
            received={Boolean(admin.depositReceivedAt)}
            date={admin.depositReceivedAt}
            onToggle={() => update((c) => toggleDepositReceived(c))}
          />
          <StatusCard
            label="Solde"
            amount={admin.balance}
            received={Boolean(admin.balanceReceivedAt)}
            date={admin.balanceReceivedAt}
            onToggle={() => update((c) => toggleBalanceReceived(c))}
          />
          <Card pad={false} className="cos-stat">
            <p className="cos-stat-label">Contrat</p>
            <p className="cos-stat-value cos-stat-value--sm" style={{ fontSize: 18, marginTop: 12 }}>
              <Pill tone={admin.contractSigned ? 'success' : 'danger'} dot>
                {admin.contractSigned ? 'Signé' : 'Non signé'}
              </Pill>
            </p>
            <p className="cos-stat-foot">
              {admin.contractSignedAt ? `Le ${formatDate(admin.contractSignedAt)}` : 'Aucun document signé'}
            </p>
            <button
              type="button"
              className="cos-btn cos-btn--secondary cos-btn--sm"
              style={{ marginTop: 12 }}
              onClick={() => update((c) => toggleContractSigned(c))}
            >
              {admin.contractSigned ? 'Annuler' : 'Marquer signé'}
            </button>
          </Card>
        </div>
      </Section>

      <div className="cos-split">
        <Section title="Montants">
          <Card>
            <div className="cos-grid cos-grid--2">
              <Field label="Montant total du projet (€)">
                <input
                  className="cos-input cos-num"
                  inputMode="numeric"
                  value={admin.total || ''}
                  placeholder="0"
                  onChange={(event) =>
                    update((c) => patchAdmin(c, { total: Number(event.target.value.replace(/[^\d]/g, '')) || 0 }))
                  }
                />
              </Field>
              <Field label="Acompte (€)">
                <input
                  className="cos-input cos-num"
                  inputMode="numeric"
                  value={admin.deposit || ''}
                  placeholder="0"
                  onChange={(event) =>
                    update((c) => patchAdmin(c, { deposit: Number(event.target.value.replace(/[^\d]/g, '')) || 0 }))
                  }
                />
              </Field>
              <Field label="Solde (€)" hint="Calculé automatiquement, modifiable.">
                <input
                  className="cos-input cos-num"
                  inputMode="numeric"
                  value={admin.balance || ''}
                  placeholder="0"
                  onChange={(event) =>
                    update((c) => patchAdmin(c, { balance: Number(event.target.value.replace(/[^\d]/g, '')) || 0 }))
                  }
                />
              </Field>
            </div>

            <div className="cos-divider" style={{ margin: '4px 0 16px' }} />

            <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="cos-meta">Encaissé</span>
              <span className="cos-num" style={{ fontSize: 13.5, fontWeight: 550 }}>
                {formatMoney(collected)} / {formatMoney(admin.total)}
              </span>
            </div>
            <Progress value={share} tall tone={share >= 100 ? 'success' : undefined} />
            {outstanding > 0 ? (
              <p className="cos-meta" style={{ marginTop: 10, color: 'var(--cos-danger)' }}>
                {formatMoney(outstanding)} restant à encaisser.
              </p>
            ) : (
              <p className="cos-meta" style={{ marginTop: 10, color: 'var(--cos-success)' }}>
                Projet intégralement réglé.
              </p>
            )}
          </Card>
        </Section>

        <Section title="Récurrent">
          <Card>
            <Check
              checked={admin.maintenanceActive}
              onChange={() => update((c) => patchAdmin(c, { maintenanceActive: !c.admin.maintenanceActive }))}
            >
              Maintenance
            </Check>
            {admin.maintenanceActive ? (
              <div style={{ padding: '4px 0 12px 27px' }}>
                <Field label="Montant mensuel (€)">
                  <input
                    className="cos-input cos-num"
                    inputMode="numeric"
                    value={admin.maintenanceMonthly || ''}
                    placeholder="0"
                    onChange={(event) =>
                      update((c) =>
                        patchAdmin(c, {
                          maintenanceMonthly: Number(event.target.value.replace(/[^\d]/g, '')) || 0,
                        }),
                      )
                    }
                  />
                </Field>
              </div>
            ) : null}

            <Check
              checked={admin.hostingActive}
              onChange={() => update((c) => patchAdmin(c, { hostingActive: !c.admin.hostingActive }))}
            >
              Hébergement
            </Check>
            {admin.hostingActive ? (
              <div style={{ padding: '4px 0 12px 27px' }}>
                <Field label="Montant annuel (€)">
                  <input
                    className="cos-input cos-num"
                    inputMode="numeric"
                    value={admin.hostingYearly || ''}
                    placeholder="0"
                    onChange={(event) =>
                      update((c) =>
                        patchAdmin(c, { hostingYearly: Number(event.target.value.replace(/[^\d]/g, '')) || 0 }),
                      )
                    }
                  />
                </Field>
              </div>
            ) : null}

            <div className="cos-divider" style={{ margin: '12px 0' }} />
            <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between' }}>
              <span className="cos-meta">Revenu récurrent mensualisé</span>
              <span className="cos-num" style={{ fontSize: 16, fontWeight: 600 }}>
                {formatMoney(Math.round(recurring))}
              </span>
            </div>
          </Card>
        </Section>
      </div>

      <Section title="Factures" hint="Module complet prévu en V2 — le suivi se fait ici en attendant.">
        <Card>
          <p className="cos-meta">
            Les factures, contrats et documents auront leur propre espace dans la prochaine version.
            Le modèle de données et le schéma SQL les prévoient déjà (`cos_invoices`, `cos_documents`).
          </p>
          <div className="cos-inline cos-inline-8" style={{ marginTop: 14 }}>
            <Pill tone={admin.depositReceivedAt ? 'success' : 'muted'} dot>
              Facture d’acompte {admin.depositReceivedAt ? 'réglée' : 'à émettre'}
            </Pill>
            <Pill tone={admin.balanceReceivedAt ? 'success' : 'muted'} dot>
              Facture de solde {admin.balanceReceivedAt ? 'réglée' : 'à émettre'}
            </Pill>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function StatusCard({
  label,
  amount,
  received,
  date,
  onToggle,
}: {
  label: string
  amount: number
  received: boolean
  date: string | null
  onToggle: () => void
}) {
  return (
    <Card pad={false} className="cos-stat">
      <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between' }}>
        <p className="cos-stat-label">{label}</p>
        <Pill tone={received ? 'success' : 'warn'} dot>
          {received ? 'Reçu' : 'En attente'}
        </Pill>
      </div>
      <p className="cos-stat-value cos-stat-value--sm">{formatMoney(amount)}</p>
      <p className="cos-stat-foot">{received && date ? `Reçu le ${formatDate(date)}` : 'Non encaissé'}</p>
      <button type="button" className="cos-btn cos-btn--secondary cos-btn--sm" style={{ marginTop: 12 }} onClick={onToggle}>
        <Icon name={received ? 'close' : 'check'} size={13} />
        {received ? 'Annuler' : 'Marquer reçu'}
      </button>
    </Card>
  )
}
