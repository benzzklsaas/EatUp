// Builds carnet.html — the single source for both PDFs (iPhone + A4) and the browser view.
// Usage: node src/build.mjs [pages.json]   (pages.json = section -> page number, from a first PDF pass)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sprite } from './icons.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const pagesFile = process.argv[2];
const PAGES = pagesFile && existsSync(pagesFile) ? JSON.parse(readFileSync(pagesFile, 'utf8')) : {};

// ---------------------------------------------------------------- helpers
const ic = (n, cls = '') => `<svg class="ic ${cls}"><use href="#i-${n}"/></svg>`;
const sti = (k) => `<svg class="sti c-${k}"><use href="#s-${k}"/></svg>`;
const ST = { ok: 'Confirmé', book: 'À réserver', verify: 'À vérifier', imp: 'Important' };
const st = (k, label = ST[k]) => `<span class="st st-${k}"><svg class="sti"><use href="#s-${k}"/></svg>${label}</span>`;
const vd = (d = '29/09/2026') => `<span class="vdate">Vérifié le ${d}</span>`;
const pg = (id) => `<span class="pg" data-for="${id}">${PAGES[id] ?? '00'}</span>`;
const ref = (id, label) => `<a class="xref" href="#${id}">${label}<span class="pgw">&nbsp;(p.&nbsp;${pg(id)})</span></a>`;
const names = new Set();
const uniq = (n) => { if (names.has(n)) throw new Error('duplicate field ' + n); names.add(n); return n; };
const fbox = (name, cls = '') => `<a class="f-box ${cls}" href="https://omra.local/${cls.includes('h2') || cls.includes('h3') ? 'm' : 't'}/${uniq(name)}"></a>`;
const cb = (name, cls = '') => `<a class="cb ${cls}" href="https://omra.local/c/${uniq(name)}"></a>`;

// Prayer times — Umm al-Qura method (Fajr 18.5°, Isha = Maghrib + 90 min), computed 29/09/2026.
// Order: Fajr, Lever, Dhuhr, Asr, Maghrib, Isha.
const PT = {
  med: {
    10: ['05:13', '06:34', '12:05', '15:14', '17:37', '19:07'],
    11: ['05:14', '06:34', '12:06', '15:14', '17:36', '19:06'],
    12: ['05:15', '06:35', '12:06', '15:14', '17:36', '19:06'],
    15: ['05:16', '06:37', '12:06', '15:13', '17:35', '19:05'],
    16: ['05:17', '06:38', '12:06', '15:13', '17:35', '19:05'],
  },
  mak: {
    12: ['05:11', '06:30', '12:05', '15:16', '17:40', '19:10'],
    13: ['05:11', '06:30', '12:05', '15:16', '17:39', '19:09'],
    14: ['05:12', '06:31', '12:05', '15:16', '17:39', '19:09'],
    15: ['05:12', '06:32', '12:05', '15:16', '17:39', '19:09'],
  },
};
const CITY = { med: 'Médine', mak: 'La Mecque' };

