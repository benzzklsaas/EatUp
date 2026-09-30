// Measures block heights (mm) of sections in a given format: node src/measure.mjs a4 essentiel rawdah ...
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const [fmt, ...ids] = process.argv.slice(2);
const widths = { a4: 176 * 96 / 25.4, phone: 346 };
const b = await chromium.launch({ args: ['--font-render-hinting=none'] });
const p = await b.newPage({ viewport: { width: Math.round(widths[fmt]), height: 1000 } });
await p.addInitScript(() => { window.__PDF__ = true; });
await p.goto('file://' + resolve('out/carnet.html'));
await p.evaluate((f) => { document.documentElement.className = f; }, fmt);
await p.emulateMedia({ media: 'print' });
await p.evaluate(() => document.fonts.ready);
const res = await p.evaluate((ids) => ids.map((id) => {
  const sec = document.getElementById(id);
  const mm = (px) => (px * 25.4 / 96).toFixed(1);
  const total = sec.getBoundingClientRect().height;
  const kids = [...sec.children].map((c) => `${c.tagName.toLowerCase()}.${(c.className || '').toString().split(' ')[0]} ${mm(c.getBoundingClientRect().height)}`);
  return `${id}: ${mm(total)} mm\n  ` + kids.join('\n  ');
}), ids);
console.log(res.join('\n'));
await b.close();
