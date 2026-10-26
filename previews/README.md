# Refonte photographique de la carte — Croustys Naan

Dossier de travail **hors production** : rien ici n'est lu par le site, aucune photo de production n'a été
remplacée ni modifiée (Supabase et base de données en lecture seule).

```
previews/
  original/              copie intacte de la photo de production (SHA-256 identique au fichier Supabase)
  variants/              essai 2 — les trois mises en scène photographiques (1350 × 1080)
  comparisons/           chaque scène à côté de l'original, fidélité du plat, simulations borne et mobile
  final/                 scène recommandée : maîtresse 5:4 (site) + carré (borne)
  essai-1-fonds-unis/    essai 1 (fonds unis A/B/C), conservé pour mémoire — direction abandonnée
  outils/                scripts de la chaîne (reproductible pour la phase 2) + mesures de contraste
```

## Essai 2 — vraies scènes de photographie culinaire (direction corrigée)

Plat test : **Crousty M (sauce au choix)**. Chaque proposition est une scène complète — table, accessoires,
lumière de fenêtre, profondeur de champ — construite autour de la vraie photo du plat.

### Méthode

Aucun outil de génération d'images par IA n'est disponible (pas de clé d'API, Hugging Face inaccessible, rien
dans le projet). L'outil le plus puissant disponible est **Blender 5 / Cycles** (rendu physique), installé hors
du projet. C'est aussi la méthode la plus fidèle : **aucun pixel de nourriture n'est inventé**.

1. **Scène 3D réaliste** : table et accessoires modélisés à l'échelle réelle, matières physiques (veinage et
   pores du bois, tissage du lin, papier froissé, béton, terrazzo, inox), serviette en lin obtenue par
   **simulation de tissu** (plis naturels), éclairage de fenêtre latérale + réflecteur, rebonds de lumière.
2. **Bol fantôme** : un bol invisible aux dimensions du vrai (Ø 17 cm, hauteur 6,5 cm, déduites de l'ellipse
   du rebord : caméra inclinée à 42,6°) projette ses **ombres de contact et portées physiquement exactes**.
