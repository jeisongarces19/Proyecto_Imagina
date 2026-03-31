// src/koncisaPlus/parts/superficies.js
import { resolveKoncisaSurfaceCodigoPT } from '../rules/koncisaSurfaceRules';

export function createSuperficie({
  // Medidas reales (para dibujar)
  widthMm = 1200,
  depthMm = 600,

  // Medidas de cobro / código
  billingWidthMm = null,
  billingDepthMm = null,

  thickMm = 25,
  shape = 'RECT',
  finishCode = '22008689',
  variant = '',
  perforada = tipoPasoCable !== 'none',
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

    // Código real de catálogo
    code: resolved.codigoPT,

    // Código lógico armado con la regla
    logicalCode: resolved.logicalCode,

    // Estado de existencia
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name: `Superficie ${widthMm}x${depthMm}`,

    // Dimensiones reales para render / dibujo
    dimMm: {
      widthMm,
      depthMm,
      thickMm,
    },

    // Dimensiones comerciales / facturables
    billingDimMm: {
      widthMm: resolvedBillingWidthMm,
      depthMm: resolvedBillingDepthMm,
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
