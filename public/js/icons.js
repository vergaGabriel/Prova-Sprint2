// public/js/icons.js
// SVGs inline copiados do Lucide (https://lucide.dev, MIT). Sem dependencia
// externa: o dashboard funciona offline, sem flash de icone faltando.
// Cada icone usa stroke="currentColor" — cor herda do CSS do elemento pai.

const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
  'fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"';

export const icons = {
  activity: `
    <svg ${SVG_ATTRS}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 2.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 12H2"/>
    </svg>`,

  alertTriangle: `
    <svg ${SVG_ATTRS}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>`,

  alertOctagon: `
    <svg ${SVG_ATTRS}>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`,

  wifi: `
    <svg ${SVG_ATTRS}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>`,

  wifiOff: `
    <svg ${SVG_ATTRS}>
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M8.5 16.5a5 5 0 0 1 7 0"/>
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65"/>
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/>
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/>
      <path d="M5 13a10 10 0 0 1 5.24-2.76"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>`,

  zap: `
    <svg ${SVG_ATTRS}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>`,
};
