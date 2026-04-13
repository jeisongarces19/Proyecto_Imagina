// src/koncisaPlus/parts/ductos.js
import { resolveKoncisaDucto } from '../rules/koncisaDuctoRules';

function buildDuctoCode({ tipo, widthMm, heightMm }) {
  return `KPL-DUCT-${String(tipo).toUpperCase()}-${widthMm}x${heightMm}`;
}

export function createDucto({
  groupId = null,
  groupName = null,
  tipoPuesto = 'sencillo',
  tipoModulo = 'terminal',
  nominalWidthMm = 1200,
  x = 0,
  y = 620,
  z = 0,
}) {
  const resolved = resolveKoncisaDucto({
    tipoPuesto,
    tipoModulo,
    nominalWidthMm,
  });

  return {
    type: 'ducto',
    subtype: tipoModulo,
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name: `Ducto ${tipoPuesto} ${tipoModulo} ${nominalWidthMm}`,

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },

    model: {
      kind: 'glb',
      src: resolved?.modelSrc || null,
    },

    meta: {
      category: 'ductos',
      tipoPuesto,
      tipoModulo,
      nominalWidthMm,
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
