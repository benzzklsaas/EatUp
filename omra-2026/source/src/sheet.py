# Contact sheet of PDF pages for visual QA: python3 src/sheet.py in.pdf out.png first last [cols] [dpi]
import sys, pymupdf
from PIL import Image
pdf, out, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4
dpi = int(sys.argv[6]) if len(sys.argv) > 6 else 60
doc = pymupdf.open(pdf)
ims = []
for i in range(a - 1, min(b, len(doc))):
    pix = doc[i].get_pixmap(dpi=dpi)
    ims.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
pad = 10
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad) + pad), (120, 120, 120))
for k, im in enumerate(ims):
    sheet.paste(im, (pad + (k % cols) * (w + pad), pad + (k // cols) * (h + pad)))
sheet.save(out)
print(out, sheet.size)
