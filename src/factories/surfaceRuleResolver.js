// src/factories/surfaceRuleResolver.js
import { SURFACE_RULES } from '../rules/surfaceRules';

export function resolveSurfaceCodigoPT({ line, widthMm, depthMm, thickMm }) {
  const rules = SURFACE_RULES[line];
  if (!rules?.length) return null;

  const hit = rules.find((r) => {
    const m = r.max;
    return m.w >= widthMm && m.d >= depthMm && m.t >= thickMm;
  });

  if (hit) return hit.codigoPT;

  // fallback a techo: el más grande
  return rules[rules.length - 1].codigoPT;
}
