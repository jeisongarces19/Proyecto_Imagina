// src/koncisaPlus/rules/koncisaDuctoRules.js

export const KONCISA_DUCTO_RULES = {
  // =========================
  // SENCILLO - base general
  // =========================
  KONPLUSSCABLEDUCT: {
    codigoPT: '22000132403',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - INTERMEDIO
  // =========================
  KONPLUSSCABLEDUCTINT100: {
    codigoPT: '22000132411',
    modelSrc: null,
  },
  KONPLUSSCABLEDUCTINT120: {
    codigoPT: '22000132412',
    modelSrc: '/assets/models/koncisaPlus/2KSO332000_120.glb',
  },
  KONPLUSSCABLEDUCTINT150: {
    codigoPT: '22000132413',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - TERMINAL
  // =========================
  KONPLUSSCABLEDUCTTER100: {
    codigoPT: '22000132400',
    modelSrc: null,
  },
  KONPLUSSCABLEDUCTTER120: {
    codigoPT: '22000132401',
    modelSrc: '/assets/models/koncisaPlus/2KSO349000_120_IZQ.glb',
  },
  KONPLUSSCABLEDUCTTER150: {
    codigoPT: '22000132402',
    modelSrc: null,
  },

  // =========================
  // DOBLE - base general
  // =========================
  KONPLUSSCABLEDUCTDOUBLE: {
    codigoPT: '22000132829',
    modelSrc: null,
  },

  // =========================
  // DOBLE - INTERMEDIO
  // =========================
  KONPLUSSCABLEDUCTDOUBLEINT100: {
    codigoPT: '22000132408',
    modelSrc: null,
  },
  KONPLUSSCABLEDUCTDOUBLEINT120: {
    codigoPT: '22000132409',
    modelSrc: null,
  },
  KONPLUSSCABLEDUCTDOUBLEINT150: {
    codigoPT: '22000132410',
    modelSrc: null,
  },

  // =========================
  // DOBLE - TERMINAL
  // =========================
  KONPLUSSCABLEDUCTDOUBLETER100: {
    codigoPT: '22000132830',
    modelSrc: null,
  },
  KONPLUSSCABLEDUCTDOUBLETER120: {
    codigoPT: '22000132831',
    modelSrc: '/assets/models/koncisaPlus/2KSO349000_120_IZQ.glb',
  },
  KONPLUSSCABLEDUCTDOUBLETER150: {
    codigoPT: '22000132832',
    modelSrc: null,
  },
};

function nominalTokenFromWidth(nominalWidthMm) {
  if (nominalWidthMm === 1000) return '100';
  if (nominalWidthMm === 1200) return '120';
  if (nominalWidthMm === 1500) return '150';
  return null;
}

export function resolveKoncisaDucto({
  tipoPuesto = 'sencillo',
  tipoModulo = 'terminal', // terminal | intermedio | individual
  nominalWidthMm = 1200,
}) {
  const token =
    nominalWidthMm === 1000
      ? '100'
      : nominalWidthMm === 1200
        ? '120'
        : nominalWidthMm === 1500
          ? '150'
          : null;

  if (!token) {
    return {
      logicalCode: null,
      codigoPT: null,
      modelSrc: null,
      exists: false,
    };
  }

  let logicalCode = null;

  if (tipoPuesto === 'sencillo') {
    if (tipoModulo === 'individual') {
      logicalCode = 'KONPLUSSCABLEDUCT';
    } else if (tipoModulo === 'intermedio') {
      logicalCode = `KONPLUSSCABLEDUCTINT${token}`;
    } else {
      logicalCode = `KONPLUSSCABLEDUCTTER${token}`;
    }
  }

  if (tipoPuesto === 'doble') {
    if (tipoModulo === 'individual') {
      logicalCode = 'KONPLUSSCABLEDUCTDOUBLE';
    } else if (tipoModulo === 'intermedio') {
      logicalCode = `KONPLUSSCABLEDUCTDOUBLEINT${token}`;
    } else {
      logicalCode = `KONPLUSSCABLEDUCTDOUBLETER${token}`;
    }
  }

  const found = logicalCode ? KONCISA_DUCTO_RULES[logicalCode] || null : null;

  return {
    logicalCode,
    codigoPT: found?.codigoPT || null,
    modelSrc: found?.modelSrc || null,
    exists: !!found,
  };
}
