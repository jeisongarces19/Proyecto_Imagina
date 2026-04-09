// src/koncisaPlus/rules/koncisaCostadoRules.js

export const KONCISA_COSTADO_RULES = {
  KONPLUSSPAINTEDLEGTERMINAL_16_060_RECT: {
    codigoPT: '22000132392',
    modelSrc: '/assets/models/koncisaPlus/2KSO330000_60.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TEK_DER: {
    codigoPT: '22000133995',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_60_DER.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TEK_IZQ: {
    codigoPT: '22000134102',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_60_IZQ.glb',
  },
};

export function resolveKoncisaCostadoTerminal({
  tipoPuesto = 'sencillo',
  depthMm = 600,
  forma = 'RECT',
}) {
  const depthToken =
    depthMm === 600
      ? '060'
      : depthMm === 750
        ? '075'
        : depthMm === 1200
          ? '120'
          : depthMm === 1500
            ? '150'
            : null;

  if (!depthToken) return null;

  const logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${forma}`;
  const found = KONCISA_COSTADO_RULES[logicalCode] || null;

  return {
    logicalCode,
    codigoPT: found?.codigoPT || null,
    modelSrc: found?.modelSrc || null,
    exists: !!found,
  };
}