function prayers({ rows, friday = false, note = '', flight = false }) {
  // rows: [{ city, day, on: [indexes] }] — each prayer shows the time of the city where we are.
  const names = ['Fajr', 'Lever', friday ? 'Jumu’a' : 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const travel = rows.length > 1;
  const cells = names.map((n, i) => {
    const r = rows.find((row) => (row.on ?? [0, 1, 2, 3, 4, 5]).includes(i));
    const sun = i === 1 ? ' sun' : '';
    if (!r) return `<div class="pt-c off${sun}"><span class="n">${n}</span><span class="v">—</span><span class="c">${flight ? 'en vol' : ''}</span></div>`;
    const tag = travel ? `<span class="c ${r.city === 'med' ? 'cm' : 'cx'}">${CITY[r.city]}</span>` : '';
    return `<div class="pt-c${sun}"><span class="n">${n}</span><span class="v">${PT[r.city][r.day][i]}</span>${tag}</div>`;
  }).join('');
  const where = travel ? rows.map((r) => CITY[r.city]).join(' puis ') : CITY[rows[0].city];
  return `<div class="pt${travel ? ' travel' : ''}">
    <div class="pt-hd"><span class="eyebrow">Horaires des prières · ${where}</span>${st('verify', 'À confirmer sur place')}</div>
    <div class="pt-grid">${cells}</div>
    <p class="pt-note">Heures de l’adhan, calcul Umm al-Qura (méthode officielle saoudienne) du 29/09/2026 — écart possible de 1 à 2 min.${note ? ' ' + note : ''}</p>
  </div>`;
}

// Timeline event
function ev(e) {
  const kind = e.k ? e.k.split(' ').map((k) => 'k-' + k).join(' ') : '';
  const cls = ['ev', kind, e.sub ? 'sub' : '', e.city || ''].join(' ').trim();
  const time = e.t ? e.t : '';
  const tsmall = e.ts ? `<small>${e.ts}</small>` : '';
  const badges = (e.st || []).map((s) => (Array.isArray(s) ? st(s[0], s[1]) : st(s))).join('');
  const tag = e.opt ? '<span class="tag">Optionnel</span>' : '';
  const place = e.l ? `<span class="ev-l">${ic('map-pin')}${e.l}</span>` : '<span class="ev-l"></span>';
  const dur = e.d && e.d !== '—' ? `<span class="ev-d">${ic('clock-hour-4')}${e.d}</span>` : '<span class="ev-d"></span>';
  const note = e.n ? `<p class="ev-n">${e.n}</p>` : '';
  return `<li class="${cls}">
    <p class="ev-t">${time}${tsmall}</p>
    <div class="ev-i"><span class="node">${ic(e.i)}</span></div>
    <p class="ev-h">${e.h}${tag}${badges}</p>
    <p class="ev-m">${place}${dur}</p>
    ${note}
  </li>`;
}

function day(d) {
  return `<section class="sheet day city-${d.city}" id="${d.id}">
    <header class="dh">
      <div class="dh-top"><span class="eyebrow">Jour ${d.n} / 7</span><span class="dh-hijri">${d.hijri}</span></div>
      <h2 class="dh-date"><span class="wd">${d.wd}</span>${d.date}</h2>
      <div class="dh-city">${d.cityHtml}</div>
      <div class="dh-goal"><span class="eyebrow">Objectif du jour</span><p class="lead">${d.goal}</p></div>
    </header>
    ${prayers(d.prayers)}
    <ol class="tl">${d.events.map(ev).join('')}</ol>
    ${d.after || ''}
    <aside class="nt"><span class="eyebrow">Notes</span><ul>${d.notes.map(([k, t]) => `<li>${sti(k)}<span>${t}</span></li>`).join('')}</ul></aside>
  </section>`;
}

const cityLine = {
  med: `<span class="dot cm"></span><span class="cm">Médine</span><span class="ar">المدينة المنورة</span>`,
  mak: `<span class="dot cx"></span><span class="cx">La Mecque</span><span class="ar">مكة المكرمة</span>`,
  medToMak: `<span class="cm">Médine</span><span class="arrow">→</span>${ic('train')}<span class="arrow">→</span><span class="cx">La Mecque</span>`,
  makToMed: `<span class="cx">La Mecque</span><span class="arrow">→</span>${ic('train')}<span class="arrow">→</span><span class="cm">Médine</span>`,
  home: `<span class="cm">Médine</span><span class="arrow">→</span>${ic('plane-departure')}<span class="arrow">→</span><span>Retour</span>`,
};

// ---------------------------------------------------------------- sections
const cover = `<section class="cover" id="couverture">
  <p class="cv-top">Carnet de route</p>
  <div class="cv-arch">
    <svg class="arch" viewBox="0 0 200 290" preserveAspectRatio="none" aria-hidden="true">
      <path d="M8 290 V118 C8 66 46 26 100 4 C154 26 192 66 192 118 V290" stroke-width="0.9" vector-effect="non-scaling-stroke"/>
      <path d="M17 290 V121 C17 74 52 38 100 16 C148 38 183 74 183 121 V290" stroke-width="0.5" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="cv-center">
      ${ic('star8', 'cv-star')}
      <p class="cv-ar">عُمْرَة</p>
      <h1 class="cv-title"><span>OMRA</span><span class="cv-year">2026</span></h1>
    </div>
  </div>
  <div>
    <p class="cv-sub"><span class="nb">Notre voyage en famille —</span> <span class="nb">Médine • La Mecque</span></p>
    <p class="cv-dates">10 → 16 novembre 2026</p>
    <div class="cv-rule"></div>
  </div>
  <p class="cv-foot">Joumada al-Oula – Joumada al-Akhira 1448</p>
</section>`;

const tocEntry = (id, n, d = '', sub = false) =>
  `<a class="toc-e${sub ? ' sub' : ''}" href="#${id}"><span class="toc-n">${n}</span>${d ? `<span class="toc-d">${d}</span>` : ''}<span class="toc-sp"></span>${pg(id)}</a>`;

const toc = `<section class="sheet" id="sommaire">
  <header class="sh"><p class="eyebrow">Omra 2026 · Carnet de route</p><h2 class="sh-t">Sommaire</h2></header>
  <div class="toc-cols">
    <div>
      <div class="toc-g"><p class="eyebrow toc-gt">I · Préparer</p>
        ${tocEntry('ensemble', 'Vue d’ensemble', 'le voyage en un coup d’œil')}
        ${tocEntry('essentiel', 'À avoir sous la main', 'documents, réservations')}
        ${tocEntry('transports', 'Transports', 'avion, trains Haramain')}
        ${tocEntry('avant', 'Avant le départ', 'ce qu’il reste à faire')}
      </div>
      <div class="toc-g"><p class="eyebrow toc-gt">II · Jour par jour</p>
        ${tocEntry('j1', 'Mardi 10', 'Médine · arrivée')}
        ${tocEntry('j2', 'Mercredi 11', 'Médine · ziyârât')}
        ${tocEntry('rawdah', 'Rawdah', '', true)}
        ${tocEntry('j3', 'Jeudi 12', 'vers La Mecque')}
        ${tocEntry('ihram', 'Ihram & miqat', '', true)}
        ${tocEntry('j4', 'Vendredi 13', 'La Mecque · Omra')}
        ${tocEntry('etapes', 'Étapes de la Omra', '', true)}
        ${tocEntry('guide', 'Guide Omra — checklist', '', true)}
        ${tocEntry('j5', 'Samedi 14', 'La Mecque · journée lente')}
        ${tocEntry('j6', 'Dimanche 15', 'retour à Médine')}
        ${tocEntry('j7', 'Lundi 16', 'départ')}
      </div>
      <div class="toc-g"><p class="eyebrow toc-gt">III · Emporter & noter</p>
        ${tocEntry('valise', 'Checklist valise')}
        ${tocEntry('duas', 'Nos du’as')}
        ${tocEntry('sources', 'Sources & vérifications')}
      </div>
    </div>
    <div>
      <h3 class="h3 first">Légende</h3>
      <ul class="legend">
        <li>${st('ok')}<span class="d">Vérifié auprès d’une source officielle ou fiable, date indiquée.</span></li>
        <li>${st('book')}<span class="d">Réservation à faire : Nusuk, trains, hôtels, transferts.</span></li>
        <li>${st('verify')}<span class="d">Peut changer : à contrôler avant le départ ou sur place.</span></li>
        <li>${st('imp')}<span class="d">Point à ne pas manquer.</span></li>
      </ul>
      <h3 class="h3">Mode d’emploi</h3>
      <ul class="bul">
        <li><span>Les <b>champs</b> et les <b>cases</b> de ce PDF se remplissent directement sur l’iPhone (app Fichiers ou Adobe Acrobat) ; la version A4 s’imprime.</span></li>
        <li><span>Les liens du sommaire et les renvois « p. » mènent à la bonne page.</span></li>
        <li><span>Les heures sont des repères, pas des obligations : on adapte au rythme de Papa et Maman.</span></li>
      </ul>
    </div>
  </div>
</section>`;

const stop = (cls, icon, d, wd, title, ar, lines, chips = '') => `<li class="stop ${cls}">
  <div class="stop-d"><span class="stop-day">${d}</span><span class="stop-wd">${wd}</span></div>
  <div><span class="stop-node">${ic(icon)}</span></div>
  <div class="stop-c"><p class="stop-t">${title}${ar ? `<span class="ar">${ar}</span>` : ''}</p>${lines.map((l) => `<p class="stop-s">${l}</p>`).join('')}${chips ? `<p class="chips">${chips}</p>` : ''}</div>
</li>`;
const chip = (icon, t, key = false) => `<span class="chip${key ? ' key' : ''}">${ic(icon)}${t}</span>`;
const mini = (rows) => `<ul class="mini-tl">${rows.map(([d, t]) => `<li><span class="d">${d}</span><span class="t">${t}</span></li>`).join('')}</ul>`;

const overview = `<section class="sheet" id="ensemble">
  <header class="sh"><p class="eyebrow">I · Préparer</p><h2 class="sh-t">Vue d’ensemble</h2><p class="sh-sub">7 jours · 6 nuits · Moi, Papa et Maman</p></header>
  <div class="nights" style="grid-template-columns: 2fr 3fr 1.25fr">
    <div class="seg med"><b>Médine</b><span>2 nuits</span></div>
    <div class="seg mak"><b>La Mecque</b><span>3 nuits</span></div>
    <div class="seg med short"><b>Médine</b><span>1 nuit</span></div>
  </div>
  <ol class="route">
    ${stop('c-med', 'building-mosque', '10 nov.', 'mardi', 'Médine', 'المدينة المنورة', ['Arrivée à 05:00 · repos · première prière à Masjid an-Nabawi', 'Mer. 11 : ziyârât le matin, Rawdah selon Nusuk'], chip('sparkles', 'Rawdah · mer. 11', true) + chip('map-pin', 'Ziyârât · mer. 11'))}
    ${stop('c-move', 'train', '12 nov.', 'jeudi', 'Médine → La Mecque', '', ['Ihram préparé à l’hôtel, intention dans le train avant le miqat', 'Train Haramain ≈ 2 h – 2 h 30 · départ idéal vers 10:00'], chip('droplet', 'Ihram & miqat'))}
    ${stop('c-mak', 'kaaba', '12 → 15', 'nov.', 'La Mecque', 'مكة المكرمة', ['Ven. 13 : Omra à l’aube, puis Jumu’a au Haram', 'Sam. 14 : journée lente, prière et repos'], chip('kaaba', 'Omra · ven. 13', true) + chip('mosque', 'Jumu’a · ven. 13'))}
    ${stop('c-move', 'train', '15 nov.', 'dimanche', 'La Mecque → Médine', '', ['Tawaf d’adieu, train vers 10:00', 'Dernière après-midi et dernière soirée à Masjid an-Nabawi'])}
    ${stop('c-move', 'plane-departure', '16 nov.', 'lundi', 'Retour', '', ['Vol à 06:30 · réveil 02:00 · départ de l’hôtel 02:45'])}
  </ol>
  <div class="grid2">
    <div class="card"><p class="card-t">${ic('star')}Temps forts</p>${mini([
      ['Mer. 11 · 08:00', 'Ziyârât : Quba, al-Qiblatayn, Uhud'],
      ['Mer. 11', 'Rawdah — créneaux à vérifier dans Nusuk'],
      ['Jeu. 12 · ≈ 10:10', 'Intention de la Omra, dans le train'],
      ['Ven. 13 · 06:00', 'Omra : tawaf, sa’i, halq / taqsir'],
      ['Ven. 13 · 12:05', 'Jumu’a à Masjid al-Haram'],
      ['Dim. 15 · soir', 'Dernières prières à Masjid an-Nabawi'],
    ])}</div>
    <div class="card"><p class="card-t">${ic('route')}Déplacements</p>${mini([
      ['Mar. 10 · 06:45', 'Aéroport → hôtel, Médine'],
      ['Jeu. 12 · ≈ 10:00', 'Train Médine → La Mecque'],
      ['Dim. 15 · ≈ 10:00', 'Train La Mecque → Médine'],
      ['Lun. 16 · 02:45', 'Hôtel → aéroport · vol 06:30'],
    ])}</div>
  </div>
</section>`;

const field = (icon, label, name, hint = '', cls = '', extra = '') => `<label class="f ${cls.includes('wide') ? 'wide' : ''}">
  <span class="f-l">${ic(icon)}${label}${extra}</span>${fbox(name, cls.replace('wide', ''))}${hint ? `<span class="f-h">${hint}</span>` : ''}
</label>`;
const subField = (icon, label, rows, hint = '') => `<div class="f">
  <span class="f-l">${ic(icon)}${label}</span>
  <div class="f-sub">${rows.map(([l, n]) => `<div class="row"><span>${l}</span>${fbox(n, 'sm')}</div>`).join('')}</div>
  ${hint ? `<span class="f-h">${hint}</span>` : ''}
</div>`;
const ckItem = (name, label, small = '', badge = '') => `<li>${cb(name)}<span>${label}${badge}${small ? `<small>${small}</small>` : ''}</span></li>`;

const essentials = `<section class="sheet" id="essentiel">
  <header class="sh"><p class="eyebrow">I · Préparer</p><h2 class="sh-t">À avoir sous la main</h2><p class="sh-sub">À compléter avant le départ — dans le PDF ou au stylo.</p></header>
  <div class="fields">
    ${field('plane-arrival', 'Vol aller', 'vol_aller', 'Compagnie · n° de vol · arrivée à Médine vers 05:00')}
    ${field('plane-departure', 'Vol retour', 'vol_retour', 'Compagnie · n° de vol · départ de Médine 06:30')}
    ${field('building', 'Hôtel Médine', 'hotel_medine', 'Nom · adresse · téléphone · n° de réservation (10 → 12 et 15 → 16 nov.)', 'h2')}
    ${field('building', 'Hôtel La Mecque', 'hotel_mecque', 'Nom · adresse · téléphone · n° de réservation (12 → 15 nov.)', 'h2')}
    ${field('train', 'Train Médine → La Mecque', 'train_aller_ess', 'N° de train · heure · voiture et sièges — ' + ref('transports', 'détails'))}
    ${field('train', 'Train La Mecque → Médine', 'train_retour_ess', 'N° de train · heure · voiture et sièges')}
    ${field('device-mobile', 'Nusuk', 'nusuk', 'Compte · permis Omra (ven. 13) · permis Rawdah')}
    ${subField('e-passport', 'Visa', [['Moi', 'visa_moi'], ['Papa', 'visa_papa'], ['Maman', 'visa_maman']], 'N° de visa · validité')}
    ${subField('phone', 'Contact urgence', [['Nom', 'urgence_nom'], ['Tél.', 'urgence_tel']])}
    ${field('shield-check', 'Assurance · assistance', 'assurance', 'N° de contrat · téléphone d’assistance 24 h/24')}
    ${subField('map-pin', 'Points de rendez-vous', [['Médine', 'rdv_medine'], ['La Mecque', 'rdv_mecque']], 'N° de porte choisi sur place — hommes et femmes prient dans des espaces séparés.')}
  </div>
  <h3 class="h3">Checklist</h3>
  <ul class="ck cols2 cols2-phone">
    ${ckItem('ck_passeports', 'Passeports')}
    ${ckItem('ck_visa', 'Visa')}
    ${ckItem('ck_billets_avion', 'Billets d’avion')}
    ${ckItem('ck_hotels', 'Réservations hôtels')}
    ${ckItem('ck_haramain', 'Billets Haramain')}
    ${ckItem('ck_nusuk', 'Nusuk')}
    ${ckItem('ck_permis', 'Permis Omra')}
    ${ckItem('ck_rawdah', 'Rawdah')}
    ${ckItem('ck_assurance', 'Assurance')}
    ${ckItem('ck_paiement', 'Moyens de paiement')}
    ${ckItem('ck_tel', 'Téléphones / chargeurs')}
    ${ckItem('ck_esim', 'eSIM / forfait')}
  </ul>
  <h3 class="h3">Numéros utiles</h3>
  <div class="card line">
    <ul class="bul st-list">
      <li>${sti('verify')}<span><b>Urgences : 911</b> (numéro unifié) · ambulance 997 · police 999 · protection civile 998 — à vérifier avant le départ.</span></li>
      <li>${sti('ok')}<span><b>Train Haramain : 920 004 433</b> (réservations, service client) ${vd()}</span></li>
    </ul>
    <div class="f-inline"><span class="f-l">${ic('building')}Ambassade / consulat</span>${fbox('consulat', 'sm')}</div>
  </div>
</section>`;

const tf = (label, name, hint = '', wide = false) => `<label class="fi${wide ? ' wide' : ' half'}"><span class="lab">${label}</span>${fbox(name)}${hint ? `<span class="f-h">${hint}</span>` : ''}</label>`;
const trCard = (icon, title, date, badge, body) => `<div class="card tr-card">
  <div class="tr-head">${ic(icon)}<span class="tt">${title}</span>${badge}<span class="dd">${date}</span></div>
  <div class="kvf">${body}</div>
</div>`;

const transports = `<section class="sheet" id="transports">
  <header class="sh"><p class="eyebrow">I · Préparer</p><h2 class="sh-t">Transports</h2><p class="sh-sub">Avion, trains Haramain et transferts — à compléter après réservation.</p></header>
  <div class="tr-pair">
  ${trCard('train', 'Médine → La Mecque', 'Jeudi 12 novembre · train Haramain', st('book'), [
    tf('Départ', 'tr1_depart', 'Idéal ≈ 10:00 (09:30–11:00)'),
    tf('Arrivée', 'tr1_arrivee', '≈ 2 h – 2 h 30 plus tard'),
    tf('Train', 'tr1_train', 'N° · classe · voiture · sièges'),
    tf('Durée', 'tr1_duree', '≈ 2 h en direct, plus avec arrêts'),
    tf('Gare', 'tr1_gare', 'Gare Haramain de Médine — Knowledge Economic City, King Abdulaziz Road', true),
    tf('Transfert hôtel', 'tr1_transfert', 'Taxi ≈ 15–30 min : gare de La Mecque (Ar-Rusayfah) à ≈ 3,5 km du Haram ; navettes en gare', true),
    tf('Marge recommandée', 'tr1_marge', 'Être en gare 45–60 min avant ; portes d’embarquement fermées 10 min avant le départ', true),
  ].join(''))}
  ${trCard('train', 'La Mecque → Médine', 'Dimanche 15 novembre · train Haramain', st('book'), [
    tf('Départ', 'tr2_depart', 'Idéal ≈ 10:00, après le tawaf d’adieu'),
    tf('Arrivée', 'tr2_arrivee', '≈ 12:00–12:30 si départ 10:00'),
    tf('Train', 'tr2_train', 'N° · classe · voiture · sièges'),
    tf('Durée', 'tr2_duree', '≈ 2 h – 2 h 30 selon les arrêts'),
    tf('Gare', 'tr2_gare', 'Gare Haramain de La Mecque — quartier Ar-Rusayfah, ≈ 3,5 km du Haram', true),
    tf('Transfert hôtel', 'tr2_transfert', 'Taxi ≈ 15–25 min jusqu’à Masjid an-Nabawi (à vérifier) ; navettes en gare', true),
    tf('Marge recommandée', 'tr2_marge', 'Être en gare 45–60 min avant ; portes fermées 10 min avant le départ', true),
  ].join(''))}
  </div>
  <div class="grid2" style="margin-top:var(--g3)">
    ${trCard('plane-arrival', 'Arrivée à Médine', 'Mardi 10 novembre · aéroport Prince Mohammad bin Abdulaziz (MED)', st('book', 'Transfert à réserver'), [
      tf('Vol', 'av1_vol', 'N° de vol · atterrissage prévu 05:00', true),
      tf('Transfert', 'av1_transfert', 'Chauffeur ou taxi réservé : nom, téléphone', true),
      tf('Durée', 'av1_duree', '≈ 20–30 min jusqu’au Haram (à vérifier) ; immigration et bagages : 45 min à 1 h 30', true),
    ].join(''))}
    ${trCard('plane-departure', 'Départ de Médine', 'Lundi 16 novembre · décollage 06:30', st('imp'), [
      tf('Vol', 'av2_vol', 'N° de vol · terminal', true),
      tf('Taxi', 'av2_taxi', 'Réservé pour 02:45 : nom, téléphone', true),
      tf('Enregistrement', 'av2_enreg', 'Heure limite : voir la compagnie · arrivée prévue 03:15, soit ≈ 3 h 15 avant', true),
    ].join(''))}
  </div>
  <div class="card line" style="margin-top:var(--g3)">
    <p class="card-t">${ic('info-circle')}Bon à savoir — train Haramain ${st('ok')} ${vd()}</p>
    <ul class="bul st-list">
      <li>${sti('ok')}<span><b>Bagages, par personne :</b> 1 valise ≤ 25 kg et ≤ 65 × 55 × 35 cm (roues comprises) + 1 bagage à main. Même règle en Economy et en Business.</span></li>
      <li>${sti('ok')}<span>Billet électronique (QR code) + passeport. Vente close 20 min avant le départ ; portes d’embarquement fermées 10 min avant.</span></li>
      <li>${sti('ok')}<span>Salles de prière hommes / femmes dans toutes les gares ; voiture-café à bord. Fauteuils roulants et chariots à bagages en gare.</span></li>
      <li>${sti('verify')}<span>Pas de grille horaire fixe à l’année : horaires de novembre à vérifier sur <b>sar.hhr.sa</b> ou dans l’application officielle.</span></li>
    </ul>
  </div>
</section>`;

const todo = (name, label, small, badge = '') => ckItem(name, label, small, badge);
const before = `<section class="sheet" id="avant">
  <header class="sh"><p class="eyebrow">I · Préparer</p><h2 class="sh-t">Avant le départ</h2><p class="sh-sub">Ce qu’il reste à faire — six semaines devant nous.</p></header>
  <h3 class="h3 first">${sti('book')} À réserver</h3>
  <ul class="ck">
    ${todo('av_permis', 'Permis Omra dans Nusuk — pour nous trois', 'Obligatoire pour tous, gratuit, lié à une date et un créneau : viser ven. 13 vers 06:00 (ou jeu. 12 au soir si l’option est retenue).', ' ' + st('ok') + ' ' + vd())}
    ${todo('av_rawdah', 'Rawdah dans Nusuk — pour nous trois', 'Créneaux séparés hommes / femmes · un permis réservé par personne tous les 365 jours. ' + ref('rawdah', 'Voir Rawdah'))}
    ${todo('av_trains', 'Billets Haramain', 'Aller jeu. 12 vers 10:00 · retour dim. 15 vers 10:00 — sar.hhr.sa ou application officielle.')}
    ${todo('av_checkin', 'Early check-in confirmé par écrit', 'Médine le 10 dès 07:00 (sinon réserver la nuit du 9 au 10) · La Mecque le 12 vers 13:30 · Médine le 15 vers 13:00.')}
    ${todo('av_transferts', 'Transferts aéroport', 'Aéroport → hôtel le 10 vers 06:30 · hôtel → aéroport le 16 à 02:45.')}
    ${todo('av_ziyarat', 'Chauffeur pour les ziyârât', 'Mer. 11, 08:00 → 11:00 environ, via l’hôtel ou une application de VTC.')}
  </ul>
  <h3 class="h3">${sti('verify')} À vérifier</h3>
  <ul class="ck">
    ${todo('av_visas', 'Visas pour nous trois', 'Visa Omra : l’entrée doit avoir lieu dans les 30 jours suivant sa délivrance (règle en vigueur depuis nov. 2025) — le demander à partir de mi-octobre, pas avant. Le visa touristique permet aussi la Omra, avec le permis Nusuk.', ' ' + st('imp'))}
    ${todo('av_bagages', 'Franchises bagages : avion et train', 'Train : 1 valise ≤ 25 kg + 1 bagage à main par personne.')}
    ${todo('av_horaires', 'Horaires des trains de novembre', 'Réserver dès qu’ils sont publiés.')}
    ${todo('av_assurance', 'Assurance voyage', 'Santé et rapatriement ; ' + ref('essentiel', 'noter le n° d’assistance') + '.')}
    ${todo('av_mobilite', 'Besoins de mobilité de Papa et Maman', 'Fauteuils gratuits au Haram, voiturettes à réserver. ' + ref('etapes', 'Voir Étapes'))}
  </ul>
  <h3 class="h3">${sti('imp')} À préparer</h3>
  <ul class="ck">
    ${todo('av_apps', 'Installer les applications', 'Nusuk · train Haramain · Uber ou Careem · Qur’an · eSIM activée.')}
    ${todo('av_captures', 'Captures d’écran hors ligne', 'Billets, permis, réservations, passeports.')}
    ${todo('av_guide', 'Lire le guide officiel de l’ihram, en français', 'Ministère du Hajj et de la Omra — haj.gov.sa.')}
    ${todo('av_imprimer', 'Imprimer ce carnet (version A4)', 'Facultatif — utile si un téléphone n’a plus de batterie.')}
  </ul>
</section>`;

// ---------------------------------------------------------------- days
const days = [];

days.push(day({
  id: 'j1', n: 1, part: 'Médine', wd: 'Mardi', date: '10 novembre', hijri: '30 Joumada al-Oula 1448', city: 'med',
  cityHtml: cityLine.med,
  goal: 'Arriver, se reposer, puis saluer Masjid an-Nabawi — sans rien presser.',
  prayers: { rows: [{ city: 'med', day: 10 }] },
  events: [
    { t: '05:00', i: 'plane-arrival', h: 'Atterrissage à Médine', l: 'Aéroport MED', d: '—', n: 'Passeports, visas et adresse de l’hôtel à portée de main.' },
    { t: '05:13', i: 'mosque', k: 'pray', h: 'Fajr à l’aéroport', l: 'Salle de prière', d: '15 min', n: 'Lever du soleil à 06:34 : impossible d’atteindre Masjid an-Nabawi à temps — prier dès l’entrée du temps.' },
    { t: '05:30', i: 'e-passport', h: 'Immigration et bagages', l: 'Aéroport', d: '45 min – 1 h 30', n: 'Durée très variable : rien de fixe avant 07:30.' },
    { t: '06:45', i: 'car', h: 'Transfert vers l’hôtel', l: 'Aéroport → hôtel', d: '≈ 20–30 min', n: 'Transfert réservé à l’avance : le plus simple avec les bagages.', st: ['book'] },
    { t: '07:15', i: 'building', h: 'Hôtel · petit-déjeuner', l: 'Hôtel', d: '1 h', n: 'Chambre prête seulement si l’early check-in est confirmé ; sinon bagagerie et salon.' },
    { t: '08:30', i: 'bed', k: 'rest', h: 'Sommeil réparateur', l: 'Hôtel', d: '≈ 3 h 30', n: 'La vraie priorité du jour, surtout pour Papa et Maman.' },
    { t: '12:05', i: 'mosque', k: 'pray', h: 'Dhuhr', l: 'Hôtel ou mosquée', d: '20 min', n: 'À Masjid an-Nabawi seulement si tout le monde est reposé.' },
    { t: '12:45', i: 'tools-kitchen-2', h: 'Déjeuner léger, puis repos', l: 'Près de l’hôtel', d: '2 h' },
    { t: '15:14', i: 'mosque', k: 'pray', h: 'Asr — première prière à Masjid an-Nabawi', l: 'Masjid an-Nabawi', d: '20 min', n: 'Partir vers 14:45 pour trouver une place à l’intérieur.' },
    { t: '15:45', i: 'sparkles', k: 'key', h: 'Première découverte', l: 'Cour, Dôme vert', d: '45 min', n: 'Choisir ensemble un point de rendez-vous (n° de porte) et ' + ref('essentiel', 'le noter') + '. Pause à l’hôtel ensuite si besoin.' },
    { t: '17:37', i: 'mosque', k: 'pray', h: 'Maghrib, puis Isha à 19:07', l: 'Masjid an-Nabawi', d: '1 h 45', n: 'Entre les deux : Qur’an, dhikr, du’as.' },
    { t: '19:45', i: 'tools-kitchen-2', h: 'Dîner', l: 'Près du Haram', d: '1 h' },
    { t: '21:00', i: 'moon-stars', k: 'rest', h: 'Coucher', l: 'Hôtel', d: '—', n: 'Nuit complète : départ des ziyârât demain à 08:00.' },
  ],
  notes: [
    ['imp', '<b>Early check-in :</b> sans confirmation écrite, la chambre peut n’être prête qu’en début d’après-midi. Solution sûre : réserver aussi la nuit du 9 au 10.'],
    ['verify', '<b>Si la fatigue est forte :</b> prier Asr à l’hôtel et garder Masjid an-Nabawi pour Maghrib et Isha.'],
    ['ok', '<b>Journée volontairement légère</b> après le vol de nuit.'],
  ],
}));

days.push(day({
  id: 'j2', n: 2, part: 'Médine', wd: 'Mercredi', date: '11 novembre', hijri: '1 Joumada al-Akhira 1448', city: 'med',
  cityHtml: cityLine.med,
  goal: 'Les ziyârât le matin, au frais ; puis Masjid an-Nabawi, la Rawdah et du repos.',
  prayers: { rows: [{ city: 'med', day: 11 }] },
  events: [
    { t: '05:14', i: 'mosque', k: 'pray', h: 'Fajr à Masjid an-Nabawi', l: 'Masjid an-Nabawi', d: '45 min', n: 'Réveil 04:30, arrivée vers 04:50. Optionnel pour les hommes : Al-Baqi’ après la prière (horaires à vérifier sur place).' },
    { t: '06:45', i: 'coffee', h: 'Petit-déjeuner', l: 'Hôtel', d: '45 min' },
    { t: '08:00', i: 'car', k: 'key', h: 'Ziyârât en voiture privée', l: 'Chauffeur réservé', d: '≈ 3 h', n: 'Faire ses ablutions à l’hôtel avant de partir : la Sunna est de venir à Quba purifié depuis chez soi (Ibn Mâjah 1412). Pauses à volonté.', st: ['book'] },
    { t: '08:15', i: 'building-mosque', sub: true, h: 'Masjid Quba — 2 rak’a', l: 'Quba', d: '40 min', n: 'Première mosquée bâtie par le Prophète&nbsp;<span class="saw">ﷺ</span>, à son arrivée à Médine ; il s’y rendait chaque samedi (Bukhârî).' },
    { t: '09:15', i: 'building-mosque', sub: true, h: 'Masjid al-Qiblatayn', l: 'Nord-ouest', d: '25 min', n: 'La mosquée « aux deux qiblas ».' },
    { t: '09:55', i: 'mountain', sub: true, h: 'Uhud — cimetière des martyrs, mont des archers', l: 'Nord', d: '45 min', n: 'Saluer les martyrs de Uhud, dont Hamza.' },
    { t: '11:00', i: 'bed', k: 'rest', h: 'Retour et pause à l’hôtel', l: 'Hôtel', d: '45 min' },
    { t: '12:06', i: 'mosque', k: 'pray', h: 'Dhuhr', l: 'Masjid an-Nabawi', d: '30 min' },
    { t: '12:45', i: 'tools-kitchen-2', k: 'rest', h: 'Déjeuner, puis sieste', l: 'Hôtel', d: '≈ 2 h' },
    { t: '15:14', i: 'mosque', k: 'pray', h: 'Asr, puis Qur’an et dhikr', l: 'Masjid an-Nabawi', d: '—' },
    { t: '', ts: 'Selon<br>Nusuk', i: 'sparkles', k: 'key', h: 'Rawdah — à l’heure de nos permis', l: 'Masjid an-Nabawi', d: '≈ 10–15 min', n: 'Créneaux : à vérifier dans Nusuk. Hommes et femmes y vont séparément. ' + ref('rawdah', 'Voir Rawdah'), st: ['verify'] },
    { t: '17:36', i: 'mosque', k: 'pray', h: 'Maghrib, puis Isha à 19:06', l: 'Masjid an-Nabawi', d: '1 h 45' },
    { t: '19:45', i: 'tools-kitchen-2', h: 'Dîner', l: 'Près du Haram', d: '1 h' },
    { t: '20:45', i: 'luggage', h: 'Préparer l’ihram et les bagages', l: 'Hôtel', d: '45 min', n: 'Vêtements d’ihram, produits sans parfum, sac du train. Couper ongles et cheveux ce soir. ' + ref('ihram', 'Voir Ihram') },
    { t: '21:30', i: 'moon-stars', k: 'rest', h: 'Coucher', l: 'Hôtel', d: '—', n: 'Réveil 04:30 demain.' },
  ],
  notes: [
    ['book', '<b>Chauffeur pour 08:00</b> (≈ 3 h) : via l’hôtel ou une application de VTC.'],
    ['verify', '<b>Rawdah :</b> si un créneau tombe pendant les ziyârât ou la sieste, on décale le reste — la Rawdah passe avant.'],
    ['imp', '<b>Ce soir :</b> couper ongles et cheveux — ce ne sera plus permis une fois en ihram.'],
  ],
}));

const rawdahPerson = (who, key) => `<div class="person">
  <p class="who">${ic('users')}${who}</p>
  <label class="fi p-date"><span class="f-h">Date</span>${fbox('rw_' + key + '_date', 'sm')}</label>
  <label class="fi p-slot"><span class="f-h">Créneau — à vérifier dans Nusuk</span>${fbox('rw_' + key + '_heure', 'sm')}</label>
  <label class="fi p-acc"><span class="f-h">Accès / porte</span>${fbox('rw_' + key + '_acces', 'sm')}</label>
  <span class="cbw">${cb('rw_' + key + '_ok')}Permis OK</span>
</div>`;

const rawdah = `<section class="sheet" id="rawdah">
  <header class="sh"><p class="eyebrow">II · Jour par jour · Médine</p><h2 class="sh-t">Rawdah<span class="ar">الروضة الشريفة</span></h2>
    <p class="sh-sub">Ar-Rawdah ash-Sharifah, dans Masjid an-Nabawi · ${st('book', 'À réserver dans Nusuk')} ${st('verify', 'Créneaux à vérifier dans Nusuk')}</p></header>
  <div class="arb" style="padding-top:0"><span class="tr">« Entre ma maison et mon minbar se trouve un jardin parmi les jardins du Paradis. »</span><span class="fr">Hadith rapporté par al-Bukhârî et Muslim</span></div>
  <h3 class="h3">Nos créneaux</h3>
  <div class="people">${rawdahPerson('Moi', 'moi')}${rawdahPerson('Papa', 'papa')}${rawdahPerson('Maman', 'maman')}</div>
  <p class="f-h rw-note">Créneaux : <b>À vérifier dans Nusuk</b> — aucun horaire officiel n’est encore publié pour novembre 2026.</p>
  <div class="grid2" style="margin-top:var(--g4)">
    <div class="card"><p class="card-t">${ic('calendar')}Repère, non garanti ${st('verify')}</p>
      <p>Dernières plages officielles publiées (mai 2026) :</p>
      <ul class="bul" style="margin-top:var(--g2)">
        <li><span><b>Hommes :</b> 02:00 → Fajr, puis 11:20 → Isha.</span></li>
        <li><span><b>Femmes :</b> après Fajr → 11:00, puis après Isha → 02:00.</span></li>
        <li><span>Le vendredi, horaires différents.</span></li>
      </ul>
      <p style="margin-top:var(--g2)">Papa et moi pouvons donc y aller ensemble ; Maman sur un créneau femmes — idéalement tôt le matin ou après Isha.</p></div>
    <div class="card"><p class="card-t">${ic('door-enter')}Accès ${st('verify')}</p>
      <p>D’après la presse saoudienne (déc. 2025) : par les cours sud, face à la porte 37. L’accès exact figure sur le permis et est indiqué par les agents.</p>
      <p>Après la visite, chacun rejoint ${ref('essentiel', 'le point de rendez-vous')}.</p></div>
  </div>
  <h3 class="h3">Rappels importants</h3>
  <ul class="bul st-list">
    <li>${sti('imp')}<span><b>Marge de sécurité :</b> être dans l’enceinte du Haram <b>30 min avant</b> le créneau et à l’accès <b>15 min avant</b> (consignes publiées en 2024) ; QR code du permis prêt, capture d’écran hors ligne, téléphone chargé.</span></li>
    <li>${sti('ok')}<span><b>Un permis par personne</b>, gratuit, dans Nusuk. ${vd()}</span></li>
    <li>${sti('verify')}<span><b>Pour Papa et Maman :</b> réserver depuis leur propre compte ou comme accompagnants, selon ce que l’application permet.</span></li>
    <li>${sti('imp')}<span><b>Un permis réservé tous les 365 jours par personne</b> (règle officielle publiée en déc. 2025) : si l’un de nous y est allé depuis moins d’un an, la réservation peut être refusée.</span></li>
    <li>${sti('imp')}<span><b>Empêchement :</b> annuler le permis à l’avance plutôt que de ne pas venir.</span></li>
    <li>${sti('ok')}<span><b>Sans créneau :</b> Nusuk propose aussi une file « immédiate » quand on est près de la mosquée, selon la place, et une liste d’attente. ${vd()}</span></li>
    <li>${sti('verify')}<span><b>Sur place :</b> visite courte (≈ 10–15 min) — préparer ses du’as à l’avance. Fauteuil roulant manuel accepté pour les personnes âgées.</span></li>
    <li>${sti('verify')}<span><b>Plan B :</b> le 10 au soir, ou le 15 (après-midi pour les hommes, après Isha pour Maman).</span></li>
  </ul>
</section>`;

days.push(day({
  id: 'j3', n: 3, part: 'Médine → La Mecque', wd: 'Jeudi', date: '12 novembre', hijri: '2 Joumada al-Akhira 1448', city: 'mak',
  cityHtml: cityLine.medToMak,
  goal: 'Entrer en ihram, voyager en douceur, arriver reposés à La Mecque.',
  prayers: { rows: [{ city: 'med', day: 12, on: [0, 1] }, { city: 'mak', day: 12, on: [2, 3, 4, 5] }], note: 'Fajr à Médine ; les autres prières à La Mecque.' },
  events: [
    { t: '05:15', i: 'mosque', k: 'pray', city: 'med', h: 'Fajr à Masjid an-Nabawi', l: 'Masjid an-Nabawi', d: '45 min', n: 'Réveil 04:30. Dernière prière ici avant La Mecque — retour dimanche.' },
    { t: '06:15', i: 'coffee', h: 'Petit-déjeuner', l: 'Hôtel', d: '45 min' },
    { t: '07:15', i: 'droplet', k: 'key', h: 'Préparation de l’ihram', l: 'Hôtel', d: '1 h', n: 'Ghusl et vêtements d’ihram ; l’intention se fera dans le train. ' + ref('ihram', 'Voir Ihram') },
    { t: '08:30', i: 'luggage', h: 'Check-out, puis taxi vers la gare', l: 'Hôtel → gare Haramain', d: '≈ 15–25 min', n: 'Gare dans la Knowledge Economic City, sur King Abdulaziz Road.' },
    { t: '10:00', i: 'train', h: 'Train Médine → La Mecque', l: 'Train Haramain', d: '≈ 2 h – 2 h 30', n: 'En gare dès 09:15 ; portes fermées 10 min avant le départ. Horaire exact : ' + ref('transports', 'Transports') + '.', st: ['book'] },
    { t: '10:10', i: 'sparkles', k: 'key', h: 'Intention et talbiya, avant le miqat', l: 'À bord', d: '—', n: '« Labbayk Allâhumma ’umratan », dès le départ ou à l’annonce du miqat. Moment exact : à confirmer selon les autorités religieuses.' },
    { t: '12:15', i: 'mosque', k: 'pray', city: 'mak', h: 'Arrivée à La Mecque · Dhuhr', l: 'Gare de La Mecque', d: '30 min', n: 'Dhuhr (12:05) en gare. Prières du voyageur : à confirmer selon les autorités religieuses.' },
    { t: '12:45', i: 'car', h: 'Taxi vers l’hôtel, check-in', l: 'Gare → hôtel', d: '≈ 15–30 min', n: 'Gare à ≈ 3,5 km du Haram. Early check-in demandé.', st: ['book'] },
    { t: '13:45', i: 'bed', k: 'rest', h: 'Déjeuner léger, puis sieste', l: 'Hôtel', d: '≈ 3 h', n: 'Asr (15:16) à l’hôtel. On reste en ihram : c’est permis, en respectant les interdits.' },
    { t: '17:10', i: 'kaaba', k: 'key', h: 'Première vue de la Kaaba · Maghrib et Isha', l: 'Masjid al-Haram', d: '2 h 30', n: 'Maghrib 17:40, Isha 19:10. Un moment de du’a ; repérer le chemin de demain.' },
    { t: '19:45', i: 'tools-kitchen-2', h: 'Dîner', l: 'Près de l’hôtel', d: '1 h' },
    { t: '20:45', i: 'moon-stars', k: 'rest', h: 'Coucher tôt', l: 'Hôtel', d: '—', n: 'Réveil 04:15 pour la Omra.' },
  ],
  after: `<div class="card tint-gold opt-box keep"><p class="card-t">${ic('moon-stars')}Option — la Omra dès ce soir ${st('verify', 'À décider après la sieste')}</p>
    <p>Si toute la famille est vraiment reposée : Omra après Isha (≈ 19:45 → 23:00), et moins de temps en ihram. Sinon, plan prévu : <b>vendredi à l’aube</b>. Le créneau du permis Omra doit suivre ce choix.</p></div>`,
  notes: [
    ['imp', '<b>En ihram jusqu’à la Omra :</b> ni parfum, ni coupe ; hommes tête découverte, même en dormant.'],
    ['book', '<b>Billets Haramain</b> (QR + passeport) et <b>early check-in</b>.'],
    ['ok', '<b>Train :</b> 1 valise ≤ 25 kg + 1 bagage à main chacun.'],
  ],
}));

const ihram = `<section class="sheet" id="ihram">
  <header class="sh"><p class="eyebrow">II · Jour par jour · Jeudi 12</p><h2 class="sh-t">${sti('imp')} Ihram & miqat<span class="ar">الإحرام والميقات</span></h2>
    <p class="sh-sub">Nous quittons Médine avec l’intention de faire la Omra : l’ihram doit être pris au plus tard au miqat.</p></header>
  <div class="grid2">
    <div class="card tint-med"><p class="card-t">${ic('map-pin')}Notre miqat ${st('ok')}</p>
      <p><b>Dhul-Hulayfah</b> (Abyar ’Ali) : le miqat fixé par le Prophète&nbsp;<span class="saw">ﷺ</span> pour les gens de Médine et ceux qui passent par Médine (Bukhârî 1524).</p>
      <p>La mosquée du miqat est à ≈ 10–14 km au sud-ouest de Masjid an-Nabawi. Le train passe à sa hauteur peu après le départ de la gare.</p></div>
    <div class="card"><p class="card-t">${ic('clock-hour-4')}Quand, où ?</p>
      <ul class="mini-tl">
        <li><span class="d">Mer. 11 · soir</span><span class="t">Ongles, moustache, poils : les couper avant.</span></li>
        <li><span class="d">Jeu. 12 · 07:15</span><span class="t">À l’hôtel : ghusl, vêtements d’ihram.</span></li>
        <li><span class="d">Jeu. 12 · ≈ 10:10</span><span class="t">Dans le train : intention et talbiya, avant le miqat.</span></li>
        <li><span class="d">Ven. 13 · ≈ 09:00</span><span class="t">Halq / taqsir : fin de l’ihram.</span></li>
      </ul></div>
  </div>

  <h3 class="h3">Se préparer — jeudi matin, à l’hôtel</h3>
  <ul class="bul st-list">
    <li>${sti('ok')}<span><b>Ghusl</b> (grande ablution), comme le fit le Prophète&nbsp;<span class="saw">ﷺ</span> avant l’ihram.</span></li>
    <li>${sti('ok')}<span><b>Hommes :</b> deux pièces de tissu non cousues, de préférence blanches (izâr et ridâ’), et des sandales. Parfum possible sur le corps avant l’intention, <b>jamais sur les vêtements</b>.</span></li>
    <li>${sti('ok')}<span><b>Maman :</b> ses vêtements habituels, amples et pudiques, de n’importe quelle couleur — sans niqab ni gants.</span></li>
    <li>${sti('verify')}<span><b>Prière :</b> entrer en ihram après une prière est recommandé par la majorité ; l’existence d’une prière propre à l’ihram fait débat. À confirmer selon les autorités religieuses.</span></li>
    <li>${sti('imp')}<span>Mettre les vêtements n’est pas encore l’ihram : <b>l’ihram commence avec l’intention</b>.</span></li>
  </ul>

  <h3 class="h3">Formuler l’intention — dans le train</h3>
  <ul class="bul st-list">
    <li>${sti('ok')}<span>Le compte officiel du train Haramain indique que le train passe le miqat, qu’une <b>annonce est faite à bord</b> et que l’on peut entrer en ihram dans le train.</span></li>
    <li>${sti('ok')}<span>Le Grand Mufti d’Arabie saoudite (2017) : mettre les vêtements à Médine, puis formuler l’intention et commencer la talbiya <b>peu après le départ</b>, vu la proximité du miqat et la vitesse du train.</span></li>
    <li>${sti('imp')}<span>Ne pas dépasser le miqat sans ihram : mieux vaut un peu avant que trop tard.</span></li>
    <li>${sti('verify')}<span><b>Option :</b> passer par la mosquée Dhul-Hulayfah en taxi avant la gare — détour ≈ 40–50 min, elle n’est pas sur le chemin.</span></li>
    <li>${sti('verify')}<span>Moment exact de l’annonce (≈ 7 à 15 min après le départ selon les témoignages) : <b>à confirmer selon les autorités religieuses / Nusuk.</b></span></li>
  </ul>
  <div class="card line arb">
    <span class="ar">لَبَّيْكَ اللَّهُمَّ عُمْرَةً</span>
    <span class="tr">Labbayk Allâhumma ’umratan</span>
    <span class="fr">« Me voici, ô Allah, pour une Omra » — puis la talbiya :</span>
    <span class="ar" style="margin-top:var(--g2)">لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ</span>
    <span class="tr">Labbayk Allâhumma labbayk, labbayka lâ sharîka laka labbayk, inna l-hamda wa n-ni’mata laka wa l-mulk, lâ sharîka lak.</span>
    <span class="fr">« Me voici, ô Allah, me voici. Me voici, Tu n’as pas d’associé, me voici. La louange, le bienfait et la royauté T’appartiennent. Tu n’as pas d’associé. » (Bukhârî 1549, Muslim 1184) — à répéter jusqu’au début du tawaf, selon la majorité.</span>
  </div>
  <ul class="bul st-list" style="margin-top:var(--g3)">
    <li>${sti('verify')}<span><b>Si l’on craint d’être empêché</b> (santé…), certains savants recommandent d’ajouter : « Allâhumma mahillî haythu habastanî » (hadith de Dubâ’a, Bukhârî et Muslim). Portée selon les écoles : à confirmer selon les autorités religieuses.</span></li>
  </ul>

  <h3 class="h3">Pendant l’ihram — à éviter</h3>
  <div class="grid2">
    <div class="card"><p class="card-t">${ic('users')}Pour nous trois</p>
      <ul class="bul">
        <li><span>Couper ou arracher cheveux et poils ; couper les ongles.</span></li>
        <li><span>Tout parfum — préférer savon, shampoing, crème et déodorant <b>sans parfum</b>.</span></li>
        <li><span>Relations intimes et préliminaires ; contrat de mariage.</span></li>
        <li><span>Chasser ; se disputer, dire des paroles blessantes.</span></li>
      </ul></div>
    <div class="card"><p class="card-t">${ic('shirt')}Hommes · Maman</p>
      <ul class="bul">
        <li><span><b>Hommes :</b> vêtements cousus ou ajustés au corps (chemise, pantalon, sous-vêtements), chaussures couvrant les chevilles, et couvrir la tête (casquette, capuche…).</span></li>
        <li><span><b>Maman :</b> niqab et gants.</span></li>
        <li><span><b>Permis :</b> se doucher sans parfum, changer de vêtements d’ihram, ceinture, montre.</span></li>
      </ul></div>
  </div>
  <div class="callout"><p>En cas d’oubli ou d’erreur, pas de panique : demander conseil. Des règles de compensation existent — à confirmer selon les autorités religieuses / Nusuk.</p></div>
</section>`;

days.push(day({
  id: 'j4', n: 4, part: 'La Mecque', wd: 'Vendredi', date: '13 novembre', hijri: '3 Joumada al-Akhira 1448', city: 'mak',
  cityHtml: cityLine.mak,
  goal: 'Accomplir notre Omra à l’aube, calmement, puis se reposer.',
  prayers: { rows: [{ city: 'mak', day: 13 }], friday: true, note: 'Vendredi : la Jumu’a remplace Dhuhr.' },
  events: [
    { t: '04:15', i: 'alarm', h: 'Réveil, ablutions', l: 'Hôtel', d: '25 min', n: 'Eau, petite collation, sandales, sac à chaussures, permis Omra prêt.' },
    { t: '05:11', i: 'mosque', k: 'pray', h: 'Fajr à Masjid al-Haram', l: 'Masjid al-Haram', d: '40 min', n: 'Partir vers 04:40 : le vendredi, le Haram se remplit tôt.' },
    { t: '06:00', i: 'kaaba', k: 'key', h: 'Tawaf — 7 tours', l: 'Mataf', d: '45 min – 1 h 30', n: 'En état d’ablutions ; départ à l’angle de la Pierre noire. ' + ref('etapes', 'Voir Étapes') },
    { t: '07:15', i: 'droplet', k: 'key', h: '2 rak’a, Zamzam, pause', l: 'Derrière le Maqam Ibrahim si possible', d: '20 min' },
    { t: '07:40', i: 'walk', k: 'key', h: 'Sa’i — 7 trajets', l: 'Safa → Marwah', d: '45 min – 1 h 15', n: '≈ 2,8 km au total. Départ à Safa, fin à Marwah.' },
    { t: '08:55', i: 'scissors', k: 'key', h: 'Halq / taqsir — la Omra est accomplie', l: 'Coiffeur · hôtel', d: '20–30 min', n: 'Hommes chez le coiffeur ; Maman à l’hôtel, avec de petits ciseaux. Fin de l’ihram. Alhamdulillah.' },
    { t: '09:30', i: 'building', h: 'Retour à l’hôtel, douche, brunch', l: 'Hôtel', d: '1 h 15' },
    { t: '10:45', i: 'bed', k: 'rest', h: 'Repos', l: 'Hôtel', d: '30 min' },
    { t: '12:05', i: 'mosque', k: 'pray', h: 'Jumu’a — prière du vendredi', l: 'Masjid al-Haram', d: '1 h', n: 'Partir vers 11:15 : affluence très forte. Si la fatigue l’emporte, ne pas forcer — cas du voyageur : à confirmer selon les autorités religieuses.' },
    { t: '13:15', i: 'tools-kitchen-2', k: 'rest', h: 'Déjeuner léger, puis longue sieste', l: 'Hôtel', d: '≈ 3 h', n: 'Asr (15:16) à l’hôtel ou au Haram.' },
    { t: '17:39', i: 'mosque', k: 'pray', h: 'Maghrib, puis Isha à 19:09', l: 'Masjid al-Haram', d: '1 h 45', n: 'Rester si l’énergie est là : Qur’an, tawaf volontaire.' },
    { t: '19:45', i: 'tools-kitchen-2', h: 'Dîner', l: 'Près de l’hôtel', d: '1 h' },
    { t: '21:00', i: 'moon-stars', k: 'rest', h: 'Coucher', l: 'Hôtel', d: '—' },
  ],
  notes: [
    ['imp', '<b>Aucune pression :</b> si la foule est trop dense, faire une pause, boire, reprendre. Fauteuils et voiturettes possibles pour Papa et Maman — ' + ref('etapes', 'voir Étapes') + '.'],
    ['book', '<b>Permis Omra</b> réservé dans Nusuk pour ce matin (≈ 06:00), pour nous trois.'],
    ['verify', '<b>Niveau de la Kaaba (mataf) :</b> il peut être réservé aux personnes en Omra — suivre les indications des agents.'],
  ],
}));

const step = (n, title, ar, dur, items, done = false) => `<div class="step${done ? ' done' : ''}">
  <div><span class="step-n">${n}</span></div>
  <div><div class="step-hd"><span class="step-t">${title}${ar ? `<span class="ar">${ar}</span>` : ''}</span>${dur ? `<span class="step-dur">${ic('clock-hour-4')}${dur}</span>` : ''}</div>
  <div class="step-b"><ul class="bul">${items.map((i) => `<li><span>${i}</span></li>`).join('')}</ul></div></div>
</div>`;

const etapes = `<section class="sheet" id="etapes">
  <header class="sh"><p class="eyebrow">II · Jour par jour · Vendredi 13</p><h2 class="sh-t">Étapes de la Omra<span class="ar">مناسك العمرة</span></h2>
    <p class="sh-sub">Compter 2 h 30 à 4 h en tout, pauses comprises. Les durées sont des estimations.</p></header>
  <div class="steps">
    ${step(1, 'Ihram', 'الإحرام', 'déjà fait', ['Pris jeudi, avant le miqat : les interdits restent valables jusqu’à l’étape 5.'], true)}
    ${step(2, 'Intention', 'النية', 'déjà faite', ['« Labbayk Allâhumma ’umratan », puis la talbiya — que l’on répète jusqu’au début du tawaf (selon la majorité).'], true)}
    ${step(3, 'Tawaf', 'الطواف', '45 min – 1 h 30', [
      '<b>7 tours</b>, la Kaaba à gauche, de l’angle de la Pierre noire à l’angle de la Pierre noire (un repère lumineux vert marque le départ — à vérifier sur place).',
      'À chaque passage : saluer la Pierre de la main droite, de loin, en disant « Bismillâh, Allâhu akbar ». Ne jamais bousculer.',
      '<b>Hommes :</b> épaule droite découverte pendant les 7 tours ; pas rapide sur les 3 premiers si la foule le permet.',
      'Entre le coin yéménite et la Pierre noire : « Rabbanâ âtinâ fi d-dunyâ hasanatan wa fi l-âkhirati hasanatan wa qinâ ’adhâba n-nâr » (Abû Dâwûd). Sinon, du’as personnelles, dans sa langue.',
      'Être en état d’ablutions (condition selon la majorité).',
      'Ensuite : <b>2 rak’a</b> derrière le Maqam Ibrahim si possible — sinon ailleurs dans la mosquée —, puis boire de l’eau de Zamzam.',
    ])}
    ${step(4, 'Sa’i', 'السعي', '45 min – 1 h 15', [
      'Commencer à <b>Safa</b> : réciter « Inna s-Safâ wa l-Marwata min sha’â’iri llâh » (Coran 2:158), puis « Abda’u bimâ bada’a llâhu bih » ; face à la Kaaba, invoquer.',
      '<b>7 trajets :</b> Safa → Marwah compte pour un ; le 7e se termine à <b>Marwah</b> (≈ 2,8 km au total).',
      '<b>Hommes :</b> presser le pas entre les lumières vertes.',
      'Les ablutions sont recommandées, pas obligatoires.',
    ])}
    ${step(5, 'Halq / taqsir', 'الحلق / التقصير', '20–30 min', [
      '<b>Hommes :</b> raser la tête (préférable) ou raccourcir les cheveux sur toute la tête.',
      '<b>Maman :</b> couper la longueur du bout d’un doigt à l’extrémité des cheveux, à l’abri des regards.',
      'La Omra est accomplie : <b>fin de l’ihram</b>, tous les interdits sont levés.',
    ])}
  </div>
  <div class="grid2" style="margin-top:var(--g5)">
    <div class="card tint-med"><p class="card-t">${ic('wheelchair')}Pour Papa et Maman ${st('ok')}</p>
      <ul class="bul">
        <li><span><b>Fauteuils manuels gratuits, 24 h/24 :</b> cour est (Bab as-Salam, porte 19) et cour ouest (pont d’Ash-Shubaykah, porte 64).</span></li>
        <li><span><b>Voiturettes électriques :</b> plateforme officielle « Tanaqol » (carts.alharamain.gov.sa), réservation en ligne conseillée après 65 ans ; tarifs à vérifier.</span></li>
      </ul><p class="vdate" style="margin-top:var(--g2)">Vérifié le 29/09/2026 · Agence de presse saoudienne</p></div>
    <div class="card"><p class="card-t">${ic('map-pin')}Si l’on se perd</p>
      <ul class="bul">
        <li><span>Rejoindre ${ref('essentiel', 'notre point de rendez-vous')} et y attendre.</span></li>
        <li><span>Téléphones chargés, batterie externe ; Maman garde l’adresse de l’hôtel sur elle.</span></li>
        <li><span>Eau de Zamzam à disposition partout dans la mosquée : boire souvent.</span></li>
      </ul></div>
  </div>
</section>`;

const catCk = (icon, title, items) => `<div class="cat"><p class="cat-t">${ic(icon)}${title}</p><ul class="ck">${items.map(([n, l, s]) => ckItem(n, l, s || '')).join('')}</ul></div>`;
const counter = (label, name, cells, icon) => `<div class="card line keep" style="margin-top:var(--g3)"><p class="card-t">${ic(icon)}${label}</p>
  <div class="counter"><div class="row">${cells.map((c, i) => `<div class="cell">${cb(name + '_' + (i + 1), 'round')}<span>${c}</span></div>`).join('')}</div></div></div>`;

const guide = `<section class="sheet" id="guide">
  <header class="sh"><p class="eyebrow">II · Jour par jour · Vendredi 13</p><h2 class="sh-t">${ic('kaaba')} Guide Omra</h2>
    <p class="sh-sub">À cocher au fil de la journée — directement sur l’iPhone.</p></header>
  <div class="grid2">
    ${catCk('droplet', 'Avant l’ihram', [['g_douche', 'Douche / préparation'], ['g_vetements', 'Vêtements d’ihram'], ['g_intention', 'Intention'], ['g_miqat', 'Vérification du miqat', 'Dans le train, au plus tard à l’annonce du miqat']])}
    ${catCk('kaaba', 'Tawaf', [['g_7tours', '7 tours'], ['g_invocations', 'Prières / invocations personnelles'], ['g_2rakaa', '2 rak’a, puis Zamzam']])}
    ${catCk('walk', 'Sa’i', [['g_safa', 'Safa → Marwah'], ['g_7trajets', '7 trajets']])}
    ${catCk('scissors', 'Fin', [['g_halq', 'Halq / taqsir'], ['g_fin', 'Fin de l’ihram']])}
  </div>
  ${counter('Compteur — tawaf', 'cpt_tawaf', ['1', '2', '3', '4', '5', '6', '7'], 'kaaba')}
  ${counter('Compteur — sa’i', 'cpt_sai', ['1<br>S→M', '2<br>M→S', '3<br>S→M', '4<br>M→S', '5<br>S→M', '6<br>M→S', '7<br>S→M'], 'walk')}
  <div class="callout">${ic('star8')}<p>Ne pas se mettre de pression : rester calme, suivre les indications officielles et demander conseil aux autorités religieuses si nécessaire.</p></div>
</section>`;

days.push(day({
  id: 'j5', n: 5, part: 'La Mecque', wd: 'Samedi', date: '14 novembre', hijri: '4 Joumada al-Akhira 1448', city: 'mak',
  cityHtml: cityLine.mak,
  goal: 'Une journée lente : prière, Qur’an, du’as — et beaucoup de repos.',
  prayers: { rows: [{ city: 'mak', day: 14 }] },
  events: [
    { t: '05:12', i: 'mosque', k: 'pray', h: 'Fajr à Masjid al-Haram', l: 'Masjid al-Haram', d: '1 h 30', n: 'Partir vers 04:40. Qur’an et dhikr jusqu’au lever du soleil (06:31).' },
    { t: '06:45', i: 'coffee', h: 'Petit-déjeuner', l: 'Hôtel', d: '45 min' },
    { t: '07:30', i: 'bed', k: 'rest', h: 'Sommeil', l: 'Hôtel', d: '≈ 2 h 30', n: 'Récupérer de la Omra.' },
    { t: '10:15', i: 'kaaba', opt: true, h: 'Tawaf volontaire', l: 'Masjid al-Haram', d: '≈ 1 h', n: 'Sans ihram, seulement si l’énergie est là. Selon l’affluence, les étages peuvent être imposés (plus longs).' },
    { t: '12:05', i: 'mosque', k: 'pray', h: 'Dhuhr', l: 'Masjid al-Haram', d: '30 min' },
    { t: '12:45', i: 'tools-kitchen-2', k: 'rest', h: 'Déjeuner, puis sieste', l: 'Hôtel', d: '≈ 2 h' },
    { t: '15:16', i: 'mosque', k: 'pray', h: 'Asr', l: 'Masjid al-Haram', d: '20 min' },
    { t: '15:45', i: 'hands', k: 'key', h: 'Qur’an, dhikr, du’as', l: 'Masjid al-Haram', d: '≈ 1 h 30', n: 'Le moment de nos listes de du’as. ' + ref('duas', 'Voir Nos du’as') },
    { t: '17:39', i: 'mosque', k: 'pray', h: 'Maghrib, puis Isha à 19:09', l: 'Masjid al-Haram', d: '1 h 45' },
    { t: '19:45', i: 'tools-kitchen-2', h: 'Dîner', l: 'Près de l’hôtel', d: '1 h' },
    { t: '20:45', i: 'luggage', h: 'Bagages pour demain', l: 'Hôtel', d: '30 min', n: 'Tout prêt ce soir : check-out tôt demain matin.' },
    { t: '21:30', i: 'moon-stars', k: 'rest', h: 'Coucher', l: 'Hôtel', d: '—', n: 'Réveil 04:30.' },
  ],
  notes: [
    ['ok', '<b>Aucune activité touristique :</b> c’est voulu. Une journée pour le cœur et pour le corps.'],
    ['book', '<b>Taxi pour la gare</b> demain à 08:30 : le réserver ou le demander à l’hôtel ce soir.'],
    ['imp', '<b>Boire souvent</b> de l’eau de Zamzam, surtout Papa et Maman : la fatigue de la Omra se fait sentir aujourd’hui.'],
  ],
}));

days.push(day({
  id: 'j6', n: 6, part: 'La Mecque → Médine', wd: 'Dimanche', date: '15 novembre', hijri: '5 Joumada al-Akhira 1448', city: 'med',
  cityHtml: cityLine.makToMed,
  goal: 'Faire nos adieux à La Mecque, puis retrouver Médine pour une dernière soirée.',
  prayers: { rows: [{ city: 'mak', day: 15, on: [0, 1] }, { city: 'med', day: 15, on: [2, 3, 4, 5] }], note: 'Fajr à La Mecque ; les autres prières à Médine.' },
  events: [
    { t: '05:12', i: 'mosque', k: 'pray', city: 'mak', h: 'Fajr à Masjid al-Haram', l: 'Masjid al-Haram', d: '40 min', n: 'Réveil 04:30.' },
    { t: '06:00', i: 'coffee', h: 'Petit-déjeuner, check-out', l: 'Hôtel', d: '1 h', n: 'Bagages laissés à la bagagerie de l’hôtel.' },
    { t: '07:15', i: 'kaaba', k: 'key', h: 'Tawaf d’adieu (al-wadâ’)', l: 'Masjid al-Haram', d: '45 min – 1 h', n: 'Obligatoire ou recommandé après une Omra selon les avis : le faire juste avant de quitter La Mecque convient à tous les avis.', st: [['verify', 'Statut à confirmer']] },
    { t: '08:30', i: 'car', h: 'Taxi vers la gare Haramain', l: 'Hôtel → Ar-Rusayfah', d: '≈ 15–30 min', st: ['book'] },
    { t: '10:00', i: 'train', h: 'Train La Mecque → Médine', l: 'Train Haramain', d: '≈ 2 h – 2 h 30', n: 'Être en gare vers 09:00 ; portes fermées 10 min avant le départ.', st: ['book'] },
    { t: '12:15', i: 'mosque', k: 'pray', city: 'med', h: 'Arrivée à Médine · Dhuhr', l: 'Gare de Médine', d: '30 min', n: 'Dhuhr 12:06 dans les salles de prière de la gare.' },
    { t: '12:45', i: 'car', h: 'Taxi vers l’hôtel, check-in', l: 'Gare → hôtel', d: '≈ 15–25 min', n: 'Early check-in demandé. Ne défaire que le strict nécessaire.', st: ['book'] },
    { t: '13:30', i: 'bed', k: 'rest', h: 'Déjeuner, puis sieste', l: 'Hôtel', d: '≈ 1 h 30' },
    { t: '15:13', i: 'mosque', k: 'pray', city: 'med', h: 'Asr — dernière après-midi', l: 'Masjid an-Nabawi', d: '2 h', n: 'Salam au Prophète&nbsp;<span class="saw">ﷺ</span>, Qur’an, du’as — prendre son temps.' },
    { t: '17:35', i: 'mosque', k: 'pray key', city: 'med', h: 'Maghrib, puis Isha à 19:05', l: 'Masjid an-Nabawi', d: '1 h 45', n: 'Nos dernières prières à Masjid an-Nabawi.' },
    { t: '19:45', i: 'tools-kitchen-2', h: 'Dernier dîner', l: 'Près du Haram', d: '1 h' },
    { t: '20:45', i: 'luggage', k: 'key', h: 'Préparer le départ', l: 'Hôtel', d: '30 min', n: 'Régler la note ce soir · taxi de 02:45 confirmé · passeports et tenues prêts.', st: ['imp'] },
    { t: '21:30', i: 'moon-stars', k: 'rest', h: 'Coucher', l: 'Hôtel', d: '—', n: 'Réveil 02:00.' },
  ],
  notes: [
    ['imp', '<b>Nuit courte :</b> coucher 21:30, réveil 02:00 — tout doit être prêt avant le dîner.'],
    ['verify', '<b>Petit-déjeuner à emporter :</b> le demander à l’hôtel pour 02:30, si possible.'],
    ['verify', '<b>Plan B Rawdah</b> possible cet après-midi (hommes) ou après Isha (Maman), selon Nusuk.'],
  ],
}));

days.push(day({
  id: 'j7', n: 7, part: 'Retour', wd: 'Lundi', date: '16 novembre', hijri: '6 Joumada al-Akhira 1448', city: 'med',
  cityHtml: cityLine.home,
  goal: 'Partir sans stress, avec une marge généreuse.',
  prayers: { rows: [{ city: 'med', day: 16, on: [0, 1] }], flight: true, note: 'Après le décollage : horaires du lieu où l’on se trouve.' },
  events: [
    { t: '02:00', i: 'alarm', h: 'Réveil', l: 'Hôtel', d: '30 min', n: 'Ablutions ; dernier tour de la chambre : prises, coffre, salle de bain.' },
    { t: '02:45', i: 'car', k: 'key', h: 'Départ de l’hôtel', l: 'Taxi réservé', d: '≈ 20–30 min', n: 'Note réglée la veille ; clés rendues.', st: ['imp'] },
    { t: '03:15', i: 'plane-departure', h: 'Arrivée à l’aéroport', l: 'Aéroport MED', d: '—', n: '≈ 3 h 15 avant le vol : la marge généreuse voulue.' },
    { t: '03:30', i: 'luggage', h: 'Enregistrement, dépôt des bagages', l: 'Comptoirs de la compagnie', d: '30–45 min', n: 'Heure limite d’enregistrement : voir la compagnie.', st: ['verify'] },
    { t: '04:15', i: 'e-passport', h: 'Contrôle des passeports et sûreté', l: 'Aéroport', d: '30–45 min' },
    { t: '05:17', i: 'mosque', k: 'pray', h: 'Fajr à l’aéroport', l: 'Salle de prière', d: '20 min', n: 'Lever du soleil à 06:38.' },
    { t: '05:50', i: 'ticket', h: 'Embarquement', l: 'Porte : voir la carte', d: '—', n: 'Heure exacte sur la carte d’embarquement.', st: ['verify'] },
    { t: '06:30', i: 'plane-departure', k: 'key', h: 'Décollage', l: 'Médine', d: '—', n: 'Taqabbal Allâhu minnâ wa minkum.' },
  ],
  notes: [
    ['imp', '<b>Dans le sac à main,</b> pas dans la valise : passeports, cartes d’embarquement, téléphones chargés, médicaments.'],
    ['verify', '<b>Zamzam :</b> vérifier auprès de la compagnie les conditions pour en rapporter.'],
  ],
}));

// ---------------------------------------------------------------- annexes
const valise = `<section class="sheet" id="valise">
  <header class="sh"><p class="eyebrow">III · Emporter & noter</p><h2 class="sh-t">Checklist valise</h2>
    <p class="sh-sub">Pensée pour une Omra en novembre · train : 1 valise ≤ 25 kg + 1 bagage à main par personne.</p></header>
  <p class="f-h wx">${sti('verify')} Climat moyen mi-novembre : ≈ 29 °C le jour et 17 °C la nuit à Médine, ≈ 33 °C et 23 °C à La Mecque — météo à vérifier la semaine du départ.</p>
  <div class="cats">
    ${catCk('e-passport', 'Documents', [['v_passeport', 'Passeports (×3)'], ['v_visa', 'Visas (×3)'], ['v_billets', 'Billets — avion et train'], ['v_hotels', 'Réservations d’hôtels'], ['v_assurance', 'Assurance'], ['v_nusuk', 'Nusuk — application et permis'], ['v_copies', 'Copies des passeports', 'Papier + photo dans le téléphone'], ['v_argent', 'Cartes bancaires + un peu d’espèces (SAR)']])}
    ${catCk('shirt', 'Vêtements', [['v_ihram', 'Ihram — 2 tenues par homme', 'Une de rechange'], ['v_ceinture', 'Ceinture d’ihram (hommes)'], ['v_legers', 'Vêtements légers'], ['v_soir', 'Vêtements pour le soir', 'Une couche légère : soirées plus fraîches à Médine, mosquées climatisées'], ['v_sous', 'Sous-vêtements'], ['v_chaussettes', 'Chaussettes'], ['v_chaussures', 'Chaussures confortables, déjà portées'], ['v_sandales', 'Sandales', 'Indispensables pour l’ihram des hommes'], ['v_maman', 'Tenues amples et voiles de rechange (Maman)']])}
    ${catCk('book', 'Spirituel', [['v_quran', 'Qur’an (format de poche)'], ['v_duas', 'Liste de du’as', 'Page « Nos du’as »'], ['v_appquran', 'Application Qur’an'], ['v_dhikr', 'Compteur de dhikr, si souhaité'], ['v_tapis', 'Petit tapis de prière pliable', 'Pour l’aéroport et le train — facultatif']])}
    ${catCk('device-mobile', 'Tech', [['v_iphone', 'iPhone'], ['v_chargeur', 'Chargeurs et câbles de rechange'], ['v_batterie', 'Batterie externe'], ['v_adaptateur', 'Adaptateur', 'Prises de type G (3 broches) — à vérifier'], ['v_esim', 'eSIM installée avant le départ'], ['v_ecouteurs', 'Écouteurs']])}
    ${catCk('first-aid-kit', 'Santé / confort', [['v_medicaments', 'Médicaments personnels + ordonnances'], ['v_pansements', 'Pansements (ampoules)'], ['v_creme', 'Crème hydratante sans parfum'], ['v_lunettes', 'Lunettes (+ lunettes de soleil)'], ['v_savon', 'Savon, shampoing, déodorant sans parfum', 'Pour la période d’ihram'], ['v_antifrot', 'Crème anti-frottements sans parfum', 'Hommes en ihram'], ['v_solaire', 'Crème solaire sans parfum'], ['v_gourde', 'Gourde réutilisable'], ['v_ciseaux', 'Petits ciseaux pour le taqsir', 'En bagage de soute'], ['v_sacchaussures', 'Sac à chaussures pour les mosquées']])}
  </div>
</section>`;

const dua = (icon, title, name, q = '', cls = '') => `<div class="dua ${cls}">
  <div class="dua-hd">${ic(icon)}<span class="t">${title}</span>${q}</div>
  <a class="area" href="https://omra.local/m/${uniq(name)}"></a>
</div>`;

const duas = `<section class="sheet" id="duas">
  <header class="sh"><p class="eyebrow">III · Emporter & noter</p><h2 class="sh-t">Nos du’as<span class="ar">أدعيتنا</span></h2></header>
  <div class="dua-epi"><span class="ar">وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ</span><small>« Votre Seigneur a dit : Invoquez-Moi, Je vous répondrai. » — Ghâfir, 40:60</small></div>
  ${dua('heart', 'Pour moi', 'dua_moi')}
  ${dua('users', 'Pour mes parents', 'dua_parents', '<span class="q"><span class="ar">رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا</span><small>« Seigneur, fais-leur miséricorde comme ils m’ont élevé tout petit. » — 17:24</small></span>')}
  ${dua('users', 'Pour ma famille', 'dua_famille', '', 'pb tall')}
  ${dua('sunrise', 'Pour notre avenir', 'dua_avenir', '', 'tall')}
  ${dua('heart', 'Pour les personnes que j’aime', 'dua_proches', '', 'pb tall')}
  ${dua('hands', 'Du’as personnelles', 'dua_perso', '', 'tall')}
</section>`;

const sources = `<section class="sheet" id="sources">
  <header class="sh"><p class="eyebrow">III · Emporter & noter</p><h2 class="sh-t">Sources & vérifications</h2>
    <p class="sh-sub">Recherches du 29 septembre 2026. Règles et horaires peuvent changer : vérifier la semaine du départ.</p></header>
  <ul class="bul src">
    <li><span><b>Horaires des prières</b> — calculés le 29/09/2026 selon la méthode Umm al-Qura (Fajr : soleil à 18,5° sous l’horizon ; Isha : 90 min après Maghrib), aux coordonnées de Masjid an-Nabawi et de Masjid al-Haram ; deux calculs indépendants concordent à 1 min près. Ce sont les heures de l’adhan ; l’iqama suit. À confirmer sur place (affichage des mosquées, applications).</span></li>
    <li><span><b>Dates hégiriennes</b> — calendrier officiel Umm al-Qura.</span></li>
    <li><span><b>Train Haramain</b> — site officiel <span class="u">sar.hhr.sa</span> : bagages, billets, conditions générales, gares, services ; compte officiel <span class="u">@haramainrailway</span> : annonce du miqat à bord.</span></li>
    <li><span><b>Nusuk et ministère du Hajj et de la Omra</b> — <span class="u">haj.gov.sa</span> : permis Omra (obligatoire, gratuit, lié à un créneau), permis Rawdah, guide de l’ihram en français ; application Nusuk.</span></li>
    <li><span><b>Rawdah</b> — Agence de presse saoudienne (SPA), déc. 2025 et mai 2026 : règle des 365 jours, file immédiate, plages horaires ; Saudi Gazette : accès, consignes d’arrivée, durée de visite.</span></li>
    <li><span><b>Visas</b> — SPA, oct. 2025 : tous les visas permettent la Omra, avec un permis Nusuk ; Al Arabiya et Gulf News, oct.–nov. 2025 : visa Omra à utiliser dans les 30 jours.</span></li>
    <li><span><b>Mobilité au Haram</b> — SPA, 2024–2025 : fauteuils gratuits (portes 19 et 64), plateforme Tanaqol (<span class="u">carts.alharamain.gov.sa</span>).</span></li>
    <li><span><b>Rites</b> — ministère du Hajj ; fatwas de binbaz.org.sa, binothaimeen.net, islamqa.info ; hadiths via sunnah.com (Bukhârî 1524, 1539, 1549 ; Muslim 1184, 1218 ; Abû Dâwûd 1892 ; Ibn Mâjah 1412) ; avis du Grand Mufti sur l’ihram dans le train (al-Madina, 2017).</span></li>
    <li><span><b>À vérifier en priorité</b> — horaires des trains, créneaux Rawdah et permis Omra dans Nusuk, durées de trajet aéroport ↔ hôtel, numéros d’urgence, météo.</span></li>
  </ul>
  <div class="card line" style="margin-top:var(--g4)"><p>${sti('imp')} Ce carnet est un outil d’organisation : il ne remplace ni l’avis d’un savant, ni les consignes officielles données sur place.</p></div>
  <div class="closing">${ic('star8')}<span class="ar">تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ</span><p>Qu’Allah accepte de nous et de vous.</p></div>
</section>`;

// ---------------------------------------------------------------- assemble
function frTypography(html) {
  // Only touch text nodes: French spacing before ; : ! ? » and after «, and glued units.
  return html.replace(/>([^<>]+)</g, (m, text) => {
    let t = text;
    t = t.replace(/ ([:;!?»])/g, (x, p) => (p === ':' ? ' :' : ' ' + p));
    t = t.replace(/« /g, '« ');
    t = t.replace(/(\d) (h|min|kg|cm|km|°C|nuits?|jours?|rak’a)(?=[\s,.;:)<]|$)/g, '$1 $2');
    t = t.replace(/(\d) h (\d)/g, '$1 h $2');
    t = t.replace(/≈ /g, '≈ ');
    t = t.replace(/ – /g, ' – ');
    t = t.replace(/(\d) × (\d)/g, '$1 × $2');
    t = t.replace(/p\. (\d)/g, 'p. $1');
    return '>' + t + '<';
  });
}

