// src/koncisaPlus/parts/superficies.js
import { resolveKoncisaSurfaceCodigoPT } from '../rules/koncisaSurfaceRules';

export function createSuperficie({
  groupId = null,
  groupName = null,
  widthMm = 1200,
  depthMm = 600,
  billingWidthMm = null,
  billingDepthMm = null,
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
  const resolvedBillingWidthMm = billingWidthMm ?? widthMm;
  const resolvedBillingDepthMm = billingDepthMm ?? depthMm;

  const resolved = resolveKoncisaSurfaceCodigoPT({
    billingWidthMm: resolvedBillingWidthMm,
    billingDepthMm: resolvedBillingDepthMm,
    shape,
    thicknessMm: thickMm,
    finishCode,
    variant,
  });

  return {
    type: 'superficie',
    subtype: perforada ? 'con-perforacion' : 'sin-perforacion',
    line: 'KONCISA.PLUS',
    groupId,
    groupName,
    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,
    name: `Superficie ${widthMm}x${depthMm}`,
    dimMm: { widthMm, depthMm, thickMm },
    billingDimMm: {
      widthMm: resolvedBillingWidthMm,
      depthMm: resolvedBillingDepthMm,
      thickMm,
    },
    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
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
