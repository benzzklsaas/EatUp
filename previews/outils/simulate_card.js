/* eslint-disable -- outil de prévisualisation hors application (Node + Playwright) */
// Simulation de contrôle : carte complète sur borne (portrait 1080 × 1920) et menu mobile (390 px),
// photos actuelles vs nouvelles. Usage : node simulate_card.js <produits.json> <actuelles> <nouvelles> <sortie>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const [prodFile, CUR, NEW, OUT] = process.argv.slice(2)
const prods = JSON.parse(fs.readFileSync(prodFile, 'utf8')).filter(p => p.category !== 'Accompagnements')
const url = f => 'file://' + encodeURI(path.resolve(f)).replace(/@/g, '%40')
const slug = p => (p.image_url ? p.image_url.split('/').pop().split('@')[0].split('.')[0] : null)
const img = (p, version) => {
  const s = slug(p)
  if (!s) return null
  if (version === 'new' && fs.existsSync(path.join(NEW, `${s}@1350.jpg`))) return url(path.join(NEW, `${s}@1350.jpg`))
  const cur = [path.join(CUR, `${s}@1350.jpg`), path.join(CUR, `${s}.png`)].find(f => fs.existsSync(f))
  return cur ? url(cur) : null
}
const price = v => v.toFixed(2).replace('.', ',') + ' €'
const groups = [
  ['Crousty & Salades', ['Crousty', 'Salades']],
  ['Smash Burgers', ['Smash Burgers', 'Smashs burgers🍔']],
  ['Sandwiches & Tacos', ['Sandwiches', 'Tacos']],
  ['Sides & Desserts', ['Sides', 'Desserts']],
  ['Boissons', ['Boissons']],
]
const css = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;color:#171717}`

function kiosk(title, items, version) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
  <body style="width:1080px;height:1920px;overflow:hidden;background:#F4F2EE;display:flex;flex-direction:column">
    <header style="height:150px;background:#171717;color:#fff;display:flex;align-items:center;padding:0 48px">
      <div style="font-size:40px;font-weight:800"><span style="color:#FFC20E">CROUSTY</span>NAAN</div></header>
    <main style="flex:1;padding:32px 40px 0">
      <h1 style="font-size:44px;font-weight:800;margin-bottom:24px">${title}</h1>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      ${items.slice(0, 12).map(p => `<div style="background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <div style="aspect-ratio:1/1;position:relative;background:#E5E0D7">${img(p, version) ? `<img src="${img(p, version)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#6B645B;font-size:20px">Pas de photo</div>'}</div>
        <div style="padding:12px 16px 16px"><div style="font-size:21px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div><div style="font-size:21px;color:#6B645B;margin-top:2px">${price(p.price)}</div></div>
      </div>`).join('')}
      </div></main></body></html>`
}

function mobile(version) {
  const sections = groups.map(([t, cats]) => [t, prods.filter(p => cats.includes(p.category))]).filter(([, l]) => l.length)
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
  <body style="width:390px;background:#F7F4EE;padding:20px 16px">
  ${sections.map(([t, list]) => `<h2 style="font-size:24px;font-weight:800;margin:10px 0 14px">${t}</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
    ${list.map(p => `<article style="position:relative;border-radius:22px;background:#fff;box-shadow:0 1px 2px rgba(23,23,23,.04),0 8px 24px -12px rgba(23,23,23,.16)">
      <div style="display:flex;gap:16px;padding:14px;align-items:center">
        <div style="flex:1;min-width:0"><h3 style="font-size:16px;font-weight:600">${p.name}</h3><div style="margin-top:28px;font-size:16px;font-weight:600">${price(p.price)}</div></div>
        <div style="position:relative;width:112px;height:112px;flex-shrink:0;overflow:hidden;border-radius:18px;background:#E5E0D7">${img(p, version) ? `<img src="${img(p, version)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ''}</div>
      </div>
      <span style="position:absolute;right:8px;bottom:8px;width:44px;height:44px;border-radius:50%;background:#FF6B35;box-shadow:0 0 0 4px #fff;display:grid;place-items:center;font-size:26px">+</span>
    </article>`).join('')}</div>`).join('')}
  </body></html>`
}

;(async () => {
  const browser = await chromium.launch()
  const shot = async (html, w, h, file, full = false) => {
    const f = path.join(OUT, file.replace(/\.png$/, '.html'))
    fs.writeFileSync(f, html)
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    await page.goto('file://' + path.resolve(f), { waitUntil: 'load' })
    await page.screenshot({ path: path.join(OUT, file), fullPage: full })
    await page.close()
  }
  for (const [i, [t, cats]] of groups.entries()) {
    const items = prods.filter(p => cats.includes(p.category))
    for (const [k, chunk] of [items.slice(0, 12), items.slice(12, 24)].entries()) {
      if (!chunk.length) continue
      for (const v of ['actuel', 'new']) await shot(kiosk(t + (k ? ' (suite)' : ''), chunk, v), 1080, 1920, `borne_${i}${k}_${v}.png`)
    }
  }
  for (const v of ['actuel', 'new']) await shot(mobile(v), 390, 844, `mobile_${v}.png`, true)
  await browser.close()
  console.log('ok')
})()
