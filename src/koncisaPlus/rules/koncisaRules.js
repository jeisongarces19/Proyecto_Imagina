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

  if (tipoPuesto === 'doble') {
    for (let i = 0; i < puestos; i++) {
      const baseX = i * largoRealMm;

      if (i === 0) {
        out.push({
          tipo: 'terminal',
          lado: 'izq',
          forma: tipoCostado,
          tipoPuesto,
          depthMm: anchoRealMm,
          x: baseX - largoRealMm / 2 + offsetXIzq,
          y: 0,
          z: 0,
        });
      }

      if (i > 0) {
        out.push({
          tipo: 'intermedio',
          lado: 'center',
          forma: tipoCostado,
          tipoPuesto,
          depthMm: anchoRealMm,
          x: baseX - largoRealMm / 2,
          y: 0,
          z: 0,
        });
      }

      if (i === puestos - 1) {
        out.push({
          tipo: 'terminal',
          lado: 'der',
          forma: tipoCostado,
          tipoPuesto,
          depthMm: anchoRealMm,
          x: baseX + largoRealMm / 2 + offsetXDer,
          y: 0,
          z: 0,
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
export function getGrommetsConfig({ puestos, tipoPuesto, largoRealMm, anchoRealMm }) {
  const out = [];

  for (let i = 0; i < puestos; i++) {
    const baseX = i * largoRealMm;

    if (tipoPuesto === 'sencillo') {
      out.push({
        index: i,
        diameterMm: 80,
        x: baseX,
        y: 735,
        z: 0,
        rotY: 0,
      });
    }

    if (tipoPuesto === 'doble') {
      out.push({
        index: `${i}_front`,
        diameterMm: 80,
        x: baseX,
        y: 735,
        z: -300,
        rotY: 0,
      });

      out.push({
        index: `${i}_back`,
        diameterMm: 80,
        x: baseX,
        y: 735,
        z: 300,
        rotY: Math.PI,
      });
    }
  }

  return out;
}

// ==============================
// PASACABLE
// ==============================
export function getPasacablesConfig({
  puestos,
  tipoPuesto,
  largoRealMm,
  anchoRealMm,
  position = 'CENTER',
}) {
  const out = [];

  for (let i = 0; i < puestos; i++) {
    const baseX = i * largoRealMm;

    if (tipoPuesto === 'sencillo') {
      let z = 0;
      if (position === 'LEFT') z = -300;
      if (position === 'RIGHT') z = 300;

      out.push({
        index: i,
        x: baseX,
        y: 735,
        z,
        rotY: 0,
      });
    }

    if (tipoPuesto === 'doble') {
      switch (position) {
        case 'CENTER':
          out.push({ index: `${i}_f`, x: baseX, y: 735, z: -300, rotY: 0 });
          out.push({ index: `${i}_b`, x: baseX, y: 735, z: 300, rotY: Math.PI });
          break;

        case 'LEFT_RIGHT':
          out.push({ index: `${i}_l`, x: baseX, y: 735, z: -300, rotY: 0 });
          out.push({ index: `${i}_r`, x: baseX, y: 735, z: 300, rotY: Math.PI });
          break;

        case 'LEFT_LEFT':
          out.push({ index: `${i}_l1`, x: baseX, y: 735, z: -300, rotY: 0 });
          out.push({ index: `${i}_l2`, x: baseX, y: 735, z: -300, rotY: Math.PI });
          break;

        case 'RIGHT_RIGHT':
          out.push({ index: `${i}_r1`, x: baseX, y: 735, z: 300, rotY: 0 });
          out.push({ index: `${i}_r2`, x: baseX, y: 735, z: 300, rotY: Math.PI });
          break;

        default:
          out.push({ index: `${i}_f`, x: baseX, y: 735, z: -300, rotY: 0 });
          out.push({ index: `${i}_b`, x: baseX, y: 735, z: 300, rotY: Math.PI });
          break;
      }
    }
  }

  return out;
}

// ==============================
// VIGAS
// ==============================
export function getVigasConfig({ puestos, tipoPuesto, largoRealMm }) {
  const out = [];

  for (let i = 0; i < puestos; i++) {
    const baseX = i * largoRealMm;

    if (tipoPuesto === 'sencillo') {
      out.push({
        nominalWidthMm: largoRealMm,
        x: baseX,
        y: 650,
        z: 0,
      });
    }

    if (tipoPuesto === 'doble') {
      out.push({
        nominalWidthMm: largoRealMm,
        x: baseX,
        y: 650,
        z: -200,
      });

      out.push({
        nominalWidthMm: largoRealMm,
        x: baseX,
        y: 650,
        z: 200,
      });
    }
  }

  return out;
}

// ==============================
// DUCTOS
// ==============================
export function getDuctosConfig({
  puestos,
  tipoPuesto,
  largoRealMm,
  anchoRealMm,
  hasDuct = true,
  ductModes = [],
}) {
  const out = [];
  if (!hasDuct) return out;

  for (let i = 0; i < puestos; i++) {
    const baseX = i * largoRealMm;
    const ductMode = ductModes[i] || 'TERMINAL';

    const tipoModulo = (ductModes[i] || 'TERMINAL').toLowerCase();

    let ductLengthMm = largoRealMm;

    if (tipoModulo === 'terminal') {
      ductLengthMm = largoRealMm - 313.5;
    } else if (tipoModulo === 'intermedio') {
      ductLengthMm = largoRealMm - 313.5; // 👈 CAMBIAR cuando me digas el valor real
    } else if (tipoModulo === 'individual') {
      ductLengthMm = largoRealMm - 313.5; // 👈 o el valor que aplique
    }

    // Inicio del módulo
    const moduleStartX = baseX - largoRealMm / 2;

    // Centro del ducto, arrancando desde el inicio
    const ductCenterX = moduleStartX + ductLengthMm / 2;

    out.push({
      tipoPuesto,
      tipoModulo: ductMode.toLowerCase(), // terminal | intermedio | individual
      nominalWidthMm: largoRealMm,
      x: ductCenterX, //baseX,
      y: 620,
      z: 0,
    });
  }
  //console.log('DUCTOS CONFIG', out);
  return out;
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
