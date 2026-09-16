'use client'

/**
 * Onboarding client — 5 étapes.
 *
 * Seul le nom de l'entreprise est obligatoire : un dossier se crée en moins de
 * deux minutes et se complète ensuite dans la fiche. Exiger 40 champs à la
 * création, c'est garantir que personne n'utilise l'outil.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DOSSIER_STATUS, DOSSIER_STATUS_ORDER, SOLUTION_TYPES, SOLUTION_TYPE_ORDER } from '@/lib/client-os/constants'
import { createClient } from '@/lib/client-os/factory'
import { formatMoney } from '@/lib/client-os/format'
import { useWorkspace } from '@/lib/client-os/store'
import type { DossierStatus, SolutionType } from '@/lib/client-os/types'
import { Card, ChoiceGroup, Field, Icon, Section } from '../../_components/ui'

const STEPS = [
  { title: 'Entreprise', hint: 'Qui est le client ?' },
  { title: 'Contact', hint: 'Qui décide et qui répond ?' },
  { title: 'Projet', hint: 'Qu’est-ce qu’on vend ?' },
  { title: 'Objectifs', hint: 'Pourquoi le client nous appelle ?' },
  { title: 'Planning', hint: 'Combien, et pour quand ?' },
]

type FormState = {
  companyName: string
  sector: string
  employees: string
  area: string
  website: string
  socials: string
  address: string
  firstName: string
  lastName: string
  role: string
  phone: string
  email: string
  projectName: string
  solutionTypes: SolutionType[]
  status: DossierStatus
  reason: string
  mainGoal: string
  expectedOutcome: string
  deadline: string
  total: string
  deposit: string
}

const INITIAL: FormState = {
  companyName: '',
  sector: '',
  employees: '',
  area: '',
  website: '',
  socials: '',
  address: '',
  firstName: '',
  lastName: '',
  role: '',
  phone: '',
  email: '',
  projectName: '',
  solutionTypes: [],
  status: 'prospect',
  reason: '',
  mainGoal: '',
  expectedOutcome: '',
  deadline: '',
  total: '',
  deposit: '',
}

export default function NewClientPage() {
  const router = useRouter()
  const { addClient } = useWorkspace()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const canContinue = step > 0 || form.companyName.trim().length > 0
  const isLast = step === STEPS.length - 1

  const total = Number(form.total) || 0
  const deposit = form.deposit === '' ? Math.round(total * 0.4) : Number(form.deposit) || 0

  function submit() {
    const name = form.companyName.trim()
    if (!name) {
      setStep(0)
      return
    }

    const client = createClient({
      companyName: name,
      sector: form.sector,
      employees: form.employees,
      area: form.area,
      website: form.website,
      socials: form.socials,
      address: form.address,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
      phone: form.phone,
      email: form.email,
      projectName: form.projectName,
      solutionTypes: form.solutionTypes,
      status: form.status,
      deadline: form.deadline || null,
      total,
      deposit,
      reason: form.reason,
      mainGoal: form.mainGoal,
      expectedOutcome: form.expectedOutcome,
    })

    addClient(client)
    router.push(`/client-os/clients/${client.id}`)
  }

  function next() {
    if (isLast) submit()
    else setStep((value) => Math.min(STEPS.length - 1, value + 1))
  }

  /** Entrée passe à l'étape suivante — l'onboarding se fait au clavier. */
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault()
      if (canContinue) next()
    }
  }

  return (
    <div className="cos-wizard">
      <header className="cos-page-head" style={{ paddingBottom: 0 }}>
        <div>
          <p className="cos-eyebrow">Nouveau dossier</p>
          <h1 className="cos-title">Créer un client</h1>
          <p className="cos-subtitle">
            Cinq étapes, deux minutes. Le reste de la fiche se remplit au fil du projet.
          </p>
        </div>
        <Link href="/client-os/clients" className="cos-btn cos-btn--ghost">
          <Icon name="close" size={15} />
          Annuler
        </Link>
      </header>

      <nav className="cos-wizard-rail" aria-label="Étapes">
        {STEPS.map((entry, index) => (
          <button
            key={entry.title}
            type="button"
            className={`cos-wizard-step${
              index === step ? ' cos-wizard-step--current' : index < step ? ' cos-wizard-step--done' : ''
            }`}
            onClick={() => index <= step && setStep(index)}
            disabled={index > step}
          >
            {index + 1}. {entry.title}
          </button>
        ))}
      </nav>

      <Card onKeyDown={onKeyDown}>
        <Section title={STEPS[step].title} hint={STEPS[step].hint}>
          {step === 0 ? (
            <>
              <Field label="Nom de l’entreprise *">
                <input
                  autoFocus
                  className="cos-input"
                  value={form.companyName}
                  onChange={(event) => set('companyName', event.target.value)}
                  placeholder="DPR Peinture"
                />
              </Field>
              <div className="cos-grid cos-grid--2">
                <Field label="Secteur d’activité">
                  <input
                    className="cos-input"
                    value={form.sector}
                    onChange={(event) => set('sector', event.target.value)}
                    placeholder="Peinture & rénovation"
                  />
                </Field>
                <Field label="Nombre d’employés">
                  <input
                    className="cos-input"
                    value={form.employees}
                    onChange={(event) => set('employees', event.target.value)}
                    placeholder="6"
                  />
                </Field>
                <Field label="Zone géographique ciblée">
                  <input
                    className="cos-input"
                    value={form.area}
                    onChange={(event) => set('area', event.target.value)}
                    placeholder="Lyon et 30 km alentour"
                  />
                </Field>
                <Field label="Site actuel">
                  <input
                    className="cos-input"
                    value={form.website}
                    onChange={(event) => set('website', event.target.value)}
                    placeholder="dpr-peinture.fr"
                  />
                </Field>
                <Field label="Réseaux sociaux">
                  <input
                    className="cos-input"
                    value={form.socials}
                    onChange={(event) => set('socials', event.target.value)}
                    placeholder="instagram.com/…"
                  />
                </Field>
                <Field label="Adresse">
                  <input
                    className="cos-input"
                    value={form.address}
                    onChange={(event) => set('address', event.target.value)}
                    placeholder="12 rue des Charmettes, 69006 Lyon"
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <div className="cos-grid cos-grid--2">
              <Field label="Prénom">
                <input
                  autoFocus
                  className="cos-input"
                  value={form.firstName}
                  onChange={(event) => set('firstName', event.target.value)}
                  placeholder="Damien"
                />
              </Field>
              <Field label="Nom">
                <input
                  className="cos-input"
                  value={form.lastName}
                  onChange={(event) => set('lastName', event.target.value)}
                  placeholder="Pruvost"
                />
              </Field>
              <Field label="Fonction">
                <input
                  className="cos-input"
                  value={form.role}
                  onChange={(event) => set('role', event.target.value)}
                  placeholder="Gérant"
                />
              </Field>
              <Field label="Téléphone">
                <input
                  className="cos-input"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => set('phone', event.target.value)}
                  placeholder="06 00 00 00 00"
                />
              </Field>
              <Field label="Email">
                <input
                  className="cos-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => set('email', event.target.value)}
                  placeholder="contact@entreprise.fr"
                />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Intitulé du projet">
                <input
                  autoFocus
                  className="cos-input"
                  value={form.projectName}
                  onChange={(event) => set('projectName', event.target.value)}
                  placeholder="Site vitrine premium"
                />
              </Field>
              <Field label="Type de solution" hint="Plusieurs choix possibles.">
                <ChoiceGroup
                  multiple
                  options={SOLUTION_TYPE_ORDER.map((value) => ({ value, label: SOLUTION_TYPES[value] }))}
                  selected={form.solutionTypes}
                  onToggle={(value) =>
                    set(
                      'solutionTypes',
                      form.solutionTypes.includes(value as SolutionType)
                        ? form.solutionTypes.filter((entry) => entry !== value)
                        : [...form.solutionTypes, value as SolutionType],
                    )
                  }
                />
              </Field>
              <Field label="Statut du dossier">
                <ChoiceGroup
                  options={DOSSIER_STATUS_ORDER.map((value) => ({
                    value,
                    label: DOSSIER_STATUS[value].label,
                  }))}
                  selected={[form.status]}
                  onToggle={(value) => set('status', value as DossierStatus)}
                />
              </Field>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field label="Pourquoi le client nous contacte ?">
                <textarea
                  autoFocus
                  className="cos-textarea"
                  value={form.reason}
                  onChange={(event) => set('reason', event.target.value)}
                  placeholder="Ce qu’il a dit, avec ses mots."
                />
              </Field>
              <Field label="Objectif principal">
                <textarea
                  className="cos-textarea"
                  value={form.mainGoal}
                  onChange={(event) => set('mainGoal', event.target.value)}
                  placeholder="Un objectif mesurable si possible."
                />
              </Field>
              <Field label="Résultat attendu">
                <textarea
                  className="cos-textarea"
                  value={form.expectedOutcome}
                  onChange={(event) => set('expectedOutcome', event.target.value)}
                  placeholder="À quoi ressemble un projet réussi pour lui."
                />
              </Field>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="cos-grid cos-grid--2">
                <Field label="Deadline">
                  <input
                    autoFocus
                    className="cos-input"
                    type="date"
                    value={form.deadline}
                    onChange={(event) => set('deadline', event.target.value)}
                  />
                </Field>
                <Field label="Montant total (€)">
                  <input
                    className="cos-input"
                    inputMode="numeric"
                    value={form.total}
                    onChange={(event) => set('total', event.target.value.replace(/[^\d]/g, ''))}
                    placeholder="4200"
                  />
                </Field>
                <Field label="Acompte (€)" hint="40 % par défaut si laissé vide.">
                  <input
                    className="cos-input"
                    inputMode="numeric"
                    value={form.deposit}
                    onChange={(event) => set('deposit', event.target.value.replace(/[^\d]/g, ''))}
                    placeholder={total ? String(Math.round(total * 0.4)) : '1680'}
                  />
                </Field>
              </div>

              <div
                className="cos-inline cos-inline-20"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--cos-radius-sm)',
                  background: 'var(--cos-surface-2)',
                  border: '1px solid var(--cos-line)',
                }}
              >
                <span>
                  <span className="cos-stat-label" style={{ display: 'block' }}>Total</span>
                  <span className="cos-num" style={{ fontSize: 16, fontWeight: 600 }}>{formatMoney(total)}</span>
                </span>
                <span>
                  <span className="cos-stat-label" style={{ display: 'block' }}>Acompte</span>
                  <span className="cos-num" style={{ fontSize: 16, fontWeight: 600 }}>{formatMoney(deposit)}</span>
                </span>
                <span>
                  <span className="cos-stat-label" style={{ display: 'block' }}>Solde</span>
                  <span className="cos-num" style={{ fontSize: 16, fontWeight: 600 }}>
                    {formatMoney(Math.max(0, total - deposit))}
                  </span>
                </span>
              </div>
            </>
          ) : null}
        </Section>

        <div className="cos-wizard-foot">
          <button
            type="button"
            className="cos-btn cos-btn--ghost"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
          >
            <Icon name="arrowLeft" size={15} />
            Retour
          </button>

          <div className="cos-inline cos-inline-8">
            {!isLast ? (
              <button type="button" className="cos-btn cos-btn--ghost" onClick={submit} disabled={!canContinue}>
                Créer maintenant
              </button>
            ) : null}
            <button type="button" className="cos-btn cos-btn--primary" onClick={next} disabled={!canContinue}>
              {isLast ? 'Créer le dossier client' : 'Continuer'}
              <Icon name="arrowRight" size={15} />
            </button>
          </div>
        </div>
      </Card>

      <p className="cos-meta" style={{ marginTop: 14, textAlign: 'center' }}>
        La structure complète du dossier — découverte, périmètre, planning, livraison — est générée
        automatiquement à la création.
      </p>
    </div>
  )
}
