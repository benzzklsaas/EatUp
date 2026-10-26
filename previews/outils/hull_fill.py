"""Restaure un contour convexe (emballage rigide : boîte, bol) entamé par le premier détourage, sur la partie
de la silhouette sous y_min (fraction de hauteur) ; les pixels ajoutés sont recopiés par symétrie du bord voisin.
Usage : python3 -I hull_fill.py <entrée.png> <sortie.png> <y_min 0-1>"""
import sys
import numpy as np
from PIL import Image, ImageDraw

src, dst, y_frac = sys.argv[1], sys.argv[2], float(sys.argv[3])
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
rgb, a = im[..., :3].copy(), im[..., 3] / 255.0
H_, W_ = a.shape
m = a > 0.5
y0 = int(np.nonzero(m.any(1))[0].min() + y_frac * (np.nonzero(m.any(1))[0].max() - np.nonzero(m.any(1))[0].min()))
edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
pts = sorted({(int(x), int(y)) for y, x in np.argwhere(edge) if y >= y0})


def cross(o, p, q):
    return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])


lo, up = [], []
for p in pts:
    while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
        lo.pop()
    lo.append(p)
for p in reversed(pts):
    while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
        up.pop()
    up.append(p)
hull = lo[:-1] + up[:-1]
SS = 4
h_img = Image.new('L', (W_ * SS, H_ * SS), 0)
ImageDraw.Draw(h_img).polygon([(x * SS + SS / 2, y * SS + SS / 2) for x, y in hull], fill=255)
h_a = np.asarray(h_img.resize((W_, H_), Image.BOX)).astype(np.float32) / 255.0
zone = np.zeros_like(m)
zone[y0 + 4:] = True                                   # pas de remplissage dans la bande de raccord du haut
new_a = np.where(zone, np.maximum(a, h_a), a)
fill = zone & (new_a > 0.02) & (a < 0.98)
opaque = a > 0.98
n = 0
for y, x in np.argwhere(fill):
    win = opaque[max(y - 20, 0):y + 21, max(x - 20, 0):x + 21]
    qs = np.argwhere(win)
    if not len(qs):
        continue
    qs = qs + [max(y - 20, 0), max(x - 20, 0)]
    q = qs[np.argmin(((qs - [y, x]) ** 2).sum(1))]
    my, mx = int(np.clip(2 * q[0] - y, 0, H_ - 1)), int(np.clip(2 * q[1] - x, 0, W_ - 1))
    col = rgb[my, mx] if opaque[my, mx] else rgb[q[0], q[1]]
    w = a[y, x]
    rgb[y, x] = rgb[y, x] * w + col * (1 - w)
    n += 1
Image.fromarray(np.dstack([np.clip(rgb, 0, 255), new_a * 255]).astype(np.uint8), 'RGBA').save(dst)
print(f'{dst}: {n} px restaurés sous y={y0}')