3. **La vraie photo du plat** (détourage de l'essai 1) est posée exactement sur le bol fantôme : même
   perspective, même échelle (1:1, aucun agrandissement), pied aligné sur la base, lumière latérale raccordée.
4. **Profondeur de champ type « focus stacking »** : plat et table proche nets, arrière-plan adouci selon la
   distance réelle de chaque point de la table.

### Les trois scènes

| Scène | Mise en scène | Lecture |
|---|---|---|
| **A — Table en noyer, lin et fourchette** ★ | planches de noyer, serviette en lin sauge, fourchette inox, fenêtre à gauche | chaleureuse, naturelle ; le bol clair et la panure dorée éclatent sur le bois sombre ; accessoires en bordure |
| B — Béton ciré et papier sulfurisé | béton ciré gris chaud, papier sulfurisé froissé sous le bol, lin naturel | moderne, « street food » ; plus froide, papier très présent |
| C — Plateau noir sur terrazzo | plateau noir mat, papier ingraissable, fourchette bois, serviette papier, table terrazzo | le plus « fast-food premium » ; vignette plus chargée (éclats du terrazzo, cadre du plateau) |

### Recommandation : scène A pour la borne et le click & collect

- **La plus lisible en vignette** (112 px mobile, tuile de borne) : contraste net bol / table, rien ne parasite
  la silhouette, les accessoires restent dans les marges et disparaissent presque dans le carré de la borne.
- **La plus appétissante** : bois chaud + lin sauge (couleur complémentaire de la panure) font ressortir le doré.
- **Déclinable sur toute la carte** : la même table et la même lumière conviennent aux burgers, tacos, frites,
  tenders et naans ; seuls les accessoires changent selon le produit (papier pour un burger, etc.).

La scène C est une bonne alternative si vous voulez un signal « fast-food » explicite (plateau).

### Fidélité au produit

- Le plat est **la photo d'origine** : ingrédients, quantité, sauce, herbes, bol et taille de portion
  identiques (voir `comparisons/fidelite-plat-100pct.jpg`). Retouches, toutes hors nourriture :
  1. détourage : retrait du liseré blanc « sticker » et du fond pop, bord décontaminé (pas de halo) ;
  2. flanc gauche du bol : suppression d'un fragment de l'ancien arrière-plan (bosse de 3–4 px, deux points blancs) ;
  3. paroi bas-droite du bol : contour convexe restauré là où le premier détourage avait entamé la paroi ;
  4. léger dégradé de lumière côté fenêtre (±10 %) pour raccorder le plat à l'éclairage de la scène.
- **Aucun aliment ajouté** dans les scènes (ni pot de sauce, ni frites, ni boisson) pour ne rien promettre de
  plus que ce qui est servi. La fourchette inox (A) est un accessoire de mise en scène : si vous servez des
  couverts en bois, je peux l'adapter.
- Cadrage : le plat occupe 64 % de la largeur de l'image 5:4 et 80 % du carré de la borne.

### Fichiers de l'essai 2

| Fichier | Usage |
|---|---|
| `final/crousty-m@1350.jpg` | scène A, 1350 × 1080 (même format et convention de nom que la production) — click & collect |
| `final/crousty-m_carre@1080.jpg` | carré 1080 × 1080 recadré dans la même image — borne |
| `variants/crousty-m_{A,B,C}_*.jpg` | les trois scènes |
| `comparisons/scenes_crousty-m.jpg` | original + A + B + C |
| `comparisons/original-vs-*.jpg` | chaque scène à côté de la photo originale |
| `comparisons/fidelite-plat-100pct.jpg` | même zone du plat à 100 % : original / scène retenue |
| `comparisons/simulation-*.jpg`, `vignette-*`, `tuile-*` | menu mobile, fiche produit, borne, contrôle à taille réelle |

### Limites techniques

- **Résolution** : la seule source est le visuel pop de 1350 px (bol de 868 px) ; le plat n'est pas agrandi.
  Avec la photo d'origine du photographe, les scènes pourraient être rendues plus grandes.
- **Lumière du plat** : la photo d'origine est éclairée de face ; le raccord avec la fenêtre latérale est
  corrigé en douceur, mais une prise de vue réelle dans le décor resterait la référence absolue.
- **Matières** : à 100 %, les matières 3D sont un peu plus lisses qu'une vraie photo ; aux tailles d'affichage
  (borne, mobile) la différence n'est pas perceptible.
- **Temps** : ~6 min de rendu par scène et par plat sur cet environnement.
- **Borne** : aucune interface de borne dans ce dépôt (Tabesto ?) ; simulation générique.

## Essai 1 — fonds unis (abandonné)

Détourage du plat posé sur trois fonds (pierre claire, anthracite, crème). Direction écartée : rendu
« fiche produit », sans table ni mise en scène. Fichiers dans `essai-1-fonds-unis/`. Les mesures de contraste
de toute la carte (`outils/mesures-contraste-carte.jsonl`) restent valables pour choisir les tables.

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
2. Même chaîne pour chaque plat (`outils/`) : détourage, retouches locales listées, scène retenue (table et
   lumière identiques, accessoires adaptés au produit), contrôle visuel individuel à 100 % et en vignette.
3. Envoi des nouvelles photos **sous un nouveau nom** dans le bucket `products` ; seule `products.image_url`
   change (identifiants, prix, catégories, options, formules intacts). Retour arrière = restaurer l'ancienne URL,
   les anciens fichiers restant en place.

## Reproduire

```bash
# photos actuelles dans <scratch>/orig, scripts dans <scratch>/tools (copie de previews/outils)
bash previews/outils/build_phase1.sh <scratch> previews        # essai 1 + détourage retouché
uv venv -p python3.11 <scratch>/bvenv && uv pip install -p <scratch>/bvenv/bin/python bpy   # Blender (hors projet)
bash previews/outils/render_all.sh <scratch> 128               # rendus des scènes A, B, C
bash previews/outils/build_scenes.sh <scratch> previews A      # pose du plat, exports, planches, simulations
```

Outils : Python 3 + Pillow + NumPy, ImageMagick, Chromium + Playwright (préinstallés), Blender 5 (module
`bpy`, environnement isolé) — aucune dépendance ajoutée au projet.
