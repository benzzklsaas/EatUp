# Refonte de l'expérience client EatUp

Périmètre : parcours consommateur `/restaurant/[slug]` → panier → `/restaurant/[slug]/checkout` → `/suivi/[orderNumber]`.
Le tableau de bord restaurateur, la landing, l'abonnement Stripe et les webhooks ne sont pas modifiés.

## 1. Audit de l'existant (synthèse)

**Limite de l'audit** : le site public `eatup-app.fr` n'était pas joignable depuis l'environnement de travail
(politique réseau). L'audit repose sur le code source ; les parcours ont été testés sur un serveur local
alimenté par un faux Supabase et des données fictives (voir § 7). Aucune donnée de production n'a été lue ni modifiée.

### À conserver
- Stack Next.js 16 (App Router) + Supabase + Resend ; modèle de données (produits, catégories, groupes d'options,
  formules boisson/accompagnement, horaires à deux plages, fermetures exceptionnelles, statuts de commande).
- Règles métier : min/max d'options, formule (`menu_extra_price` = prix total de la formule), boisson obligatoire,
  accompagnement selon `has_accompagnement`, catégorie « Accompagnements » masquée, `is_online`, « Victime de son succès ».
- Paiement sur place uniquement (le flux Stripe commande existe mais n'est pas branché au checkout).
- Emails de confirmation (gabarits conservés à l'identique), limitation à 30 commandes/heure/IP, suivi temps réel.

### Défauts UX/UI relevés
- Page entièrement rendue côté client : écran de chargement global bloquant, 4 requêtes Supabase en cascade,
  puis 1 requête supplémentaire à chaque ouverture de produit (boutons désactivés pendant ce temps).
- Identité violette/sombre incohérente avec le reste de la plateforme (crème/orange) ; styles inline dupliqués.
- Pas de vrai panier : impossible de supprimer/modifier un article au checkout ; options affichées dans les cartes.
- Prix affiché dans la fiche faux en formule (le bouton ignorait le surcoût de formule).
- Validation des choix opaque (bouton grisé sans explication).
- Ordre des produits défini dans le tableau de bord (glisser-déposer) ignoré par la page publique.
- Confirmation minimaliste, suivi sans détail de commande ni informations de retrait.

### Problèmes de fiabilité / sécurité
- **Prix et statut fournis par le navigateur** : `/api/orders` insérait l'objet `order` reçu (`status`,
  `payment_status`…) et acceptait tout supplément entre 0 et 50 € par article. Une requête forgée pouvait créer une
  commande « PAYÉ EN LIGNE » ou une formule au prix du plat seul.
- Aucune vérification serveur de la disponibilité des produits/options ni du créneau de retrait.
- Créneaux calculés à l'heure du téléphone (et non de Paris) ; fermetures exceptionnelles testées en date UTC ;
  **bug d'arrondi** : entre hh:50 et hh:59 le premier créneau sautait d'une heure (13:55 → 15:00).
- Statut « Ouvert » ignorant les fermetures exceptionnelles.
- Lien de suivi de l'email client construit avec `NEXT_PUBLIC_APP_URL` sans valeur de repli (« undefined/suivi/… »).
- Email client non envoyé si le restaurant n'a pas d'email ; envoi bloquant avant la réponse.
- Commande sans articles possible si l'insertion des articles échouait.
- Page de suivi lisant `orders.*` (email, téléphone, nom) avec la clé publique.

## 2. Système de design

Défini dans `app/globals.css` (variables CSS + `@theme` Tailwind v4) :

| Token | Valeur | Usage |
|---|---|---|
| `ink` | `#171717` | texte, contrastes, écrans de marque (confirmation) |
| `cream` | `#F7F4EE` | fond de navigation et du menu |
| `sand` | `#E5E0D7` | surfaces secondaires, séparateurs, squelettes |
| `white` | `#FFFFFF` | cartes produit et formulaires |
| `brand` | `#FF6B35` (par défaut) | actions principales, sélection — **texte charbon dessus (6,3:1)** |
| `orange-ink` / `brand-text` | `#C2410C` | orange utilisé en texte sur fond clair (4,7:1) |
| `muted` | `#6B645B` | texte secondaire (5,3:1 sur crème) |

L'orange `#FF6B35` n'atteint que 2,8:1 avec du texte blanc : les boutons orange portent donc un texte charbon.

Typographies (auto-hébergées par `next/font`, licence SIL OFL, usage commercial libre) :
**Bricolage Grotesque** pour les titres (chargée uniquement sur les pages client, `lib/eatup/fonts.ts`),
**Geist** pour le texte et les prix (chiffres tabulaires).

Mouvement : animations sur `transform`/`opacity` uniquement, durées 200–550 ms, désactivées par
`prefers-reduced-motion` (classes `.eu-*`).

## 3. Personnalisation par restaurant

Les composants ne contiennent aucune couleur ni contenu propre à un restaurant. Personnalisable aujourd'hui :
logo, photo de couverture, description, message du jour, photos produits, emojis de catégories.

Couleur d'accent : prise en charge si la table `restaurants` possède une colonne `accent_color`
(ou `brand_color` / `primary_color`). Les variantes lisibles (texte sur l'accent, accent en texte) sont calculées
automatiquement (`lib/eatup/brand.ts`). **Migration facultative, non appliquée** :

```sql
alter table public.restaurants add column if not exists accent_color text
  check (accent_color is null or accent_color ~* '^#[0-9a-f]{6}$');
```

Sans cette colonne (ou valeur nulle), l'orange EatUp s'applique. Il faudra ensuite ajouter le champ dans
Paramètres du tableau de bord.

## 4. Parcours livré

- **Accueil restaurant** (rendu serveur, plus d'écran de chargement bloquant) : couverture, logo, nom, statut
  réel (ouvert jusqu'à…/prochaine ouverture), premier créneau de retrait réel, paiement sur place, itinéraire,
  appel, partage, message du jour, bandeau « commande en cours » si une commande récente existe sur l'appareil.
- **Menu** : catégories collantes avec suivi du défilement, cartes photo, badge de quantité, ajout direct des
  produits simples (point animé vers le panier, toast avec « Annuler »), recherche à partir de 12 plats,
  squelettes de chargement, écran d'erreur avec « Réessayer ».
- **Fiche produit** (feuille glissante, fermeture par Échap, retour du téléphone ou glisser vers le bas) :
  photo, formule seul/menu, options avec règles explicites, accompagnement et boisson, quantité, prix exact en direct,
  erreurs nommées et mise en évidence du groupe manquant.
- **Panier** : persistant (localStorage, synchronisé entre onglets, reprise automatique des anciens paniers),
  quantités, suppression, modification d'un article, détail des formules et options, articles devenus
  indisponibles signalés et bloquants, suggestion de boissons (uniquement si le panier n'en contient pas).
- **Retrait et paiement** : récapitulatif repliable, créneaux réels (heure de Paris), « au plus tôt »,
  recalcul chaque minute avec avertissement si le créneau choisi expire, coordonnées avec validation identique
  au serveur et saisie automatique du navigateur, total sans frais cachés, protection contre le double envoi.
- **Confirmation et suivi** (`/suivi/[n]`) : écran signature (coche dessinée, éclats discrets, une seule fois),
  numéro copiable, progression Transmise → En préparation → Prête → Récupérée pilotée uniquement par
  `orders.status` (temps réel Supabase + interrogation toutes les 20 s en secours), instructions de retrait,
  détail de la commande, titre d'onglet « ✅ Prête » quand c'est le cas.

## 5. Sécurité et règles serveur (`app/api/orders/route.ts`)

- Le navigateur n'envoie plus que des identifiants : produits, options, formule, quantités, coordonnées, créneau.
- Le serveur relit la carte, applique `lib/eatup/pricing.ts` (même code que l'interface), refuse produits
  indisponibles/hors ligne, options inconnues/indisponibles/hors limites, formules incomplètes, créneaux hors
  horaires/fermetures/passés, et fixe `status = pending`, `payment_method = cash`, `payment_status = unpaid`.
- Idempotence sans changement de schéma : un renvoi du même numéro (réseau coupé) renvoie la commande existante.
- Les articles en échec suppriment la commande créée (pas de commande fantôme).
- Emails envoyés après la réponse (`after()`), journaux sans données personnelles.
- Suivi public via `GET /api/orders/[n]` : aucun nom, email ni téléphone du client.

## 6. Points à valider avant déploiement

1. **RLS de la table `orders`** (non vérifiable depuis le code) : l'ancienne page de suivi lisait `orders.*` avec la
   clé anonyme. Si une politique autorise `select` à `anon` sans restriction, toutes les commandes (noms, emails,
   téléphones) sont lisibles par n'importe qui. La nouvelle page n'en a plus besoin pour l'affichage ; seul le
   temps réel l'utilise (repli automatique par interrogation sinon). À contrôler :
   `select * from pg_policies where tablename in ('orders','order_items');`
2. **`restaurants.is_open`** (« Fermer maintenant » dans Paramètres) n'est pas pris en compte par la page publique,
   comme avant. Il est aussi utilisé par le superadmin pour activer/désactiver un compte. Le bloquer côté client
   pourrait couper les commandes si la valeur en production est `false` : décision à prendre en connaissance.
3. **Optimisation d'images** : les photos Supabase passent par `next/image` (AVIF/WebP, tailles adaptées). Sur
   Vercel, cela consomme le quota « Image Optimization » (faible pour une carte de ~50 produits).
4. **Photos** : je n'ai pas pu voir les photos réelles. Recommandations : format 4:3, plat centré, lumière
   naturelle, fond neutre, ≥ 1200 px de large ; remplacer en priorité les photos sombres, floues ou en portrait.
   Les produits sans photo restent présentés proprement (carte texte).
5. Paniers ouverts pendant la mise en production : l'ancien format est refusé avec un message « Rechargez la page » ;
   les paniers enregistrés sont repris automatiquement au rechargement.
6. Avertissement préexistant de Next 16 : `middleware.ts` est à renommer en `proxy.ts` (non modifié ici).

## 7. Tests

- `npm test` : 33 tests unitaires (Node, sans dépendance) sur les prix/formules/options, les créneaux et le
  statut d'ouverture en heure de Paris (été/hiver, fermetures), le panier (fusion, reprise de l'ancien format)
  et la validation des requêtes de commande.
- Tests de bout en bout réalisés (scripts hors dépôt) avec Chromium mobile sur le build de production et un faux
  Supabase : parcours complet, états fermé / sans créneau / rupture / panne / 320 px / desktop / mouvement réduit,
  16 tentatives d'abus de l'API, audit Lighthouse (menu : accessibilité 100, bonnes pratiques 100).

## 8. Non implémenté (et pourquoi)

- Paiement en ligne : le flux Stripe commande existe mais n'était pas activé ; l'activer est une décision métier.
- Comptes clients, historique, favoris, « recommander » : aucun compte client dans le modèle de données.
- Badges « nouveau » / « best-seller » : aucune donnée fiable aujourd'hui (nécessiterait une vue agrégée des ventes).
- Notifications SMS/push : seul l'email est intégré.
- Capacité par créneau : aucune donnée de capacité ; les créneaux reflètent les horaires réels uniquement.
- Restyle du tableau de bord : hors périmètre (palette proche mais non alignée : `#f97316` / `#FFFBF5`).
