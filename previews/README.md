# Refonte photographique de la carte — Croustys Naan

Dossier de travail **hors production** : rien ici n'est lu par le site, aucune photo de production n'a été
remplacée ni modifiée (Supabase et base de données en lecture seule).

```
previews/
  original/      copie intacte de la photo de production (SHA-256 identique au fichier Supabase)
  variants/      les trois pistes de fond sur le même détourage
  comparisons/   planche des pistes, avant/après, simulations borne et mobile, vignettes à taille réelle
  final/         version recommandée : image maîtresse, carré borne, détourage réutilisable
  outils/        scripts de la chaîne (reproductible pour la phase 2) + mesures de contraste
```

## Phase 1 — résultat sur le plat test : Crousty M

**Plat choisi : Crousty M (sauce au choix)** — produit signature de l'enseigne, silhouette très
reconnaissable (bol en bambou), et meilleure photo source de la carte (vraie photo nette, bien exposée).

### Constat sur les photos actuelles

Les 41 photos de la carte (`products/crousty-naan/pop/*@1350.jpg`, 1350 × 1080, JPEG q86) sont des montages
« pop » : produit détouré avec un liseré blanc façon sticker, posé sur un aplat saturé couvert de typographie
géante (« CROUSTY CROUSTY », « FRAIS FRAIS »…). En vignette de 112 px, la typographie concurrence le produit
et les fonds changent de couleur à chaque catégorie : la carte n'est pas homogène.

### Les trois pistes (même détourage, même cadrage, même lumière sur le plat)

| Piste | Rendu | Lisibilité mesurée sur **toute** la carte* |
|---|---|---|
| A — Pierre calcaire claire | chaleureux, artisanal ; grain minéral fin | **15 à 25 / 39** produits bien contrastés : fond de luminosité moyenne-claire qui « mange » les produits clairs (frites, Crousty, galette, Cristaline) |
| B — Anthracite gastronomique | le plus spectaculaire, très premium | **34 / 39** — mais les salades (bols noirs), Coca Cherry, Dr Pepper et Perrier y perdent leur silhouette |
| C — Crème minimaliste | net, lumineux, moderne ; ombres douces | **34 / 39** — les produits très clairs (frites cheddar, Cristaline) restent lisibles grâce à l'ombre de contact |

\* Mesure de la luminance (L\*) du bord de chaque produit sur les 40 photos actuelles, comparée à celle du fond
(écart ≥ 20 L\*). Détail : `outils/mesures-contraste-carte.jsonl`. Les tons moyens (L\* 50–78) sont les pires
pour cette carte : une 4ᵉ piste dans ces tons serait objectivement moins bonne, elle n'a donc pas été retenue.

### Recommandation : piste C — Crème minimaliste (borne + click & collect)

- **Fonctionne sur la carte complète** : 34/39 produits nettement contrastés ; les 5 autres sont des produits
  clairs que l'ombre de contact suffit à détacher (solution naturelle). Avec B, les 5 cas difficiles sont des
  objets noirs sur fond noir, qu'on ne peut sauver qu'avec un éclairage de contour artificiel.
- **S'intègre à l'interface réelle** : le click & collect est crème (`#F7F4EE`) et blanc ; la vignette crème se
  lit comme un cadre doux dans la carte blanche, et la photo de la fiche se fond dans la feuille crème.
  Les vignettes anthracite font des blocs lourds sur une page claire.
- **Produit héros** : rien ne concurrence le plat, la couleur dorée de la panure ressort, le bambou reste chaud.
- **Plus léger** : 209 Ko contre 304 Ko pour la photo actuelle (−31 %).

La piste B reste une alternative valable si vous voulez une identité « dark premium » : il faudrait alors
traiter spécifiquement les boissons sombres et les salades en bol noir.

## Fichiers livrés

| Fichier | Usage |
|---|---|
| `final/crousty-m@1350.jpg` | image maîtresse 1350 × 1080 (5:4, **même format et même convention de nom que la production**) — click & collect |
| `final/crousty-m_carre@1080.jpg` | carré 1080 × 1080 recadré dans la maîtresse — borne (vignettes carrées) |
| `final/crousty-m_detoure.png` | plat détouré sur transparence, retouché — réutilisable sur n'importe quel fond |
| `variants/crousty-m_{A,B,C}_*.jpg` | les trois pistes, 1350 × 1080 |
| `comparisons/pistes_crousty-m.jpg` | actuel + A + B + C |
| `comparisons/avant-apres_crousty-m.jpg` | avant / après (piste C) |
| `comparisons/simulation-mobile-liste.jpg` | menu mobile 390 px (vignette 112 px réelle, bouton « + »), 4 versions |
| `comparisons/simulation-mobile-fiche.jpg` | fiche produit mobile (photo 4:3, dégradé haut, bouton fermer), 4 versions |
| `comparisons/simulation-borne.jpg` | borne portrait 1080 × 1920 (grille de 9 produits), 4 versions — vue réduite = lecture à distance |
| `comparisons/vignette-mobile-taille-reelle-retina.jpg` / `tuile-borne-taille-reelle.jpg` | contrôle au pixel près |

Dans les simulations, seul le Crousty M change : les autres produits gardent leur photo actuelle.

## Retouches réalisées (liste exhaustive)

Fidélité : ingrédients, quantité de poulet, sauce, riz, herbes, taille de la portion et bol **inchangés**.

