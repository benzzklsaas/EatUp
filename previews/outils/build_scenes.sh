#!/usr/bin/env bash
# Essai 2 — scènes photographiques : pose du plat dans chaque rendu, exports, planches, simulations.
# Usage : build_scenes.sh <scratchpad> <dossier previews> <piste recommandée A|B|C>
set -euo pipefail
S=$1; P=$2; REC=$3; T=$S/tools
F=/usr/share/fonts/opentype/inter/Inter-SemiBold.otf
declare -A NAME=([A]=noyer-lin [B]=beton-papier [C]=plateau-terrazzo)
declare -A TITLE=([A]="A — Table en noyer, lin et fourchette" [B]="B — Béton ciré et papier sulfurisé" [C]="C — Plateau noir sur terrazzo")
declare -A SHORT=([A]="A — Noyer & lin" [B]="B — Béton & papier" [C]="C — Plateau")
CFG='{"side":0.10,"grain":1.5,"vignette":0.07}'
mkdir -p "$P/variants" "$P/final" "$P/comparisons" "$S/work/scenes" "$S/sim2"

for v in A B C; do
  python3 -I "$T/compose_scene.py" "$S/scene/final/${v}_render.png" "$S/scene/final/${v}_render.json" \
    "$S/work/crousty-m_cutout_clean.png" "$S/work/scenes/$v.png" "$CFG"
done
python3 -I - "$S" "$P" "$REC" <<'EOF'
import sys
from PIL import Image
S, P, rec = sys.argv[1:4]
names = {'A': 'noyer-lin', 'B': 'beton-papier', 'C': 'plateau-terrazzo'}
for v, n in names.items():
    Image.open(f'{S}/work/scenes/{v}.png').convert('RGB').save(f'{P}/variants/crousty-m_{v}_{n}.jpg', quality=90, optimize=True, progressive=True)
m = Image.open(f'{S}/work/scenes/{rec}.png').convert('RGB')
m.save(f'{P}/final/crousty-m@1350.jpg', quality=90, optimize=True, progressive=True)
m.crop((135, 0, 1215, 1080)).save(f'{P}/final/crousty-m_carre@1080.jpg', quality=90, optimize=True, progressive=True)
EOF

band() { convert "$1" -resize "$2" -gravity north -background "$4" -splice 0x58 -font $F -pointsize 24 -fill "$5" -annotate +0+15 "$3" "$6"; }
cd "$S/work/scenes"
band "$P/original/crousty-m@1350.jpg" 660x528 "Photo originale (production)" '#171717' white o.png
for v in A B C; do
  col=white; t="${TITLE[$v]}"; [ "$v" = "$REC" ] && { col='#FFC20E'; t="$t  ★"; }
  band "$P/variants/crousty-m_${v}_${NAME[$v]}.jpg" 660x528 "$t" '#171717' "$col" s_$v.png
  # chaque proposition à côté de l'original
  band "$P/original/crousty-m@1350.jpg" 900x720 "Original" '#171717' white po.png
  band "$P/variants/crousty-m_${v}_${NAME[$v]}.jpg" 900x720 "$t" '#171717' "$col" pv.png
  montage po.png pv.png -tile 2x -geometry +8+8 -background '#171717' -quality 88 "$P/comparisons/original-vs-${v}_${NAME[$v]}.jpg"
done
montage o.png s_A.png s_B.png s_C.png -tile 2x -geometry +8+8 -background '#171717' -quality 88 "$P/comparisons/scenes_crousty-m.jpg"

# fidélité du plat : même zone à 100 % (original / scène recommandée)
python3 -I - "$S" "$P" "$REC" <<'EOF'
import sys, json
from PIL import Image
S, P, rec = sys.argv[1:4]
o = Image.open(f'{P}/original/crousty-m@1350.jpg').crop((520, 330, 1000, 650))
pl = json.load(open(f'{S}/work/scenes/{rec}.png.json'))
dx, dy = pl['ox'] - 243, pl['oy'] - 196          # le détourage a été pris en (243,196) dans l'original
n = Image.open(f'{P}/final/crousty-m@1350.jpg').crop((520 + dx, 330 + dy, 1000 + dx, 650 + dy))
c = Image.new('RGB', (980, 340), '#171717'); c.paste(o, (8, 10)); c.paste(n, (492, 10))
c.save(f'{S}/work/scenes/fid.png')
EOF
band fid.png 980x340 "Fidélité du plat à 100 %% — original (gauche) / scène retenue (droite)" '#171717' white fid_l.png
convert fid_l.png -quality 90 "$P/comparisons/fidelite-plat-100pct.jpg"

# simulations en contexte (mêmes gabarits que l'essai 1)
node "$T/simulate.js" "$S/orig" "$S/sim2" "$P/variants/crousty-m_A_${NAME[A]}.jpg" "$P/variants/crousty-m_B_${NAME[B]}.jpg" "$P/variants/crousty-m_C_${NAME[C]}.jpg"
cd "$S/sim2"
for v in Actuel A B C; do
  if [ $v = Actuel ]; then t="Actuel"; else t="${SHORT[$v]}"; [ "$v" = "$REC" ] && t="$t ★"; fi
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
echo "essai 2 construit (recommandée : $REC)"
