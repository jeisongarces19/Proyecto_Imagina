// src/koncisaPlus/rules/koncisaRules.js

// ==============================
// COSTADOS
// ==============================
export function getCostadosConfig({
  puestos,
  tipoPuesto,
  tipoCostado = 'RECT',
  largoRealMm,
  anchoRealMm,
}) {
  const out = [];

  const offsetXIzq = 0;
  const offsetXDer = 0;

  const offsetZIzq = 300;
  const offsetZDer = -300;
  const offsetZIntermedio = 0;

  if (tipoPuesto === 'sencillo') {
    for (let i = 0; i < puestos; i++) {
      const baseX = i * largoRealMm;

      // Solo el primero lleva terminal izquierdo
      if (i === 0) {
        out.push({
          tipo: 'terminal',
          lado: 'izq',
          forma: tipoCostado,
          tipoPuesto,
          depthMm: anchoRealMm,
          x: baseX - largoRealMm / 2 + offsetXIzq,
          y: 0,
          z: offsetZIzq,
        });
      }

      // Desde el segundo puesto en adelante, va un intermedio
      if (i > 0) {
        out.push({
          tipo: 'intermedio',
          lado: 'center',
          forma: tipoCostado,
          tipoPuesto,
          depthMm: anchoRealMm,
          x: baseX - largoRealMm / 2,
          y: 0,
          z: offsetZIntermedio,
        });
      }

      // Solo el último lleva terminal derecho
      if (i === puestos - 1) {
        out.push({
          tipo: 'terminal',
          lado: 'der',
          forma: tipoCostado,
          tipoPuesto,
          depthMm: anchoRealMm,
          x: baseX + largoRealMm / 2 + offsetXDer,
          y: 0,
          z: offsetZDer,
        });
      }
    }
  }

  return out;
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
    //x: i * largoRealMm + largoRealMm / 2,
    x: i * largoRealMm,
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
    //x: i * largoRealMm + largoRealMm / 2,
    x: i * largoRealMm,
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
