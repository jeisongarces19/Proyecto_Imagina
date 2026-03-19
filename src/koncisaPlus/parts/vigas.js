// src/koncisaPlus/parts/vigas.js

function buildVigaCode({ widthMm }) {
  return `KPL-VIGA-${widthMm}`;
}

export function createViga({
  widthMm = 1200,
  heightMm = 60,
  depthMm = 40,
  x = 0,
  y = 650,
  z = 0,
  code,
}) {
  return {
    type: 'viga',
    subtype: 'estructural',
    line: 'KONCISA.PLUS',
    code: code || buildVigaCode({ widthMm }),
    name: `Viga ${widthMm}`,
    dimMm: {
      widthMm,
      heightMm,
      depthMm,
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
      category: 'vigas',
    },
  };
}
