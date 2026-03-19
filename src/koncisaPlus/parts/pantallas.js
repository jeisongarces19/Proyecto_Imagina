// src/koncisaPlus/parts/pantallas.js

function buildPantallaCode({ tipo, widthMm, heightMm }) {
  return `KPL-PANT-${String(tipo).toUpperCase()}-${widthMm}x${heightMm}`;
}

export function createPantalla({
  tipo = 'frontal', // frontal | lateral
  widthMm = 1200,
  heightMm = 350,
  thickMm = 18,
  x = 0,
  y = 750,
  z = 0,
  code,
}) {
  return {
    type: 'pantalla',
    subtype: tipo,
    line: 'KONCISA.PLUS',
    code: code || buildPantallaCode({ tipo, widthMm, heightMm }),
    name: `Pantalla ${tipo} ${widthMm}x${heightMm}`,
    dimMm: {
      widthMm,
      heightMm,
      thickMm,
    },
    position: {
      x,
      y,
      z,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    meta: {
      category: 'pantallas',
    },
  };
}
