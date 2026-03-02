// src/rules/surfaceRules.js

/**
 * Reglas "a techo" por línea.
 * Cada regla define el "máximo permitido" (w,d,t) en mm, y el codigoPT comercial real (NUMÉRICO).
 *
 * Criterio "a techo":
 * - Pides (w,d,t)
 * - Te asigna el primer item cuyo max.w >= w AND max.d >= d AND max.t >= t
 * - Si no hay ninguno, retorna el más grande (último) como fallback.
 *
 * IMPORTANTE: Ordena cada array de menor a mayor para que “a techo” tenga sentido.
 */
export const SURFACE_RULES = {
  'LINK.SYS': [
    { max: { w: 1200, d: 600, t: 30 }, codigoPT: '22000008989' },
    { max: { w: 1500, d: 600, t: 25 }, codigoPT: '22000009010' },
    { max: { w: 1800, d: 600, t: 25 }, codigoPT: '22000009020' },
  ],
  'KONCISA.PLUS': [
    { max: { w: 1200, d: 600, t: 25 }, codigoPT: '33000001001' },
    { max: { w: 1500, d: 600, t: 25 }, codigoPT: '33000001002' },
  ],
};

/**
 * Resolver simple para UI/modal: devuelve codigoPT (string) o null.
 */
export function resolveSurfaceCodigoPT({ line, widthMm, depthMm, thickMm }) {
  const rules = SURFACE_RULES[line];
  if (!rules?.length) return null;

  const w = Number(widthMm);
  const d = Number(depthMm);
  const t = Number(thickMm);
  if (!Number.isFinite(w) || !Number.isFinite(d) || !Number.isFinite(t)) return null;

  const hit = rules.find((r) => r.max.w >= w && r.max.d >= d && r.max.t >= t);

  // Si no hay regla que cubra las medidas pedidas, NO inventes ni “fuerces” un código.
  // Retorna null para que la UI/Canvas NO cree la superficie.
  return hit?.codigoPT || null;
}
