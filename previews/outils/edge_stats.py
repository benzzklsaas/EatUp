"""Mesure (sans export d'image) la luminance L* du bord de chaque produit de la carte.

Usage : python3 -I edge_stats.py <image> → une ligne JSON.
Bord = pixels du produit à moins de 14 px de son contour (c'est ce qui doit se détacher du fond).
"""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from extract import dilate, erode, largest_component  # noqa: E402


def lstar(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    y = lin @ np.array([0.2126, 0.7152, 0.0722])
    return np.where(y > 0.008856, 116 * np.cbrt(y) - 16, 903.3 * y)


src = sys.argv[1]
rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
h, w, _ = rgb.shape
mn, mx = rgb.min(2), rgb.max(2)
white = (mn > 200) & (mx - mn < 40)
nw = Image.fromarray(((~white) * 255).astype(np.uint8)).copy()
for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    if nw.getpixel(c) == 255:
        ImageDraw.floodfill(nw, c, 100, thresh=0)
outside = np.asarray(nw) == 100
ring = dilate(outside, 30) & ~outside & (mn > 226) & (mx - mn < 22)
prod = largest_component(erode(~outside & ~ring, 2))
edge = prod & ~erode(prod, 14)
L = lstar(rgb)
e, p = L[edge], L[prod]
print(json.dumps({
    'file': src.rsplit('/', 1)[-1],
    'area_pct': round(100 * prod.mean(), 1),
    'edge_p10': round(float(np.percentile(e, 10)), 1),
    'edge_med': round(float(np.median(e)), 1),
    'edge_p90': round(float(np.percentile(e, 90)), 1),
    'prod_med': round(float(np.median(p)), 1),
}))
