/* eslint-disable -- outil de prévisualisation hors application (Node + Playwright) */
// Simulations de contrôle (borne + click & collect mobile) rendues dans Chromium à taille réelle.
// Usage : node simulate.js <dossier images actuelles> <dossier sortie> <test.jpg>...  (libellé = nom du fichier)
// Les dimensions reprennent le code du site : vignette 112 px arrondi 18, carte blanche arrondi 22,
// bouton « + » 44 px, fiche 4:3 pleine largeur avec dégradé haut, fond crème #F7F4EE.
const { chromium } = require('playwright')
const path = require('path')

const [cur, out, ...tests] = process.argv.slice(2)
const img = f => 'file://' + encodeURI(path.resolve(f)).replace(/@/g, '%40')
const curImg = n => img(path.join(cur, `${n}@1350.jpg`))

const versions = [{ label: 'Actuel', src: curImg('crousty-m') }, ...tests.map(t => ({ label: path.basename(t).split('_')[1] || path.basename(t), src: img(t) }))]

const css = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;color:#171717;-webkit-font-smoothing:antialiased}
  .muted{color:#6B645B}
`

function phoneList(v) {
  const card = (name, desc, price, src, formule) => `
    <article style="position:relative;border-radius:22px;background:#fff;box-shadow:0 1px 2px rgba(23,23,23,.04),0 8px 24px -12px rgba(23,23,23,.16)">
      <div style="display:flex;gap:16px;padding:14px;align-items:stretch">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding:2px 0">
          <h3 style="font-size:16px;line-height:1.35;font-weight:600">${name}</h3>
          ${desc ? `<p class="muted" style="margin-top:4px;font-size:14px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${desc}</p>` : ''}
          <div style="margin-top:auto;padding-top:10px;display:flex;gap:10px;align-items:center">
            <span style="font-size:16px;font-weight:600">${price}</span>
            ${formule ? `<span style="font-size:12px;font-weight:600;border-radius:999px;padding:3px 9px;background:#F1ECE4">Formule ${formule}</span>` : ''}
          </div>
        </div>
        <div style="position:relative;width:112px;height:112px;flex-shrink:0;align-self:center;overflow:hidden;border-radius:18px;background:#E5E0D7">
          <img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
        </div>
      </div>
      <span style="position:absolute;right:8px;bottom:8px;width:44px;height:44px;border-radius:50%;background:#FF6B35;box-shadow:0 0 0 4px #fff,0 6px 16px -6px rgba(23,23,23,.45);display:grid;place-items:center;font-size:26px;font-weight:400;line-height:1">+</span>
    </article>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
  <body style="background:#F7F4EE;width:390px;height:844px;overflow:hidden">
    <div style="height:54px;display:flex;align-items:center;gap:8px;padding:0 16px;font-size:13px;font-weight:600;background:#F7F4EE;border-bottom:1px solid rgba(23,23,23,.09)">
      ${['🍗 Crousty', '🍔 Smash Burgers', '🌯 Sandwiches', '🌮 Tacos'].map((c, i) => `<span style="padding:7px 12px;border-radius:999px;${i === 0 ? 'background:#171717;color:#F7F4EE' : 'background:#fff'}">${c}</span>`).join('')}
    </div>
    <main style="padding:20px 16px 0">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px"><span style="font-size:22px">🍗</span><h2 style="font-size:24px;font-weight:800;letter-spacing:-.02em">Crousty</h2><span class="muted" style="margin-left:auto;font-size:13px">2 plats</span></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${card('Crousty M (sauce au choix)', '', '8,90 €', v.src, '11,90 €')}
        ${card('Crousty L (sauce au choix)', '', '9,90 €', curImg('crousty-l'), '12,90 €')}
      </div>
      <div style="display:flex;align-items:baseline;gap:10px;margin:32px 0 14px"><span style="font-size:22px">🍔</span><h2 style="font-size:24px;font-weight:800;letter-spacing:-.02em">Smash Burgers</h2><span class="muted" style="margin-left:auto;font-size:13px">4 plats</span></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${card('Smash', 'Pain brioché, steak boucher smashé à souhait, cheddar maturé et sauce maison', '7,90 €', curImg('smash'), '10,90 €')}
        ${card('Double Smash', '', '9,90 €', curImg('double-smash'), '12,90 €')}
      </div>
    </main>
  </body></html>`
}

function phoneSheet(v) {
  const tile = (t, p, sel, sub) => `<div style="border-radius:16px;padding:12px 14px;background:${sel ? '#fff' : '#fff'};box-shadow:${sel ? 'inset 0 0 0 2px #171717' : 'inset 0 0 0 1px rgba(23,23,23,.09)'}"><div style="font-weight:600;font-size:15px">${t}</div>${sub ? `<div class="muted" style="font-size:13px;margin-top:2px">${sub}</div>` : ''}<div style="font-size:14px;margin-top:6px;font-weight:600">${p}</div></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
  <body style="width:390px;height:844px;overflow:hidden;position:relative;background:#F7F4EE">
    <div style="position:absolute;inset:0;background:rgba(23,23,23,.55)"></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:${Math.round(844 * 0.92)}px;border-radius:28px 28px 0 0;overflow:hidden;background:#F7F4EE;box-shadow:0 -12px 48px rgba(23,23,23,.25);display:flex;flex-direction:column">
      <div style="position:absolute;top:10px;left:0;right:0;display:flex;justify-content:center;z-index:20"><span style="width:40px;height:6px;border-radius:9px;background:rgba(23,23,23,.2)"></span></div>
      <div style="flex:1;overflow:hidden;position:relative">
        <div style="position:relative;width:100%;aspect-ratio:4/3;max-height:${Math.round(844 * 0.44)}px;overflow:hidden;background:#E5E0D7">
          <img src="${v.src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;left:0;right:0;top:0;height:96px;background:linear-gradient(to bottom,rgba(23,23,23,.3),transparent)"></div>
        </div>
        <span style="position:absolute;top:12px;right:12px;z-index:30;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 4px 6px -1px rgba(0,0,0,.1);display:grid;place-items:center;font-size:18px">✕</span>
        <div style="padding:20px 20px 24px">
          <h2 style="padding-right:48px;font-size:26px;line-height:1.1;font-weight:800;letter-spacing:-.02em">Crousty M (sauce au choix)</h2>
          <p style="margin-top:12px;font-size:17px;font-weight:600">8,90 €</p>
          <p style="margin:24px 0 12px;font-size:17px;font-weight:600">Seul ou en formule ?</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${tile('Plat seul', '8,90 €', true)}${tile('En formule', '+3,00 €', false, 'Boisson + frites')}</div>
          <p style="margin:24px 0 12px;font-size:17px;font-weight:600">Sauce</p>
        </div>
      </div>
      <div style="border-top:1px solid rgba(23,23,23,.09);background:rgba(247,244,238,.95);padding:12px 20px 18px;display:flex;gap:12px;align-items:center">
        <div style="height:54px;width:120px;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 1px rgba(23,23,23,.09);display:flex;align-items:center;justify-content:space-around;font-weight:600">− <span>1</span> +</div>
        <div style="flex:1;height:54px;border-radius:16px;background:#FF6B35;display:flex;align-items:center;justify-content:space-between;padding:0 20px;font-weight:600;font-size:16px"><span>Ajouter</span><span>8,90 €</span></div>
      </div>
    </div>
  </body></html>`
}

function kiosk(v) {
  const items = [
    ['Crousty M', '8,90 €', v.src], ['Crousty L', '9,90 €', curImg('crousty-l')], ['Smash', '7,90 €', curImg('smash')],
    ['Double Smash', '9,90 €', curImg('double-smash')], ['Big BK', '10,90 €', curImg('big-bk')], ['Tacos M', '8,50 €', curImg('tacos-m')],
    ['Sandwich Classic', '7,90 €', curImg('sandwich-classic')], ['Frites', '3,90 €', curImg('frites')], ['Tenders x4', '5,90 €', curImg('tenders')],
  ]
  const cats = ['Crousty', 'Smash Burgers', 'Sandwiches', 'Tacos', 'Salades', 'Sides', 'Desserts', 'Boissons']
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
  <body style="width:1080px;height:1920px;overflow:hidden;background:#F4F2EE;display:flex;flex-direction:column">
    <header style="height:150px;background:#171717;color:#fff;display:flex;align-items:center;padding:0 48px;gap:24px">
      <div style="font-size:40px;font-weight:800;letter-spacing:.02em"><span style="color:#FFC20E">CROUSTY</span>NAAN</div>
      <div style="margin-left:auto;font-size:22px;opacity:.7">Sur place · À emporter</div>
    </header>
    <div style="flex:1;display:flex;min-height:0">
      <nav style="width:220px;background:#fff;padding:24px 16px;display:flex;flex-direction:column;gap:10px">
        ${cats.map((c, i) => `<div style="padding:22px 16px;border-radius:18px;font-size:22px;font-weight:700;${i === 0 ? 'background:#FFC20E' : 'background:#F4F2EE'}">${c}</div>`).join('')}
      </nav>
      <main style="flex:1;padding:32px 32px 0">
        <h1 style="font-size:44px;font-weight:800;margin-bottom:24px">Nos best-sellers</h1>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
          ${items.map(([n, p, s]) => `<div style="background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
            <div style="aspect-ratio:1/1;position:relative;background:#E5E0D7"><img src="${s}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></div>
            <div style="padding:14px 18px 18px"><div style="font-size:24px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n}</div><div style="font-size:24px;font-weight:600;margin-top:4px;color:#6B645B">${p}</div></div>
          </div>`).join('')}
        </div>
      </main>
    </div>
    <footer style="height:140px;background:#fff;display:flex;align-items:center;padding:0 48px;gap:24px;box-shadow:0 -4px 20px rgba(0,0,0,.06)">
      <div style="font-size:26px;font-weight:700">Ma commande · 0 article</div>
      <div style="margin-left:auto;background:#FFC20E;border-radius:20px;padding:26px 48px;font-size:28px;font-weight:800">Valider</div>
    </footer>
  </body></html>`
}

;(async () => {
  const browser = await chromium.launch()
  const shot = async (html, w, h, scale, file) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale })
    const htmlFile = path.join(out, file.replace(/\.png$/, '.html'))
    require('fs').writeFileSync(htmlFile, html)
    await page.goto('file://' + path.resolve(htmlFile), { waitUntil: 'load' })
    await page.screenshot({ path: path.join(out, file) })
    await page.close()
  }
  for (const v of versions) {
    await shot(phoneList(v), 390, 844, 2, `mobile-liste_${v.label}.png`)
    await shot(phoneSheet(v), 390, 844, 2, `mobile-fiche_${v.label}.png`)
    await shot(kiosk(v), 1080, 1920, 1, `borne_${v.label}.png`)
  }
  await browser.close()
  console.log('ok', versions.map(v => v.label).join(', '))
})()
