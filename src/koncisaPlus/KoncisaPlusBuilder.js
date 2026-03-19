import {
  getCostadosConfig,
  getSuperficiesConfig,
  getPantallasConfig,
  getGrommetsConfig,
  getVigasConfig,
  getDuctosConfig,
  getPedestalesConfig,
} from './rules/koncisaRules';

import { createCostado } from './parts/costados';
import { createSuperficie } from './parts/superficies';
import { createPantalla } from './parts/pantallas';
import { createGrommet } from './parts/grommets';
import { createViga } from './parts/vigas';
import { createDucto } from './parts/ductos';
import { createPedestal } from './parts/pedestales';

export function buildKoncisaPlus(config) {
  const {
    puestos = 1,
    widthMm = 1200,
    depthMm = 600,
    hasGrommet = true,
    hasDuct = true,
    includePedestal = false,
  } = config;

  const parts = [];

  // ========================
  // COSTADOS
  // ========================
  const costados = getCostadosConfig({ puestos });

  costados.forEach((c) => {
    parts.push(
      createCostado({
        tipo: c.tipo,
        x: c.index * widthMm,
      })
    );
  });

  // ========================
  // SUPERFICIES
  // ========================
  const superficies = getSuperficiesConfig({ puestos, widthMm });

  superficies.forEach((s) => {
    parts.push(
      createSuperficie({
        widthMm: s.widthMm,
        x: s.index * widthMm,
      })
    );
  });

  // ========================
  // PANTALLAS
  // ========================
  const pantallas = getPantallasConfig({ puestos, widthMm });

  pantallas.forEach((p) => {
    parts.push(
      createPantalla({
        widthMm: p.widthMm,
        x: p.index * widthMm,
      })
    );
  });

  // ========================
  // GROMMETS
  // ========================
  const grommets = getGrommetsConfig({ puestos, hasGrommet });

  grommets.forEach((g) => {
    parts.push(
      createGrommet({
        x: g.index * widthMm + widthMm / 2,
      })
    );
  });

  // ========================
  // VIGAS
  // ========================
  const vigas = getVigasConfig({ puestos, widthMm });

  vigas.forEach((v) => {
    parts.push(
      createViga({
        widthMm: v.widthMm,
        x: v.index * widthMm,
      })
    );
  });

  // ========================
  // DUCTOS
  // ========================
  const ductos = getDuctosConfig({ puestos, widthMm, hasDuct });

  ductos.forEach((d) => {
    parts.push(
      createDucto({
        widthMm: d.lengthMm,
      })
    );
  });

  // ========================
  // PEDESTALES
  // ========================
  const pedestales = getPedestalesConfig({ puestos, includePedestal });

  pedestales.forEach((p) => {
    parts.push(
      createPedestal({
        x: p.index * widthMm + 100,
      })
    );
  });

  return parts;
}
