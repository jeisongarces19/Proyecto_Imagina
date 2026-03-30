// src/koncisaPlus/parts/superficies.js
import { resolveKoncisaSurfaceCodigoPT } from '../rules/koncisaSurfaceRules';

export function createSuperficie({
  widthMm = 1200,
  depthMm = 600,
  thickMm = 25,
  shape = 'RECT',
  finishCode = '22008689',
  variant = '',
  perforada = false,
  canto = 'PVC-2MM',
  x = 0,
  y = 720,
  z = 0,
  index = 0,
}) {
  const resolved = resolveKoncisaSurfaceCodigoPT({
    widthMm,
    depthMm,
    shape,
    thicknessMm: thickMm,
    finishCode,
    variant,
  });

  return {
    type: 'superficie',
    subtype: perforada ? 'con-perforacion' : 'sin-perforacion',
    line: 'KONCISA.PLUS',
    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,
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
      shape,
      finishCode,
      variant,
      alturaTrabajoMm: y,
      category: 'superficies',
    },
  };
}

/*
function redondearLargoSencillo(mm) {
  const metros = mm / 1000;

  if (metros <= 1) return 1000;
  if (metros > 1 && metros <= 1.2) return 1200;
  if (metros > 1.2 && metros <= 1.5) return 1500;
  return 1200;
}
*/
