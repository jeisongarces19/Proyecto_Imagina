// src/koncisaPlus/parts/grommets.js

function buildGrommetCode({ diameterMm }) {
  return `KPL-GROMMET-${diameterMm}`;
}

export function createGrommet({ diameterMm = 80, x = 0, y = 735, z = 0, code = 'LKAC250000' }) {
  return {
    type: 'grommet',
    subtype: 'pasacable-grande',
    line: 'KONCISA.PLUS',
    code,
    name: `Grommet Ø${diameterMm}`,
    dimMm: {
      diameterMm,
      widthMm: diameterMm,
      depthMm: diameterMm,
      thickMm: 5,
    },
    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    model: {
      kind: 'glb',
      src: '/assets/models/koncisaPlus/LKAC250000.glb',
    },
    meta: {
      category: 'grommets',
    },
  };
}
