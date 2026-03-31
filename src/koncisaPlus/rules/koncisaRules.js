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
export function getSuperficiesConfig({
  puestos,
  tipoPuesto,
  largoRealMm,
  anchoRealMm,
  largoCobroMm,
  anchoCobroMm,
  thickMm,
  finishCode,
  variant,
}) {
  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
    widthMm: largoRealMm,
    depthMm: anchoRealMm,
    billingWidthMm: largoCobroMm,
    billingDepthMm: anchoCobroMm,
    thickMm,
    finishCode,
    variant,
    x: i * largoRealMm,
    y: 720,
    z: 0,
    shape: 'RECT',
    perforada: false,
    canto: 'PVC-2MM',
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
export function getGrommetsConfig({ puestos, largoRealMm }) {
  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
    diameterMm: 80,
    x: i * largoRealMm + largoRealMm / 2,
    y: 735,
    z: 0,
  }));
}

// ==============================
// PASACABLE
// ==============================
export function getPasacablesConfig({ puestos, largoRealMm }) {
  return Array.from({ length: puestos }).map((_, i) => ({
    index: i,
    diameterMm: 50,
    x: i * largoRealMm + largoRealMm / 2,
    y: 735,
    z: 0,
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
