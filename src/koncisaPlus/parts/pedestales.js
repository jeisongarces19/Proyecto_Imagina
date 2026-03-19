// src/koncisaPlus/parts/pedestales.js

function buildPedestalCode({ cajones, widthMm, depthMm, heightMm }) {
  return `KPL-PED-${cajones}C-${widthMm}x${depthMm}x${heightMm}`;
}

export function createPedestal({
  cajones = 2,
  widthMm = 400,
  depthMm = 500,
  heightMm = 580,
  x = 0,
  y = 0,
  z = 0,
  code,
}) {
  return {
    type: 'pedestal',
    subtype: `${cajones}-cajones`,
    line: 'KONCISA.PLUS',
    code: code || buildPedestalCode({ cajones, widthMm, depthMm, heightMm }),
    name: `Pedestal ${cajones} cajones`,
    dimMm: {
      widthMm,
      depthMm,
      heightMm,
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
      cajones,
      category: 'pedestales',
    },
  };
}

export function createCajonera({
  cajones = 3,
  widthMm = 430,
  depthMm = 500,
  heightMm = 600,
  x = 0,
  y = 0,
  z = 0,
  code,
}) {
  return {
    type: 'cajonera',
    subtype: `${cajones}-cajones`,
    line: 'KONCISA.PLUS',
    code: code || `KPL-CAJ-${cajones}C-${widthMm}x${depthMm}x${heightMm}`,
    name: `Cajonera ${cajones} cajones`,
    dimMm: {
      widthMm,
      depthMm,
      heightMm,
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
      cajones,
      category: 'cajoneras',
    },
  };
}
