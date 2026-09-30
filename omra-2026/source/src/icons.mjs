// SVG sprite: Tabler Icons (MIT) + a few custom glyphs drawn in the same 24px line style.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tablerDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@tabler', 'icons', 'icons', 'outline') + '/';

const TABLER = [
  'plane-arrival', 'plane-departure', 'train', 'car', 'bus', 'building', 'bed', 'moon-stars', 'alarm',
  'coffee', 'tools-kitchen-2', 'mosque', 'building-mosque', 'walk', 'scissors', 'book', 'droplet',
  'luggage', 'e-passport', 'ticket', 'map-pin', 'clock-hour-4', 'sparkles', 'mountain', 'sunrise',
  'device-mobile', 'phone', 'shield-check', 'users', 'wheelchair', 'star', 'hanger', 'shirt',
  'first-aid-kit', 'plug', 'battery-charging', 'eyeglass', 'credit-card', 'file-text', 'id',
  'arrow-right', 'arrow-down', 'chevron-right', 'bookmark', 'heart', 'moon', 'sun', 'door-enter',
  'route', 'calendar', 'list-check', 'info-circle', 'bell', 'notebook', 'pray', 'backpack', 'bottle',
];

function tabler(name) {
  const svg = readFileSync(tablerDir + name + '.svg', 'utf8');
  const inner = svg
    .replace(/[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*/, '')
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '')
    .trim();
  return `<symbol id="i-${name}" viewBox="0 0 24 24">${inner}</symbol>`;
}

// Custom line glyphs (same grid, same stroke logic as Tabler).
const CUSTOM = {
  // Kaaba: isometric cube with the band (hizam).
  kaaba: '<path d="M12 3.2l8 3.9v9.8l-8 3.9l-8 -3.9v-9.8z"/><path d="M4 7.1l8 3.9l8 -3.9"/><path d="M12 11v9.8"/><path d="M4 10.2l8 3.9l8 -3.9"/>',
  // Hands raised in du'a.
  hands: '<path d="M10.5 20.5l-1.2 -2.6c-.6 -1.2 -1.7 -2 -3 -2.4l-1.3 -.4c-.8 -.3 -1.4 -1 -1.5 -1.9l-.5 -6.3c-.1 -.9 .6 -1.6 1.4 -1.6c.8 0 1.4 .6 1.5 1.4l.3 3.9"/><path d="M6.2 10.5l1.4 -5.1c.2 -.8 1 -1.3 1.8 -1.1c.8 .2 1.3 1 1.1 1.8l-1.1 4.9l.9 3.7c.2 .8 .3 1.6 .3 2.5v3.3"/><path d="M13.5 20.5l1.2 -2.6c.6 -1.2 1.7 -2 3 -2.4l1.3 -.4c.8 -.3 1.4 -1 1.5 -1.9l.5 -6.3c.1 -.9 -.6 -1.6 -1.4 -1.6c-.8 0 -1.4 .6 -1.5 1.4l-.3 3.9"/><path d="M17.8 10.5l-1.4 -5.1c-.2 -.8 -1 -1.3 -1.8 -1.1c-.8 .2 -1.3 1 -1.1 1.8l1.1 4.9l-.9 3.7c-.2 .8 -.3 1.6 -.3 2.5v3.3"/>',
  // Eight-pointed star (khatam), decorative.
  star8: '<path d="M12.00 2.67 L14.73 5.40 L18.60 5.40 L18.60 9.27 L21.33 12.00 L18.60 14.73 L18.60 18.60 L14.73 18.60 L12.00 21.33 L9.27 18.60 L5.40 18.60 L5.40 14.73 L2.67 12.00 L5.40 9.27 L5.40 5.40 L9.27 5.40 Z" stroke-linejoin="miter"/><circle cx="12" cy="12" r="2.2"/>',
  // Palm / dates branch, used for the Médine ziyârât.
  arch: '<path d="M5 21v-9.5c0 -4.2 3.1 -7.5 7 -8.5c3.9 1 7 4.3 7 8.5v9.5"/><path d="M3.5 21h17"/>',
};

// Filled status glyphs (they read like ✅ 🟡 🔵 ⚠️ but in the book's muted palette).
const STATUS = {
  ok: '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.6 12.3l3 3l5.8 -6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  book: '<circle cx="12" cy="12" r="9.5" fill="currentColor"/>',
  verify: '<circle cx="12" cy="12" r="9.5" fill="currentColor"/>',
  imp: '<path d="M10.3 3.6l-8.2 14.1a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7 -3l-8.2 -14.1a2 2 0 0 0 -3.4 0z" fill="currentColor"/><path d="M12 9v4.6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.35" fill="#fff"/>',
};

export function sprite() {
  const parts = [];
  for (const n of TABLER) parts.push(tabler(n));
  for (const [n, d] of Object.entries(CUSTOM)) parts.push(`<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`);
  for (const [n, d] of Object.entries(STATUS)) parts.push(`<symbol id="s-${n}" viewBox="0 0 24 24">${d}</symbol>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${parts.join('')}</defs></svg>`;
}
