"""Retouche locale du détourage Crousty M (équivalent tampon / correcteur, documenté).

Défaut : sur le flanc gauche du bol (x 40-76, y 440-486 du détourage), un fragment de l'ancien fond
forme une bosse de 3-4 px avec deux points clairs (résidus du liseré blanc). Ce n'est pas le produit.
- contour : redressé en ligne droite entre les bords sains au-dessus et au-dessous de la bosse ;
- points clairs (positions relevées à la loupe) : chaque pixel reçoit la moyenne des pixels du flanc
  situés à la même distance du bord, 4 à 9 lignes au-dessus et au-dessous (la texture suit le bord).
Usage : python3 -I retouch_crousty_m.py <détourage.png> <sortie.png>
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
rgb, a = im[..., :3].copy(), im[..., 3].copy() / 255.0

Y0, Y1, X0, X1 = 440, 486, 36, 80
DOTS = [(57.2, 457.6), (62.8, 467.0)]   # centres des points clairs (x, y)
R = 3.6


def left_edge_raw(y):
    xs = np.nonzero(a[y, X0:X1] > 0.5)[0]
    return X0 + xs[0]


xa, xb = left_edge_raw(Y0), left_edge_raw(Y1)


def edge(y):
    """Bord sain interpolé entre les lignes Y0 et Y1 (bord d'origine ailleurs)."""
    return xa + (xb - xa) * (y - Y0) / (Y1 - Y0)


src_rgb = rgb.copy()
fixed = 0
for cx, cy in DOTS:
    for y in range(int(cy - R - 1), int(cy + R + 2)):
        for x in range(int(cx - R - 1), int(cx + R + 2)):
            dist = np.hypot(x - cx, y - cy)
            if dist > R + 0.8:
                continue
            o = x - edge(y)
            samples = []
            for k in list(range(-9, -3)) + list(range(4, 10)):
                yy = y + k
                xx = edge(yy) + o
                xi = int(round(xx))
                if any(np.hypot(xi - dx, yy - dy) < R + 1.5 for dx, dy in DOTS):
                    continue
                samples.append(src_rgb[yy, xi])
            new = np.mean(samples, 0)
            w = np.clip(R + 0.8 - dist, 0, 1)            # bord du correcteur adouci
            rgb[y, x] = rgb[y, x] * (1 - w) + new * w
            fixed += 1

for y in range(Y0, Y1 + 1):
    xe = edge(y)
    for x in range(X0, X1):
        a[y, x] = min(a[y, x], np.clip(x - xe + 0.5, 0, 1))

print(f'bord {xa}->{xb}, {fixed} px retouchés')
Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8), 'RGBA').save(dst)

# ---------------------------------------------------------------------------------------------
# 2. Paroi bas-droite : le premier détourage a entamé la paroi du bol (encoche en marches).
#    Un bol en bambou a une silhouette convexe : on comble la concavité par l'enveloppe convexe,
#    uniquement dans le secteur bas-droit, et on remplit les pixels ajoutés par symétrie de la paroi
#    voisine (même ton, même fibre). La nourriture n'est jamais touchée (zone = paroi extérieure).
from PIL import ImageDraw  # noqa: E402

SECTOR = (600, 400)        # x ≥ 600 et y ≥ 400 dans le détourage (868 × 686)


def hull(points):
    pts = sorted(set(map(tuple, points)))
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


m = a > 0.5
edge_pts = np.argwhere(m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)))
hp = hull([(int(x), int(y)) for y, x in edge_pts])
SS = 4                                                       # suréchantillonnage : bord anticrénelé
h_img = Image.new('L', (a.shape[1] * SS, a.shape[0] * SS), 0)
ImageDraw.Draw(h_img).polygon([(x * SS + SS / 2, y * SS + SS / 2) for x, y in hp], fill=255)
h_a = np.asarray(h_img.resize((a.shape[1], a.shape[0]), Image.BOX)).astype(np.float32) / 255.0
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
sector = (xx >= SECTOR[0]) & (yy >= SECTOR[1])
new_a = np.where(sector, np.maximum(a, h_a), a)
fill = sector & (new_a > 0.02) & (a < 0.98)
opaque = a > 0.98
count = 0
for y, x in np.argwhere(fill):
    win = opaque[max(y - 18, 0):y + 19, max(x - 18, 0):x + 19]
    qs = np.argwhere(win)
    if not len(qs):
        continue
    qs = qs + [max(y - 18, 0), max(x - 18, 0)]
    q = qs[np.argmin(((qs - [y, x]) ** 2).sum(1))]
    my, mx = 2 * q[0] - y, 2 * q[1] - x                     # miroir à travers l'ancien bord
    my, mx = int(np.clip(my, 0, a.shape[0] - 1)), int(np.clip(mx, 0, a.shape[1] - 1))
    col = rgb[my, mx] if opaque[my, mx] else rgb[q[0], q[1]]
    w = a[y, x]
    rgb[y, x] = rgb[y, x] * w + col * (1 - w) if w > 0.02 else col
    count += 1
a = new_a
print(f'paroi bas-droite : {count} px reconstruits')
Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8), 'RGBA').save(dst)
