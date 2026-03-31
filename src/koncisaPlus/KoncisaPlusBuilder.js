import {
  getCostadosConfig,
  getSuperficiesConfig,
  getPantallasConfig,
  getGrommetsConfig,
  getVigasConfig,
  getDuctosConfig,
  getPedestalesConfig,
  getPasacablesConfig,
} from './rules/koncisaRules';

import { createCostado } from './parts/costados';
import { createSuperficie } from './parts/superficies';
import { createPantalla } from './parts/pantallas';
import { createGrommet } from './parts/grommets';
import { createViga } from './parts/vigas';
import { createDucto } from './parts/ductos';
import { createPedestal } from './parts/pedestales';
import { createPasacable } from './parts/pasacables';

export function buildKoncisaPlus(config = {}) {
  const {
    puestos = 1,
    tipoPuesto = 'sencillo',

    // medidas reales
    largoRealMm = 1200,
    anchoRealMm = 600,

    // medidas de cobro / código
    largoCobroMm = 1200,
    anchoCobroMm = 600,

    tipoPasoCable = 'none',
    hasDuct = true,
    includePedestal = false,

    // superficie
    finishCode = '22008689',
    thickMm = 25,
    variant = '',
  } = config;

  const parts = [];

  // ========================
  // COSTADOS
  // ========================
  const costados = getCostadosConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
  });

  costados.forEach((c) => {
    parts.push(
      createCostado({
        tipo: c.tipo,
        variante: c.variante || 'base',
        widthMm: c.widthMm,
        depthMm: c.depthMm,
        heightMm: c.heightMm,
        x: c.x,
        y: c.y ?? 0,
        z: c.z ?? 0,
      })
    );
  });

  // ========================
  // SUPERFICIES
  // ========================
  const superficies = getSuperficiesConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
    largoCobroMm,
    anchoCobroMm,
    thickMm,
    finishCode,
    variant,
  });

  superficies.forEach((s) => {
    parts.push(
      createSuperficie({
        // medidas reales
        widthMm: s.widthMm,
        depthMm: s.depthMm,

        // medidas de cobro
        billingWidthMm: s.billingWidthMm,
        billingDepthMm: s.billingDepthMm,

        thickMm: s.thickMm,
        shape: s.shape || 'RECT',
        finishCode: s.finishCode,
        variant: s.variant,

        perforada: s.perforada ?? false,
        canto: s.canto || 'PVC-2MM',

        x: s.x,
        y: s.y ?? 720,
        z: s.z ?? 0,
        index: s.index,
      })
    );
  });

  // ========================
  // PANTALLAS
  // ========================
  const pantallas = getPantallasConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
  });

  pantallas.forEach((p) => {
    parts.push(
      createPantalla({
        tipo: p.tipo,
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        thickMm: p.thickMm,
        x: p.x,
        y: p.y ?? 750,
        z: p.z ?? 0,
      })
    );
  });

  // ========================
  // GROMMETS / PASACABLES
  // ========================
  if (tipoPasoCable === 'grommet') {
    const grommets = getGrommetsConfig({
      puestos,
      tipoPuesto,
      largoRealMm,
      anchoRealMm,
    });

    grommets.forEach((g) => {
      parts.push(
        createGrommet({
          diameterMm: g.diameterMm || 80,
          x: g.x,
          y: g.y ?? 735,
          z: g.z ?? 0,
        })
      );
    });
  }

  if (tipoPasoCable === 'pasacable') {
    const pasacables = getPasacablesConfig({
      puestos,
      tipoPuesto,
      largoRealMm,
      anchoRealMm,
    });

    pasacables.forEach((p) => {
      parts.push(
        createPasacable({
          diameterMm: p.diameterMm || 50,
          x: p.x,
          y: p.y ?? 735,
          z: p.z ?? 0,
        })
      );
    });
  }

  // ========================
  // VIGAS
  // ========================
  const vigas = getVigasConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
  });

  vigas.forEach((v) => {
    parts.push(
      createViga({
        widthMm: v.widthMm,
        heightMm: v.heightMm,
        depthMm: v.depthMm,
        x: v.x,
        y: v.y ?? 650,
        z: v.z ?? 0,
      })
    );
  });

  // ========================
  // DUCTOS
  // ========================
  const ductos = getDuctosConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
    hasDuct,
  });

  ductos.forEach((d) => {
    parts.push(
      createDucto({
        tipo: d.tipo || 'individual',
        widthMm: d.widthMm ?? d.lengthMm ?? largoRealMm,
        heightMm: d.heightMm,
        depthMm: d.depthMm,
        x: d.x ?? 0,
        y: d.y ?? 620,
        z: d.z ?? 0,
      })
    );
  });

  // ========================
  // PEDESTALES
  // ========================
  const pedestales = getPedestalesConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    includePedestal,
  });

  pedestales.forEach((p) => {
    parts.push(
      createPedestal({
        cajones: p.cajones || 2,
        widthMm: p.widthMm,
        depthMm: p.depthMm,
        heightMm: p.heightMm,
        x: p.x,
        y: p.y ?? 0,
        z: p.z ?? 0,
      })
    );
  });

  return parts;
}