1. **Détourage** : retrait du liseré blanc « sticker » et du fond pop ; bord décontaminé (pas de halo blanc).
2. **Flanc gauche du bol** : suppression d'un fragment de l'ancien arrière-plan (bosse de 3–4 px, deux points
   blancs) laissé par le premier détourage.
3. **Paroi bas-droite du bol** : le premier détourage avait entamé la paroi (encoche en marches) ; contour
   convexe restauré, pixels ajoutés recopiés par symétrie de la paroi voisine. Zone : paroi extérieure uniquement.
4. **Étalonnage léger** : balance des blancs un peu plus chaude, contraste +4 %, saturation +5 %, netteté
   modérée (aucun halo) — le plat garde ses couleurs naturelles.
5. **Fond reconstruit** : surface en perspective (caméra ~45°, comme la photo), profondeur de champ douce vers
   le fond, lumière douce haut-gauche cohérente avec l'éclairage du plat, ombre de contact + ombre ambiante.
6. **Cadrage** : plat centré dans le carré central (80 % de sa largeur), légèrement sous le centre — il reste
   entier dans la vignette carrée, la fiche 4:3 et la fiche 16:10, et le bouton « + » ne masque que le pied du bol.
   **Aucun agrandissement** : le plat reste à sa résolution d'origine (868 × 686 px).

## Limites techniques

- **Résolution source** : la seule source disponible est le visuel pop de 1350 px ; le bol y mesure 868 px.
  Suffisant pour la borne et le mobile (`next/image` sert au plus ~1 200 px), mais pas pour une impression ou un
  très grand écran. Avec la photo d'origine du photographe, le même traitement donnerait un fichier plus grand.
- **Borne** : aucune interface de borne n'existe dans ce dépôt. Si c'est une borne Tabesto, elle utilise
  probablement son propre catalogue de photos : il faudra y importer `final/crousty-m_carre@1080.jpg` (ou la
  maîtresse) selon le format qu'elle demande. La simulation de borne est générique (interface non contractuelle).
- **Contour d'origine** : de très petites irrégularités (1–2 px) du premier détourage subsistent au pied du bol,
  invisibles à la taille d'affichage.

## Analyse technique des supports (inchangée)

| Élément | Constat |
|---|---|
| Stockage | Supabase Storage, bucket public `products` |
| Référence | colonne `products.image_url` (URL publique complète, avec `?v=` de version) |
| Envoi | tableau de bord → Menu → Produits (`app/dashboard/menu/page.tsx:136`), sans redimensionnement ni recadrage |
| Diffusion | `components/eatup/food-image.tsx` : URL Supabase → `next/image` (AVIF/WebP, qualité 75) |

| Emplacement | Cadre affiché | Ratio | Particularités |
|---|---|---|---|
| Carte produit (menu) | 112 × 112 px (mobile), 124 × 124 px (≥ 640 px) | 1:1 | arrondi 18 px, fond `sand`, **le bouton « + » (44 px + anneau 4 px) masque ~40 × 40 px du coin bas-droit** |
| Fiche produit mobile | pleine largeur, ~390 × 292 px | 4:3 | hauteur max 44 vh, dégradé sombre sur les 96 px du haut |
| Fiche produit (≥ 640 px) | 540 × 338 px | 16:10 | idem |
| Panier / récapitulatif | 60 px / 48 px | 1:1 | |
| Indisponible | vignette 1:1 | — | passée en niveaux de gris |

## Inventaire préliminaire (pour la phase 2 — rien n'a été traité)

41 produits avec photo, 2 sans photo (**Naan Miel**, **Cheese Naan (seul)**). Anomalies relevées :

- **Tenders maison X4** : la photo montre 6–7 morceaux (promesse visuelle fausse) et le produit ne fait que
  ~420 px de large → nouvelle photo nécessaire.
- **Sandwich Cheese Naan** : photo très basse résolution, ressemble à une image de banque d'images
  (wrap salade/tomate) → à vérifier contre le produit réel.
- **Smash** et **Smash Burger** : fichiers strictement identiques ; **Tacos M / L / XL** : même photo pour trois tailles.
- **Smash** : source floue (image agrandie avant le montage pop) → nouvelle photo souhaitable.
- **Boissons** : le produit n'occupe que 3 à 16 % de l'image → il faudra des visuels plus grands (packshots
  fabricants en haute définition) pour qu'elles soient lisibles en vignette.
- **Naan Nutella** : ancienne photo (`1783261327105.png`, 540 × 360) hors charte pop.

## Phase 2 — méthode prévue (après validation uniquement)

1. Inventaire produit → photo actuelle → nouveau fichier (table de correspondance).
2. Même chaîne pour chaque plat (`outils/`) : détourage, retouches locales listées, fond C, contrôle visuel
   individuel à 100 % et en vignette.
3. Envoi des nouvelles photos **sous un nouveau nom** dans le bucket `products` ; seule `products.image_url`
   change (identifiants, prix, catégories, options, formules intacts). Retour arrière = restaurer l'ancienne URL,
   les anciens fichiers restant en place.

## Reproduire la phase 1

```bash
# photos actuelles dans <scratch>/orig, scripts dans <scratch>/tools (copie de previews/outils)
bash previews/outils/build_phase1.sh <scratch> previews
```

Outils : Python 3 + Pillow + NumPy, ImageMagick, Chromium + Playwright (préinstallés) — aucune dépendance
ajoutée au projet.
