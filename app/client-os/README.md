# BK Labs — Client OS

> From first call to final delivery.

Espace interne de gestion des clients et des projets BK Labs. Accessible sur
**`/client-os`**.

---

## Ce que fait l'outil

| Écran | Route | Rôle |
| --- | --- | --- |
| Dashboard | `/client-os` | Ce qui brûle, ce qui arrive, l'état du portefeuille |
| Clients | `/client-os/clients` | Recherche, filtres par statut, cartes ou liste |
| Nouveau client | `/client-os/clients/new` | Onboarding en 5 étapes, moins de 2 minutes |
| Fiche client | `/client-os/clients/[id]` | 7 onglets, du brief à l'après-livraison |

**⌘K / Ctrl+K** ouvre la recherche globale depuis n'importe quel écran.

### Les 7 onglets de la fiche client

1. **Vue d'ensemble** — prochaine action, avancement, points de vigilance, argent, contact
2. **Brief** — informations client, premier appel, analyse BK Labs
3. **Projet** — périmètre (inclus / non inclus), contenus & ressources, direction créative
4. **Suivi** — planning en 12 étapes, V1, corrections
5. **Administratif** — acompte, solde, contrat, maintenance, hébergement
6. **Livraison** — checklist finale en 15 points, suivi J+1 / J+7, opportunités
7. **Notes** — notes internes datées et historique du projet

Tous les champs texte s'éditent sur place : un clic, on tape, on sort. Aucun
bouton « Enregistrer ».

---

## Principes de conception

**Chaque écran répond à « qu'est-ce que je dois faire maintenant ? ».** Le
dashboard ouvre sur le fil des actions prioritaires, pas sur des indicateurs.
Les chiffres viennent après.

**La couleur ne décore pas, elle dit un état.** Encre noire, blanc, hairlines,
chiffres en mono. Le vert, l'orange et le rouge ne servent qu'aux statuts.

**Rien n'est stocké s'il peut être déduit.** Progression, phase en cours,
blocages, prochaine action : tout est calculé depuis l'état du dossier
(`lib/client-os/compute.ts`). Une seule règle à corriger quand le process
change, et aucune donnée incohérente possible.

**L'historique se remplit tout seul.** Cocher une étape, encaisser un solde ou
signer un contrat écrit la ligne de timeline correspondante.

---

## Architecture

```
lib/client-os/
  types.ts       Modèle de domaine (une seule source de vérité)
  constants.ts   Référentiels métier : les 12 étapes, statuts, checklists
  factory.ts     Création d'un dossier complet à partir du strict minimum
  compute.ts     Progression, blocages, prochaine action, indicateurs
  actions.ts     Mutations pures Client → Client + historique automatique
  format.ts      Dates, montants, initiales (locale et fuseau figés)
  store.tsx      Contexte React + adaptateur de stockage
  seed.ts        6 dossiers de démonstration
  schema.sql     Schéma Postgres / Supabase cible

app/client-os/
  layout.tsx           Métadonnées + coquille
  client-os.css        Système de design, entièrement préfixé `cos-`
  page.tsx             Dashboard
  clients/             Liste, onboarding, fiche client
  _components/         Primitives, carte client, palette ⌘K, panneaux d'onglets
```

### Pourquoi une feuille de style dédiée plutôt que des styles en ligne

Les états de survol, le focus clavier, les media queries et
`prefers-reduced-motion` ne s'expriment pas en `style={{}}`. Toutes les règles
sont préfixées `cos-` et portées par `.cos-root` : aucun risque de collision
avec le reste de l'application, dans les deux sens.

> Les règles de remise à zéro passent par `:where()` pour avoir une spécificité
> nulle. Sans cela `.cos-root a` l'emporterait sur `.cos-btn--primary` et un
> bouton-lien perdrait sa couleur.

### Progression pondérée

Les 12 étapes ne pèsent pas le même poids : « acompte reçu » et
« développement » ne représentent pas le même avancement. Chaque étape porte un
poids (somme = 100) défini dans `constants.ts`. La phase affichée est la
première étape non cochée.

---

## Stockage

L'espace de travail vit dans le `localStorage` du navigateur. C'est volontaire
pour la V1 : l'outil est utilisable immédiatement, sans base, sans compte, sans
déploiement supplémentaire.

L'UI ne parle jamais au stockage directement — elle passe par
`WorkspaceProvider`. Brancher une base revient à fournir un autre objet
respectant `WorkspaceRepository` :

```ts
export type WorkspaceRepository = {
  load(): Promise<Workspace | null>
  save(workspace: Workspace): Promise<void>
  clear(): Promise<void>
}
```

`lib/client-os/schema.sql` décrit les tables correspondantes, y compris celles
préparées pour la V2 (utilisateurs, documents, factures, tâches, commentaires,
notifications).

**Conséquences à connaître :** les données sont locales au navigateur et ne
sont partagées avec personne — c'est aussi pour cela que la route n'est pas
protégée par le middleware. Elle est en `noindex`. Une authentification devient
nécessaire dès le passage en base partagée.

Au premier lancement, l'espace est amorcé avec 6 dossiers de démonstration pour
que l'outil ne s'ouvre jamais sur un écran vide.

---

## Prévu pour la V2

Typé dans `types.ts` et présent dans `schema.sql`, pas encore d'interface :
plusieurs utilisateurs BK Labs et permissions, documents et fichiers, factures
et contrats, tâches et calendrier, commentaires, notifications.
