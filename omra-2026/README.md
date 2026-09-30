# Omra 2026 — Carnet de route

Notre voyage en famille — Médine • La Mecque, du 10 au 16 novembre 2026.

| Fichier | Usage |
| --- | --- |
| `Omra-2026-Carnet-iPhone.pdf` | Version téléphone (53 pages au format d’écran iPhone). Les champs et les cases se remplissent directement, le sommaire et les renvois « p. » sont cliquables, et des signets sont inclus. |
| `Omra-2026-Carnet-A4.pdf` | Version à imprimer (23 pages, une page par journée). Mêmes champs remplissables. |
| `carnet.html` | Version web autonome, à ouvrir dans un navigateur. Les saisies sont mémorisées dans ce navigateur, et « Imprimer » bascule en mise en page A4. |

## Sur iPhone

1. Enregistrer `Omra-2026-Carnet-iPhone.pdf` dans l’app **Fichiers**, pour y avoir accès hors connexion.
2. L’ouvrir depuis Fichiers. Toucher un champ pour écrire, toucher une case pour la cocher. Adobe Acrobat Reader fonctionne aussi.
3. Le sommaire (page 2) renvoie à chaque journée.

## Impression

Imprimer `Omra-2026-Carnet-A4.pdf` en A4, à 100 %. Le recto verso est possible.

## Ce qu’il faut savoir

- Les statuts utilisés dans le carnet : ✅ Confirmé (avec la date de vérification), 🟡 À réserver, 🔵 À vérifier, ⚠️ Important.
- Les horaires de prière ont été calculés le 29/09/2026 selon la méthode Umm al-Qura. Ce sont des heures d’adhan, à confirmer sur place.
- Les créneaux de la Rawdah, les horaires des trains et les règles Nusuk peuvent changer : les vérifier la semaine du départ. La dernière page du carnet donne toutes les sources.
- Ce carnet est un outil d’organisation. Il ne remplace ni l’avis d’un savant ni les consignes officielles données sur place.

## Mettre à jour le carnet

Le contenu (journées, textes, horaires) se trouve dans `source/src/build.mjs`, et la mise en page dans `source/src/styles.css`.

```bash
cd omra-2026/source
npm install                 # Playwright (Chromium) et les icônes Tabler
pip install pymupdf pillow  # champs PDF, signets et planches de contrôle
./make.sh                   # télécharge les polices au premier lancement, puis produit out/final-phone.pdf et out/final-a4.pdf
```

`make.sh` fait deux passes : la première calcule les numéros de page, la seconde les insère. Il transforme ensuite les cadres en vrais champs de formulaire.

Deux scripts de contrôle sont fournis : `node src/overflow.mjs` signale un texte qui déborde, `node src/measure.mjs a4 j3` mesure la hauteur d’une page.

Polices : Cormorant Garamond, Inter et Amiri (SIL Open Font License). Icônes : Tabler Icons (MIT).
