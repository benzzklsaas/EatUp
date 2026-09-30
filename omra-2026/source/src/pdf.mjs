// Renders out/carnet.html to a PDF in one format.  node src/pdf.mjs <phone|a4> <out.pdf> [pages.json]
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const [fmt, outPdf, pagesJson] = process.argv.slice(2);
const footer = (size) => `
  @bottom-left { content: "Omra 2026 · Carnet de route"; font-family: Inter, sans-serif; font-size: ${size}; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #A59E94; vertical-align: top; padding-top: 2mm; }
  @bottom-right { content: counter(page) " / " counter(pages); font-family: Inter, sans-serif; font-size: ${size}; font-weight: 600; letter-spacing: .06em; color: #A2835A; vertical-align: top; padding-top: 2mm; }`;
const PAGE = {
  phone: `@page { size: 390px 844px; margin: 30px 22px 44px; background: #FBF8F2; ${footer('7.5px')} }
          @page cover { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }`,
  a4: `@page { size: 210mm 297mm; margin: 13mm 17mm 16mm; ${footer('6.4pt')} }
       @page cover { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }`,
}[fmt];
if (!PAGE) throw new Error('format must be phone or a4');

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage();
await page.addInitScript(() => { window.__PDF__ = true; });
await page.goto('file://' + resolve('out/carnet.html'));
await page.evaluate((f) => { document.documentElement.className = f; }, fmt);
await page.addStyleTag({ content: PAGE });
if (pagesJson && existsSync(pagesJson)) {
  const pages = JSON.parse(readFileSync(pagesJson, 'utf8'));
  await page.evaluate((p) => {
    document.querySelectorAll('.pg[data-for]').forEach((el) => {
      const n = p[el.dataset.for];
      if (n) el.textContent = String(n);
    });
  }, pages);
}
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: outPdf, preferCSSPageSize: true, printBackground: true, outline: false, tagged: true });
await browser.close();
console.log('pdf', fmt, outPdf);
