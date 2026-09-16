'use client'

/**
 * Projet — périmètre, contenus, direction créative.
 *
 * Le périmètre sépare visuellement ce qui est vendu de ce qui ne l'est pas :
 * c'est cette colonne de droite qui évite les projets qui n'en finissent plus.
 */

import {
  addResource,
  addScopeItem,
  patchCreative,
  removeResource,
  removeScopeItem,
  setResourceNote,
  setResourceStatus,
} from '@/lib/client-os/actions'
import { MAIN_ACTIONS, MAIN_ACTION_ORDER, RESOURCE_STATUS } from '@/lib/client-os/constants'
import { missingResourcesOf } from '@/lib/client-os/compute'
import type { MainAction, ResourceStatus } from '@/lib/client-os/types'
import { Card, ChoiceGroup, EditableText, Field, Icon, ItemList, Pill, Section } from '../ui'
import type { PanelProps } from './shared'

const STATUS_CYCLE: ResourceStatus[] = ['recu', 'attente', 'manquant']

export function ProjectPanel({ client, update }: PanelProps) {
  const missing = missingResourcesOf(client)
  const received = client.resources.filter((item) => item.status === 'recu').length

  return (
    <div className="cos-panel">
      <Section title="Périmètre du projet" hint="Ce qui est inclus, et surtout ce qui ne l’est pas.">
        <div className="cos-split">
          <div className="cos-stack cos-stack-12">
            <Card>
              <div className="cos-inline cos-inline-8" style={{ marginBottom: 14 }}>
                <span style={{ color: 'var(--cos-success)', display: 'flex' }}>
                  <Icon name="check" size={15} />
                </span>
                <p className="cos-section-title">Inclus dans le projet</p>
              </div>

              <Field label="Livrables prévus">
                <ItemList
                  items={client.scope.deliverables}
                  placeholder="Ajouter un livrable…"
                  onAdd={(label) => update((current) => addScopeItem(current, 'deliverables', label))}
                  onRemove={(id) => update((current) => removeScopeItem(current, 'deliverables', id))}
                />
              </Field>

              <Field label="Fonctionnalités">
                <ItemList
                  items={client.scope.features}
                  placeholder="Ajouter une fonctionnalité…"
                  onAdd={(label) => update((current) => addScopeItem(current, 'features', label))}
                  onRemove={(id) => update((current) => removeScopeItem(current, 'features', id))}
                />
              </Field>

              <Field label="Pages / écrans">
                <ItemList
                  items={client.scope.screens}
                  placeholder="Ajouter une page…"
                  onAdd={(label) => update((current) => addScopeItem(current, 'screens', label))}
                  onRemove={(id) => update((current) => removeScopeItem(current, 'screens', id))}
                />
              </Field>
            </Card>
          </div>

          <Card>
            <div className="cos-inline cos-inline-8" style={{ marginBottom: 14 }}>
              <span style={{ color: 'var(--cos-ink-4)', display: 'flex' }}>
                <Icon name="close" size={15} />
              </span>
              <p className="cos-section-title">Non inclus</p>
            </div>
            <p className="cos-meta" style={{ marginBottom: 14 }}>
              À citer explicitement dans la proposition. Tout ce qui n’est pas listé ici sera
              demandé un jour.
            </p>
            <ItemList
              tone="excluded"
              items={client.scope.exclusions}
              placeholder="Ajouter une exclusion…"
              onAdd={(label) => update((current) => addScopeItem(current, 'exclusions', label))}
              onRemove={(id) => update((current) => removeScopeItem(current, 'exclusions', id))}
            />
          </Card>
        </div>
      </Section>

      <Section
        title="Contenus & ressources"
        hint={`${received}/${client.resources.length} reçus${missing.length ? ` · ${missing.length} manquant${missing.length > 1 ? 's' : ''}` : ''}`}
      >
        {missing.length > 0 ? (
          <Card
            style={{
              marginBottom: 12,
              borderColor: 'rgba(180,35,24,0.24)',
              background: 'var(--cos-danger-bg)',
            }}
          >
            <p className="cos-inline cos-inline-8" style={{ color: 'var(--cos-danger)', fontWeight: 550, fontSize: 13.5 }}>
              <Icon name="alert" size={15} />
              {missing.length} élément{missing.length > 1 ? 's' : ''} manquant{missing.length > 1 ? 's' : ''} :{' '}
              {missing.map((item) => item.label).join(', ')}
            </p>
          </Card>
        ) : null}

        <Card pad={false}>
          <div className="cos-rows">
            {client.resources.map((resource) => {
              const meta = RESOURCE_STATUS[resource.status]
              return (
                <div key={resource.id} className="cos-row">
                  <div className="cos-row-main">
                    <p className="cos-row-title">{resource.label}</p>
                    <div style={{ marginTop: 2, maxWidth: 460 }}>
                      <EditableText
                        label={`Note — ${resource.label}`}
                        value={resource.note}
                        placeholder="Ajouter une précision…"
                        onChange={(next) => update((current) => setResourceNote(current, resource.id, next))}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      update((current) => {
                        const index = STATUS_CYCLE.indexOf(resource.status)
                        return setResourceStatus(
                          current,
                          resource.id,
                          STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length],
                        )
                      })
                    }
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    aria-label={`${resource.label} — ${meta.label}, changer le statut`}
                    title="Cliquer pour changer le statut"
                  >
                    <Pill tone={meta.tone} dot>
                      {meta.label}
                    </Pill>
                  </button>

                  <button
                    type="button"
                    className="cos-btn cos-btn--ghost cos-btn--icon"
                    onClick={() => update((current) => removeResource(current, resource.id))}
                    aria-label={`Supprimer ${resource.label}`}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--cos-line)' }}>
            <AddResource onAdd={(label) => update((current) => addResource(current, label))} />
          </div>
        </Card>
      </Section>

      <Section title="Direction créative / UX">
        <Card>
          <div className="cos-grid cos-grid--2">
            <CreativeField
              label="Image de marque souhaitée"
              value={client.creative.brandImage}
              onChange={(next) => update((current) => patchCreative(current, { brandImage: next }))}
            />
            <CreativeField
              label="Style souhaité"
              value={client.creative.style}
              onChange={(next) => update((current) => patchCreative(current, { style: next }))}
            />
            <CreativeField
              label="Couleurs"
              value={client.creative.colors}
              onChange={(next) => update((current) => patchCreative(current, { colors: next }))}
            />
            <CreativeField
              label="Références"
              value={client.creative.references}
              onChange={(next) => update((current) => patchCreative(current, { references: next }))}
            />
            <CreativeField
              label="Sites appréciés"
              value={client.creative.likedSites}
              onChange={(next) => update((current) => patchCreative(current, { likedSites: next }))}
            />
            <CreativeField
              label="Sites / styles à éviter"
              value={client.creative.avoidSites}
              onChange={(next) => update((current) => patchCreative(current, { avoidSites: next }))}
            />
            <CreativeField
              label="Clientèle cible"
              value={client.creative.targetAudience}
              onChange={(next) => update((current) => patchCreative(current, { targetAudience: next }))}
            />
            <CreativeField
              label="Profil utilisateur principal"
              value={client.creative.mainUserProfile}
              onChange={(next) => update((current) => patchCreative(current, { mainUserProfile: next }))}
            />
          </div>

          <Field label="Action principale souhaitée" hint="Ce que l’utilisateur doit faire, une seule chose.">
            <ChoiceGroup
              options={MAIN_ACTION_ORDER.map((value) => ({ value, label: MAIN_ACTIONS[value] }))}
              selected={client.creative.mainAction ? [client.creative.mainAction] : []}
              onToggle={(value) =>
                update((current) =>
                  patchCreative(current, {
                    mainAction: current.creative.mainAction === value ? null : (value as MainAction),
                  }),
                )
              }
            />
          </Field>

          {client.creative.mainAction === 'autre' ? (
            <Field label="Préciser l’action">
              <EditableText
                label="Préciser l’action"
                value={client.creative.mainActionOther}
                onChange={(next) => update((current) => patchCreative(current, { mainActionOther: next }))}
              />
            </Field>
          ) : null}
        </Card>
      </Section>
    </div>
  )
}

function CreativeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="cos-field">
      <span className="cos-field-label">{label}</span>
      <EditableText label={label} value={value} onChange={onChange} multiline />
    </div>
  )
}

function AddResource({ onAdd }: { onAdd: (label: string) => void }) {
  return (
    <form
      className="cos-inline cos-inline-6"
      onSubmit={(event) => {
        event.preventDefault()
        const input = event.currentTarget.elements.namedItem('label') as HTMLInputElement
        if (!input.value.trim()) return
        onAdd(input.value)
        input.value = ''
      }}
    >
      <input
        name="label"
        className="cos-input"
        placeholder="Ajouter un élément à la checklist…"
        style={{ flex: 1, minWidth: 0 }}
      />
      <button type="submit" className="cos-btn cos-btn--secondary cos-btn--sm">
        Ajouter
      </button>
    </form>
  )
}
