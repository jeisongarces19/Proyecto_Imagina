// src/koncisaPlus/parts/costados.js
import { resolveKoncisaCostadoTerminal } from '../rules/koncisaCostadoRules';

import { resolveKoncisaCostadoIntermedio } from '../rules/resolveKoncisaCostadoIntermedio';

export function createCostado({
  groupId = null,
  groupName = null,
  tipo = 'terminal', // terminal | intermedio
  tipoPuesto = 'sencillo', // sencillo | doble
  depthMm = 600,
  forma = 'RECT',
  lado = 'izq', // izq | der | center
  x = 0,
  y = 0,
  z = 0,
}) {
  let resolved = null;

  if (tipo === 'terminal') {
    resolved = resolveKoncisaCostadoTerminal({
      tipoPuesto,
      depthMm,
      forma,
      lado,
    });
  } else if (tipo === 'intermedio') {
    resolved = resolveKoncisaCostadoIntermedio({
      tipoPuesto,
      depthMm,
    });
  }

  const rotationY = tipo === 'terminal' ? (lado === 'der' ? Math.PI : 0) : 0;

  return {
    type: 'costado',
    subtype: tipo,
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved?.codigoPT || null,
    logicalCode: resolved?.logicalCode || null,
    existsInCatalog: !!resolved?.exists,
    rawCodigoPT: resolved?.codigoPT || null,

    name:
      tipo === 'intermedio' ? `Costado intermedio ${depthMm}` : `Costado terminal ${lado} ${forma}`,

    dimMm: {
      depthMm,
    },

    position: {
      x,
      y,
      z,
    },

    rotation: {
      x: 0,
      y: rotationY,
      z: 0,
    },

    model: {
      kind: 'glb',
      src: resolved?.modelSrc || null,
    },

    meta: {
      category: 'costados',
      tipo,
      lado,
      forma,
      tipoPuesto,
      depthMm,
    },
  };
}
