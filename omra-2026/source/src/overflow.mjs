// Reports elements whose content is wider than their box (would be clipped or overflow), per format.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const widths = { a4: 176 * 96 / 25.4, phone: 346 };
const b = await chromium.launch({ args: ['--font-render-hinting=none'] });
for (const fmt of ['a4', 'phone']) {
  const p = await b.newPage({ viewport: { width: Math.round(widths[fmt]), height: 1000 } });
  await p.addInitScript(() => { window.__PDF__ = true; });
  await p.goto('file://' + resolve('out/carnet.html'));
  await p.evaluate((f) => { document.documentElement.className = f; }, fmt);
  await p.emulateMedia({ media: 'print' });
  await p.evaluate(() => document.fonts.ready);
  const bad = await p.evaluate(() => {
    const out = [];
    const sel = '.ev-t, .ev-h, .ev-l, .ev-d, .ev-n, .pt-c .v, .pt-c .n, .pt-c .c, .stop-day, .stop-wd, .mini-tl .d, .mini-tl .t, .st, .chip, .toc-e, .f-l, .f-h, .lab, .who, .cbw, .step-dur, .tag, .dh-city, .dh-top, .card-t, .cat-t, .counter span, .seg b, .seg span, .legend .d';
    document.querySelectorAll(sel).forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'contents') {
        const sec = el.closest('section');
        out.push(`${sec ? sec.id : '?'} | ${el.className} | ${el.textContent.trim().slice(0, 60)} | ${el.scrollWidth}>${el.clientWidth}`);
      }
    });
    return out;
  });
  console.log(`== ${fmt}: ${bad.length} overflow(s)`);
  bad.forEach((l) => console.log('  ' + l));
  await p.close();
}
await b.close();
