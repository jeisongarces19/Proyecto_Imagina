// src/koncisaPlus/rules/koncisaRules.js

// ==============================
// COSTADOS
// ==============================
export function getCostadosConfig({ puestos }) {
  if (puestos <= 0) return [];

  const result = [];

  // terminal izquierdo
  result.push({ tipo: 'terminal', index: 0 });

  if (puestos > 1) {
    for (let i = 1; i < puestos; i++) {
      result.push({ tipo: 'intermedio', index: i });
    }
  }

  // terminal derecho
  result.push({ tipo: 'terminal', index: puestos });

  return result;
}

// ==============================
// SUPERFICIES
// ==============================
export function getSuperficiesConfig({ puestos, widthMm }) {
  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
    widthMm,
  }));
}

// ==============================
// PANTALLAS
// ==============================
export function getPantallasConfig({ puestos, widthMm }) {
  return Array.from({ length: puestos }).map((_, i) => ({
    tipo: 'frontal',
    index: i,
    widthMm,
  }));
}

// ==============================
// GROMMETS
// ==============================
export function getGrommetsConfig({ puestos, hasGrommet }) {
  if (!hasGrommet) return [];

  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
  }));
}

// ==============================
// VIGAS
// ==============================
export function getVigasConfig({ puestos, widthMm }) {
  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
    widthMm,
  }));
}

// ==============================
// DUCTOS
// ==============================
export function getDuctosConfig({ puestos, widthMm, hasDuct }) {
  if (!hasDuct) return [];

  return [
    {
      tipo: 'principal',
      lengthMm: puestos * widthMm,
    },
  ];
}

// ==============================
// PEDESTALES / CAJONERAS
// ==============================
export function getPedestalesConfig({ puestos, includePedestal }) {
  if (!includePedestal) return [];

  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
  }));
}
