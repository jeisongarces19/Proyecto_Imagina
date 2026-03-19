// src/koncisaPlus/parts/ductos.js

function buildDuctoCode({ tipo, widthMm, heightMm }) {
  return `KPL-DUCT-${String(tipo).toUpperCase()}-${widthMm}x${heightMm}`;
}

export function createDucto({
  tipo = 'individual', // terminal | individual | intermedio | piso | techo
  widthMm = 1200,
  heightMm = 120,
  depthMm = 80,
  x = 0,
  y = 620,
  z = 0,
  code,
}) {
  return {
    type: 'ducto',
    subtype: tipo,
    line: 'KONCISA.PLUS',
    code: code || buildDuctoCode({ tipo, widthMm, heightMm }),
    name: `Ducto ${tipo}`,
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
      category: 'ductos',
    },
  };
}

export function createDuctoPiso({
  heightMm = 700,
  widthMm = 120,
  depthMm = 80,
  x = 0,
  y = 0,
  z = 0,
  code,
}) {
  return createDucto({
    tipo: 'piso',
    widthMm,
    heightMm,
    depthMm,
    x,
    y,
    z,
    code: code || `KPL-DUCT-PISO-${widthMm}x${heightMm}`,
  });
}

export function createDuctoTecho({
  heightMm = 1200,
  widthMm = 120,
  depthMm = 80,
  x = 0,
  y = 720,
  z = 0,
  code,
}) {
  return createDucto({
    tipo: 'techo',
    widthMm,
    heightMm,
    depthMm,
    x,
    y,
    z,
    code: code || `KPL-DUCT-TECHO-${widthMm}x${heightMm}`,
  });
}
