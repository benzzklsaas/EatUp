'use client'

/**
 * Brief — informations client, premier appel, analyse BK Labs.
 *
 * Le premier appel garde les mots du client ; l'analyse est la lecture
 * interne de l'agence. Les deux sont séparés volontairement : confondre
 * les deux, c'est vendre ce que le client demande plutôt que ce dont il
 * a besoin.
 */

import { patchAnalysis, patchCompany, patchContact, patchDiscovery } from '@/lib/client-os/actions'
import { SOLUTION_TYPES, SOLUTION_TYPE_ORDER } from '@/lib/client-os/constants'
import type { SolutionType } from '@/lib/client-os/types'
import { Card, ChoiceGroup, EditableText, Field, Section } from '../ui'
import type { PanelProps } from './shared'

export function BriefPanel({ client, update }: PanelProps) {
  const { company, contact, discovery, analysis } = client

  return (
    <div className="cos-panel">
      <Section title="Informations client">
        <Card>
          <div className="cos-grid cos-grid--2">
            <Field label="Nom du contact">
              <EditableText
                label="Nom du contact"
                value={[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                onChange={(next) => {
                  const [first, ...rest] = next.split(' ')
                  update((current) =>
                    patchContact(current, { firstName: first ?? '', lastName: rest.join(' ') }),
                  )
                }}
              />
            </Field>
            <Field label="Fonction">
              <EditableText
                label="Fonction"
                value={contact.role}
                onChange={(next) => update((current) => patchContact(current, { role: next }))}
              />
            </Field>
            <Field label="Entreprise">
              <EditableText
                label="Entreprise"
                value={company.name}
                onChange={(next) => update((current) => patchCompany(current, { name: next }))}
              />
            </Field>
            <Field label="Secteur d’activité">
              <EditableText
                label="Secteur d’activité"
                value={company.sector}
                onChange={(next) => update((current) => patchCompany(current, { sector: next }))}
              />
            </Field>
            <Field label="Téléphone">
              <EditableText
                label="Téléphone"
                value={contact.phone}
                onChange={(next) => update((current) => patchContact(current, { phone: next }))}
              />
            </Field>
            <Field label="Email">
              <EditableText
                label="Email"
                value={contact.email}
                onChange={(next) => update((current) => patchContact(current, { email: next }))}
              />
            </Field>
            <Field label="Site actuel">
              <EditableText
                label="Site actuel"
                value={company.website}
                onChange={(next) => update((current) => patchCompany(current, { website: next }))}
              />
            </Field>
            <Field label="Réseaux sociaux">
              <EditableText
                label="Réseaux sociaux"
                value={company.socials}
                onChange={(next) => update((current) => patchCompany(current, { socials: next }))}
              />
            </Field>
            <Field label="Adresse">
              <EditableText
                label="Adresse"
                value={company.address}
                onChange={(next) => update((current) => patchCompany(current, { address: next }))}
              />
            </Field>
            <Field label="Nombre d’employés">
              <EditableText
                label="Nombre d’employés"
                value={company.employees}
                onChange={(next) => update((current) => patchCompany(current, { employees: next }))}
              />
            </Field>
            <Field label="Zone géographique ciblée">
              <EditableText
                label="Zone géographique ciblée"
                value={company.area}
                onChange={(next) => update((current) => patchCompany(current, { area: next }))}
              />
            </Field>
          </div>
        </Card>
      </Section>

      <Section title="Premier appel / découverte" hint="Les mots du client, pas les nôtres.">
        <Card>
          <LongField
            label="Pourquoi le client nous contacte ?"
            value={discovery.reason}
            onChange={(next) => update((current) => patchDiscovery(current, { reason: next }))}
          />
          <LongField
            label="Besoin exprimé"
            value={discovery.need}
            onChange={(next) => update((current) => patchDiscovery(current, { need: next }))}
          />
          <LongField
            label="Situation actuelle"
            value={discovery.currentSituation}
            onChange={(next) => update((current) => patchDiscovery(current, { currentSituation: next }))}
          />
          <LongField
            label="Outils / solutions actuellement utilisés"
            value={discovery.currentTools}
            onChange={(next) => update((current) => patchDiscovery(current, { currentTools: next }))}
          />
          <LongField
            label="Problèmes identifiés"
            value={discovery.problems}
            onChange={(next) => update((current) => patchDiscovery(current, { problems: next }))}
          />
          <LongField
            label="Objectif principal"
            value={discovery.mainGoal}
            onChange={(next) => update((current) => patchDiscovery(current, { mainGoal: next }))}
          />
          <LongField
            label="Objectifs secondaires"
            value={discovery.secondaryGoals}
            onChange={(next) => update((current) => patchDiscovery(current, { secondaryGoals: next }))}
          />
          <LongField
            label="Résultat attendu"
            value={discovery.expectedOutcome}
            onChange={(next) => update((current) => patchDiscovery(current, { expectedOutcome: next }))}
            last
          />
        </Card>
      </Section>

      <Section title="Analyse BK Labs" hint="Notre lecture du dossier — interne.">
        <Card>
          <LongField
            label="Diagnostic BK Labs"
            value={analysis.diagnostic}
            onChange={(next) => update((current) => patchAnalysis(current, { diagnostic: next }))}
          />
          <LongField
            label="Problème principal identifié"
            value={analysis.mainProblem}
            onChange={(next) => update((current) => patchAnalysis(current, { mainProblem: next }))}
          />
          <LongField
            label="Opportunités identifiées"
            value={analysis.opportunities}
            onChange={(next) => update((current) => patchAnalysis(current, { opportunities: next }))}
          />
          <LongField
            label="Solution envisagée"
            value={analysis.solution}
            onChange={(next) => update((current) => patchAnalysis(current, { solution: next }))}
          />
          <LongField
            label="Justification de la solution"
            value={analysis.justification}
            onChange={(next) => update((current) => patchAnalysis(current, { justification: next }))}
          />

          <Field label="Type de solution" hint="Plusieurs choix possibles.">
            <ChoiceGroup
              multiple
              options={SOLUTION_TYPE_ORDER.map((value) => ({ value, label: SOLUTION_TYPES[value] }))}
              selected={analysis.solutionTypes}
              onToggle={(value) =>
                update((current) =>
                  patchAnalysis(current, {
                    solutionTypes: current.analysis.solutionTypes.includes(value as SolutionType)
                      ? current.analysis.solutionTypes.filter((entry) => entry !== value)
                      : [...current.analysis.solutionTypes, value as SolutionType],
                  }),
                )
              }
            />
          </Field>

          {analysis.solutionTypes.includes('autre') ? (
            <Field label="Préciser « autre »">
              <EditableText
                label="Préciser autre"
                value={analysis.solutionTypeOther}
                onChange={(next) => update((current) => patchAnalysis(current, { solutionTypeOther: next }))}
              />
            </Field>
          ) : null}
        </Card>
      </Section>
    </div>
  )
}

function LongField({
  label,
  value,
  onChange,
  last = false,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  last?: boolean
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 18 }}>
      <span className="cos-field-label">{label}</span>
      <EditableText label={label} value={value} onChange={onChange} multiline />
    </div>
  )
}