function fontFaces() {
  // Variable fonts: several weights share one file — embed each file once with a weight range.
  const css = readFileSync(join(HERE, 'fonts-subset.css'), 'utf8');
  const faces = new Map();
  for (const block of css.match(/@font-face \{[^}]+\}/g)) {
    const family = block.match(/font-family: '([^']+)'/)[1];
    const style = block.match(/font-style: (\w+)/)[1];
    const weight = Number(block.match(/font-weight: (\d+)/)[1]);
    const file = block.match(/url\((fonts\/[^)]+)\)/)[1];
    const range = block.match(/unicode-range: ([^;]+);/)[1];
    const key = family + style + file;
    const f = faces.get(key) || { family, style, file, range, min: weight, max: weight };
    f.min = Math.min(f.min, weight); f.max = Math.max(f.max, weight);
    faces.set(key, f);
  }
  return [...faces.values()].map((f) => {
    const b64 = readFileSync(join(ROOT, 'fonts', f.file.replace('fonts/', ''))).toString('base64');
    return `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.min === f.max ? f.min : f.min + ' ' + f.max};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${f.range};}`;
  }).join('\n');
}

const body = [cover, toc, overview, essentials, transports, before,
  days[0], days[1], rawdah, days[2], ihram, days[3], etapes, guide, days[4], days[5], days[6],
  valise, duas, sources].join('\n');

