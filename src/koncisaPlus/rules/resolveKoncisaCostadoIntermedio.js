// src/koncisaPlus/rules/resolveKoncisaCostadoIntermedio.js

export const KONCISA_COSTADO_INTERMEDIO_RULES = {
  // Intermedio sencillo
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_060: {
    codigoPT: '22000132394',
    modelSrc: '/assets/models/koncisaPlus/2KSO331000_60.glb',
  },
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_075: {
    codigoPT: '22000132395',
    modelSrc: '/assets/models/koncisaPlus/2KSO331000_75.glb',
  },

  // Intermedio doble
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_120: {
    codigoPT: '22000132390',
    modelSrc: '/assets/models/koncisaPlus/2KSO329000_120.glb',
  },
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_150: {
    codigoPT: '22000132391',
    modelSrc: '/assets/models/koncisaPlus/2KSO070000_150.glb',
  },
};

export function resolveKoncisaCostadoIntermedio({ tipoPuesto = 'sencillo', depthMm = 600 }) {
  let depthToken = null;

  if (tipoPuesto === 'sencillo') {
    if (depthMm === 600) depthToken = '060';
    else if (depthMm === 750) depthToken = '075';
  }

  if (tipoPuesto === 'doble') {
    if (depthMm === 1200) depthToken = '120';
    else if (depthMm === 1500) depthToken = '150';
  }

  if (!depthToken) {
    return {
      logicalCode: null,
      codigoPT: null,
      modelSrc: null,
      exists: false,
    };
  }

  const logicalCode = `KONPLUSSPAINTEDLEGINTERMEDIATE_16_${depthToken}`;
  const found = KONCISA_COSTADO_INTERMEDIO_RULES[logicalCode] || null;

  return {
    logicalCode,
    codigoPT: found?.codigoPT || null,
    modelSrc: found?.modelSrc || null,
    exists: !!found,
  };
}
