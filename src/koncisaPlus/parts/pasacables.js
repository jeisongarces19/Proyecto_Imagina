//src / koncisaPlus / parts / pasacables.js;

export function createPasacable({ diameterMm = 50, x = 0, y = 735, z = 0, code = null }) {
  return {
    type: 'pasacable',
    subtype: 'redondo-pequeno',
    line: 'KONCISA.PLUS',
    code,
    name: `Pasacable Ø${diameterMm}`,
    dimMm: {
      diameterMm,
      widthMm: diameterMm,
      depthMm: diameterMm,
      thickMm: 5,
    },
    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: 'pasacables',
    },
  };
}
