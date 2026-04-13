// src/koncisaPlus/rules/koncisaCostadoRules.js

export const KONCISA_COSTADO_RULES = {
  // =========================
  // SENCILLO - RECT
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_RECT: {
    codigoPT: '22000132392',
    modelSrc: '/assets/models/koncisaPlus/2KSO330000_60.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_RECT: {
    codigoPT: '22000132393',
    modelSrc: '/assets/models/koncisaPlus/2KSO330000_75.glb',
  },

  // =========================
  // SENCILLO - TEK
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TEK_DER: {
    codigoPT: '22000133995',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_60_DER.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_TEK_DER: {
    codigoPT: '22000133996',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_75_DER.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TEK_IZQ: {
    codigoPT: '22000134102',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_60_IZQ.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_TEK_IZQ: {
    codigoPT: '22000134103',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_75_IZQ.glb',
  },

  // =========================
  // SENCILLO - ORTOGONAL
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_ORTOGONAL_DER: {
    codigoPT: '22000136064',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_ORTOGONAL_DER: {
    codigoPT: '22000136065',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_ORTOGONAL_IZQ: {
    codigoPT: '22000136064',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_ORTOGONAL_IZQ: {
    codigoPT: '22000136065',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - O
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_O: {
    codigoPT: '22000133828',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_O: {
    codigoPT: '22000133829',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - CURVO
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_CURVO_DER: {
    codigoPT: '22000133830',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_CURVO_DER: {
    codigoPT: '22000133831',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_CURVO_IZQ: {
    codigoPT: '22000134104',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_CURVO_IZQ: {
    codigoPT: '22000134105',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - TRAP
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TRAP_DER: {
    codigoPT: '22000132396',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_TRAP_DER: {
    codigoPT: '22000132398',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TRAP_IZQ: {
    codigoPT: '22000132397',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_TRAP_IZQ: {
    codigoPT: '22000132399',
    modelSrc: null,
  },

  // =========================
  // DOBLE - RECT
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_RECT: {
    codigoPT: '22000132388',
    modelSrc: '/assets/models/koncisaPlus/2KSO328000_120.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_RECT: {
    codigoPT: '22000132389',
    modelSrc: '/assets/models/koncisaPlus/2KSO328000_150.glb',
  },

  // =========================
  // DOBLE - TEK
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_TEK: {
    codigoPT: '22000133822',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_TEK: {
    codigoPT: '22000133823',
    modelSrc: null,
  },

  // =========================
  // DOBLE - ORTOGONAL
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_ORTOGONAL: {
    codigoPT: '22000136066',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_ORTOGONAL: {
    codigoPT: '22000136067',
    modelSrc: null,
  },

  // =========================
  // DOBLE - O
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_O: {
    codigoPT: '22000133826',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_O: {
    codigoPT: '22000133827',
    modelSrc: null,
  },

  // =========================
  // DOBLE - CURVO
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_CURVO: {
    codigoPT: '22000133832',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_CURVO: {
    codigoPT: '22000133833',
    modelSrc: null,
  },

  // =========================
  // DOBLE - TRAP
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_TRAP: {
    codigoPT: '22000132404',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_TRAP: {
    codigoPT: '22000132405',
    modelSrc: null,
  },
};

export function resolveKoncisaCostadoTerminal({
  tipoPuesto = 'sencillo',
  depthMm = 600,
  forma = 'RECT',
  lado = 'izq', // izq | der
}) {
  let depthToken = null;
  let logicalCode = null;

  // =========================
  // SENCILLO
  // =========================
  if (tipoPuesto === 'sencillo') {
    depthToken = depthMm === 600 ? '060' : depthMm === 750 ? '075' : null;

    if (!depthToken) {
      return {
        logicalCode: null,
        codigoPT: null,
        modelSrc: null,
        exists: false,
      };
    }

    const formasConLado = ['TEK', 'ORTOGONAL', 'CURVO', 'TRAP'];

    if (formasConLado.includes(forma)) {
      const ladoToken = lado === 'der' ? 'DER' : 'IZQ';
      logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${forma}_${ladoToken}`;
    } else {
      logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${forma}`;
    }
  }

  // =========================
  // DOBLE
  // =========================
  if (tipoPuesto === 'doble') {
    depthToken = depthMm === 1200 ? '120' : depthMm === 1500 ? '150' : null;

    if (!depthToken) {
      return {
        logicalCode: null,
        codigoPT: null,
        modelSrc: null,
        exists: false,
      };
    }

    logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${forma}`;
  }

  const found = logicalCode ? KONCISA_COSTADO_RULES[logicalCode] || null : null;

  return {
    logicalCode,
    codigoPT: found?.codigoPT || null,
    modelSrc: found?.modelSrc || null,
    exists: !!found,
  };
}