const printSwitch = `<script>
  // Browser view only (the PDF build sets window.__PDF__ first): PDF field placeholders become
  // real inputs, remembered in this browser; printing switches to the A4 layout.
  (function () {
    if (window.__PDF__) return;
    var store = {};
    try { store = JSON.parse(localStorage.getItem('omra2026') || '{}'); } catch (e) {}
    function save() { try { localStorage.setItem('omra2026', JSON.stringify(store)); } catch (e) {} }
    document.querySelectorAll('a[href^="https://omra.local/"]').forEach(function (a) {
      var parts = a.getAttribute('href').split('/');
      var kind = parts[3], name = parts[4], el;
      if (kind === 'c') { el = document.createElement('input'); el.type = 'checkbox'; el.checked = !!store[name]; }
      else if (kind === 'm') { el = document.createElement('textarea'); el.value = store[name] || ''; }
      else { el = document.createElement('input'); el.type = 'text'; el.value = store[name] || ''; }
      el.className = a.className; el.setAttribute('aria-label', name);
      el.addEventListener(kind === 'c' ? 'change' : 'input', function () { store[name] = kind === 'c' ? el.checked : el.value; save(); });
      a.replaceWith(el);
    });
    addEventListener('beforeprint', function () { document.documentElement.className = 'a4'; });
    addEventListener('afterprint', function () { document.documentElement.className = 'phone screen'; });
  })();
</script>`;

const html = `<!doctype html>
<html lang="fr" class="phone screen">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Omra 2026 — Carnet de route</title>
<meta name="description" content="Carnet de route familial : Médine, La Mecque, Médine — 10 au 16 novembre 2026.">
<style>${fontFaces()}</style>
<style>@page { size: A4; margin: 15mm 17mm 17mm; }
${readFileSync(join(HERE, 'styles.css'), 'utf8')}</style>
</head>
<body>
${sprite()}
${frTypography(body)}
${printSwitch}
</body>
</html>`;

mkdirSync(join(ROOT, 'out'), { recursive: true });
writeFileSync(join(ROOT, 'out', 'carnet.html'), html);
console.log('carnet.html written', (html.length / 1024).toFixed(0) + ' KB', names.size + ' fields');
