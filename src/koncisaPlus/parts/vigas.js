// src/koncisaPlus/parts/vigas.js
import { resolveKoncisaViga } from '../rules/koncisaVigaRules';

export function createViga({
  groupId = null,
  groupName = null,
  nominalWidthMm = 1200,
  x = 0,
  y = 650,
  z = 0,
}) {
  const resolved = resolveKoncisaViga({ nominalWidthMm });

  const widthMm = Math.max(1, nominalWidthMm - 87);
  const heightMm = 50.8;
  const depthMm = 25.4;

  return {
    type: 'viga',
    subtype: 'soporte',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.codigoPT,

    name: `Viga ${nominalWidthMm}`,

    dimMm: {
      widthMm,
      heightMm,
      depthMm,
      nominalWidthMm,
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
      nominalWidthMm,
    },
  };
}
