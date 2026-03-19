// src/koncisaPlus/parts/superficies.js

function buildSurfaceCode({ widthMm, depthMm, perforada, canto }) {
  const perf = perforada ? 'PERF' : 'LISA';
  const edge = canto ? `CANTO-${String(canto).toUpperCase()}` : 'SIN-CANTO';
  return `KPL-SUP-${widthMm}x${depthMm}-${perf}-${edge}`;
}

export function createSuperficie({
  widthMm = 1200,
  depthMm = 600,
  thickMm = 30,
  perforada = false,
  canto = 'PVC-2MM',
  x = 0,
  y = 720,
  z = 0,
  index = 0,
  code,
}) {
  return {
    type: 'superficie',
    subtype: perforada ? 'con-perforacion' : 'sin-perforacion',
    line: 'KONCISA.PLUS',
    code: code || buildSurfaceCode({ widthMm, depthMm, perforada, canto }),
    name: `Superficie ${widthMm}x${depthMm}`,
    dimMm: {
      widthMm,
      depthMm,
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
      index,
      perforada,
      canto,
      alturaTrabajoMm: y,
      category: 'superficies',
    },
  };
}
