"""Phase 2 — planches de contrôle de toute la carte (nouvelles photos, avant/après).

Usage : python3 -I card_sheets.py <produits.json> <dossier photos actuelles> <dossier nouvelles photos> <sortie>
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

prods = json.load(open(sys.argv[1]))
CUR, NEW, OUT = sys.argv[2:5]
os.makedirs(OUT, exist_ok=True)
F = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
FR = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
ORDER = ['Crousty', 'Smash Burgers', 'Smashs burgers🍔', 'Sandwiches', 'Tacos', 'Salades', 'Sides', 'Desserts', 'Boissons']


def font(p, s):
    return ImageFont.truetype(p, s)


def slug(p):
    u = p['image_url']
    return u.split('/')[-1].split('@')[0].split('.')[0] if u else None


visible = [p for p in prods if p['category'] != 'Accompagnements']   # catégorie masquée sur le site
visible.sort(key=lambda p: (ORDER.index(p['category']) if p['category'] in ORDER else 99, p['name']))

# 1. carte complète (nouvelles photos), vignettes 5:4 avec nom
TW, TH, PADX, LAB = 300, 240, 14, 46
cols = 6
rows = (len(visible) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (TW + PADX) + PADX, rows * (TH + LAB + PADX) + PADX + 70), '#F7F4EE')
d = ImageDraw.Draw(sheet)
d.text((PADX, 22), 'Croustys Naan — carte complète, scène « table en noyer »', font=font(F, 30), fill='#171717')
for i, p in enumerate(visible):
    x = PADX + (i % cols) * (TW + PADX)
    y = 70 + PADX + (i // cols) * (TH + LAB + PADX)
    s_ = slug(p)
    f = f'{NEW}/{s_}@1350.jpg' if s_ else None
    if f and os.path.exists(f):
        sheet.paste(Image.open(f).convert('RGB').resize((TW, TH), Image.LANCZOS), (x, y))
    else:
        d.rectangle((x, y, x + TW, y + TH), fill='#E5E0D7')
        d.text((x + TW / 2, y + TH / 2), 'pas de nouvelle photo', font=font(FR, 18), fill='#6B645B', anchor='mm')
    d.text((x + 2, y + TH + 8), p['name'][:34], font=font(F, 17), fill='#171717')
    d.text((x + 2, y + TH + 28), p['category'].replace('🍔', ''), font=font(FR, 14), fill='#6B645B')
sheet.save(f'{OUT}/carte-complete.jpg', quality=88)

# 2. avant / après, produit par produit (photos uniques)
seen, pairs = set(), []
for p in visible:
    s_ = slug(p)
    if s_ and s_ not in seen and os.path.exists(f'{NEW}/{s_}@1350.jpg'):
        seen.add(s_)
        pairs.append((p['name'], s_))
TW2, TH2 = 270, 216
cols2 = 4
rows2 = (len(pairs) + cols2 - 1) // cols2
cw = 2 * TW2 + 6
aa = Image.new('RGB', (cols2 * (cw + 18) + 18, rows2 * (TH2 + 40 + 18) + 18 + 60), '#171717')
d = ImageDraw.Draw(aa)
d.text((18, 16), 'Avant (photo actuelle) / après (scène) — chaque produit', font=font(F, 28), fill='white')
for i, (name, s_) in enumerate(pairs):
    x = 18 + (i % cols2) * (cw + 18)
    y = 60 + 18 + (i // cols2) * (TH2 + 40 + 18)
    cur = f'{CUR}/{s_}@1350.jpg' if os.path.exists(f'{CUR}/{s_}@1350.jpg') else f'{CUR}/{s_}.png'
    aa.paste(Image.open(cur).convert('RGB').resize((TW2, TH2), Image.LANCZOS), (x, y))
    aa.paste(Image.open(f'{NEW}/{s_}@1350.jpg').convert('RGB').resize((TW2, TH2), Image.LANCZOS), (x + TW2 + 6, y))
    d.text((x, y + TH2 + 8), name[:44], font=font(F, 16), fill='white')
aa.save(f'{OUT}/avant-apres-carte.jpg', quality=86)
print('ok', len(visible), 'produits affichés,', len(pairs), 'photos uniques')
