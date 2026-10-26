"""Détourage par réseau de segmentation ISNet (onnxruntime) — pour les photos sans liseré exploitable.

Usage : python3 -I isnet_cut.py <modèle.onnx> <image> <sortie.png> [--within masque.png]
Le masque du réseau (1024 × 1024) est remis à l'échelle, adouci et décontaminé du fond.
"""
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image

model, src, dst = sys.argv[1:4]
img = Image.open(src).convert('RGBA')
rgb = img.convert('RGB')
sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
x = np.asarray(rgb.resize((1024, 1024), Image.BICUBIC)).astype(np.float32) / 255.0
x = (x - 0.5) / 1.0                                   # normalisation ISNet (moyenne 0,5, écart 1)
x = x.transpose(2, 0, 1)[None]
out = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
out = (out - out.min()) / (out.max() - out.min() + 1e-6)
mask = Image.fromarray((out * 255).astype(np.uint8)).resize(rgb.size, Image.BICUBIC)
a = np.asarray(mask).astype(np.float32) / 255.0
a = np.clip((a - 0.15) / 0.7, 0, 1)                   # bords nets mais anticrénelés
if img.mode == 'RGBA':
    a = a * (np.asarray(img)[..., 3] / 255.0)        # reste dans le détourage existant s'il y en a un
rgba = np.dstack([np.asarray(rgb), (a * 255).astype(np.uint8)])
ys, xs = np.nonzero(a > 0.02)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').save(dst)
print(f'{dst}: {x1 - x0}x{y1 - y0} px')
