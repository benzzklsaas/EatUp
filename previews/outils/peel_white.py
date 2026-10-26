"""Retire d'un détourage les zones blanches reliées au contour (restes du remplissage « sticker » coincés
dans les creux du produit). À réserver aux produits sans partie blanche (ex. tenders).
Usage : python3 -I peel_white.py <entrée.png> <sortie.png> [resserrage_px]"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
shrink = int(sys.argv[3]) if len(sys.argv) > 3 else 0
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
rgb, a = im[..., :3], im[..., 3] / 255.0
white = (rgb.min(-1) > 200) & (rgb.max(-1) - rgb.min(-1) < 40)
removed = 0
for _ in range(200):                      # épluchage depuis l'extérieur, tant qu'on touche du blanc
    outside = a < 0.5
    near = np.asarray(Image.fromarray((outside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
    peel = near & white & (a >= 0.5)
    if not peel.any():
        break
    a[peel] = 0.0
    removed += int(peel.sum())
for _ in range(shrink):
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(np.float32) / 255.0
Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA').save(dst)
print(f'{dst}: {removed} px blancs retirés, bord resserré de {shrink} px')
