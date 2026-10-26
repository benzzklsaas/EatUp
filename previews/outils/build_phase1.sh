#!/usr/bin/env bash
# Phase 1 — Crousty M : chaîne complète, de la photo de production aux planches de validation.
# Usage : build_phase1.sh <scratchpad> <dossier previews du dépôt>
set -euo pipefail
S=$1; P=$2; T=$S/tools
F=/usr/share/fonts/opentype/inter/Inter-SemiBold.otf
mkdir -p "$S/work" "$S/sim" "$P/original" "$P/variants" "$P/comparisons" "$P/final"

# 1. original intact + détourage + retouches locales documentées
cp "$S/orig/crousty-m@1350.jpg" "$P/original/crousty-m@1350.jpg"
python3 -I "$T/extract.py" "$S/orig/crousty-m@1350.jpg" "$S/work/crousty-m_cutout.png"
python3 -I "$T/retouch_crousty_m.py" "$S/work/crousty-m_cutout.png" "$S/work/crousty-m_cutout_clean.png"

# 2. trois pistes (même détourage, même cadrage)
for v in A B C; do python3 -I "$T/compose.py" "$S/work/crousty-m_cutout_clean.png" $v "$S/work/$v.png" & done; wait
python3 -I - "$S" "$P" <<'EOF'
import sys
from PIL import Image
S, P = sys.argv[1], sys.argv[2]
names = {'A': 'crousty-m_A_pierre-claire', 'B': 'crousty-m_B_anthracite', 'C': 'crousty-m_C_creme'}
for v, n in names.items():
    Image.open(f'{S}/work/{v}.png').convert('RGB').save(f'{P}/variants/{n}.jpg', quality=88, optimize=True, progressive=True)
# 3. version finale = piste C : maîtresse 5:4 (format du site), carré borne, détourage réutilisable
m = Image.open(f'{S}/work/C.png').convert('RGB')
m.save(f'{P}/final/crousty-m@1350.jpg', quality=88, optimize=True, progressive=True)
m.crop((135, 0, 1215, 1080)).save(f'{P}/final/crousty-m_carre@1080.jpg', quality=88, optimize=True, progressive=True)
Image.open(f'{S}/work/crousty-m_cutout_clean.png').save(f'{P}/final/crousty-m_detoure.png', optimize=True)
EOF

# 4. simulations en contexte (Chromium, tailles réelles)
node "$T/simulate.js" "$S/orig" "$S/sim" "$P/variants/crousty-m_A_pierre-claire.jpg" "$P/variants/crousty-m_B_anthracite.jpg" "$P/variants/crousty-m_C_creme.jpg"

# 5. planches légendées (bandeau au-dessus de chaque image)
band() { convert "$1" -resize "$2" -gravity north -background "$4" -splice 0x58 -font $F -pointsize 24 -fill "$5" -annotate +0+15 "$3" "$6"; }
cd "$S/work"
band "$P/original/crousty-m@1350.jpg" 660x528 "Actuel — visuel pop" '#171717' white l0.png
band "$P/variants/crousty-m_A_pierre-claire.jpg" 660x528 "A — Pierre calcaire claire" '#171717' white l1.png
band "$P/variants/crousty-m_B_anthracite.jpg" 660x528 "B — Anthracite gastronomique" '#171717' white l2.png
band "$P/variants/crousty-m_C_creme.jpg" 660x528 "C — Crème minimaliste  ★ recommandée" '#171717' '#FFC20E' l3.png
montage l0.png l1.png l2.png l3.png -tile 2x -geometry +8+8 -background '#171717' "$P/comparisons/pistes_crousty-m.jpg"
band "$P/original/crousty-m@1350.jpg" 900x720 "AVANT" '#171717' white a0.png
band "$P/final/crousty-m@1350.jpg" 900x720 "APRÈS — piste C" '#171717' '#FFC20E' a1.png
montage a0.png a1.png -tile 2x -geometry +8+8 -background '#171717' "$P/comparisons/avant-apres_crousty-m.jpg"

cd "$S/sim"
for v in Actuel A B C; do
  case $v in Actuel) t="Actuel";; A) t="A — Pierre claire";; B) t="B — Anthracite";; C) t="C — Crème ★";; esac
  convert mobile-liste_$v.png -crop 780x300+0+250 +repage card_$v.png
  convert borne_$v.png -crop 280x380+252+232 +repage tile_$v.png
  band mobile-liste_$v.png 390x844 "$t" '#cfcac2' '#171717' ml_$v.png
  band mobile-fiche_$v.png 390x844 "$t" '#cfcac2' '#171717' mf_$v.png
  band borne_$v.png 405x720 "$t" '#cfcac2' '#171717' bk_$v.png
  band card_$v.png 780x300 "$t" '#cfcac2' '#171717' cd_$v.png
  band tile_$v.png 280x380 "$t" '#cfcac2' '#171717' tl_$v.png
done
montage ml_Actuel.png ml_A.png ml_B.png ml_C.png -tile 4x -geometry +10+10 -background '#cfcac2' -quality 86 "$P/comparisons/simulation-mobile-liste.jpg"
montage mf_Actuel.png mf_A.png mf_B.png mf_C.png -tile 4x -geometry +10+10 -background '#cfcac2' -quality 86 "$P/comparisons/simulation-mobile-fiche.jpg"
montage bk_Actuel.png bk_A.png bk_B.png bk_C.png -tile 4x -geometry +10+10 -background '#cfcac2' -quality 86 "$P/comparisons/simulation-borne.jpg"
montage cd_Actuel.png cd_A.png cd_B.png cd_C.png -tile 2x -geometry +8+8 -background '#cfcac2' -quality 88 "$P/comparisons/vignette-mobile-taille-reelle-retina.jpg"
montage tl_Actuel.png tl_A.png tl_B.png tl_C.png -tile 4x -geometry +8+8 -background '#cfcac2' -quality 88 "$P/comparisons/tuile-borne-taille-reelle.jpg"
echo "phase 1 reconstruite"
