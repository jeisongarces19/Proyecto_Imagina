// src/koncisaPlus/parts/grommets.js

function buildGrommetCode({ diameterMm }) {
  return `KPL-GROMMET-${diameterMm}`;
}

export function createGrommet({ diameterMm = 80, x = 0, y = 735, z = 0, code }) {
  return {
    type: 'grommet',
    subtype: 'pasacable',
    line: 'KONCISA.PLUS',
    code: code || buildGrommetCode({ diameterMm }),
    name: `Pasacable Ø${diameterMm}`,
    dimMm: {
      diameterMm,
      widthMm: diameterMm,
      depthMm: diameterMm,
      thickMm: 5,
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
      category: 'grommets',
    },
  };
}
