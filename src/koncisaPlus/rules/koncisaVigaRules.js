// src/koncisaPlus/rules/koncisaVigaRules.js

export const KONCISA_VIGA_RULES = {
  1000: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_020_100',
    codigoPT: '22000132414',
  },
  1200: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_020_120',
    codigoPT: '22000132415',
  },
  1500: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_020_150',
    codigoPT: '22000132416',
  },
};

export function resolveKoncisaViga({ nominalWidthMm }) {
  const found = KONCISA_VIGA_RULES[nominalWidthMm] || null;

  return {
    logicalCode: found?.logicalCode || null,
    codigoPT: found?.codigoPT || null,
    exists: !!found,
  };
}
