// src/factories/surfaceSkuResolver.js

function scoreCeil(candidate, req) {
  // mientras más cerca “por encima”, mejor
  const dw = candidate.widthMM - req.widthMM;
  const dd = candidate.depthMM - req.depthMM;
  const dt = candidate.thicknessMM - req.thicknessMM;
  return dw * 1000000 + dd * 1000 + dt;
  // peso fuerte al ancho, luego fondo, luego espesor (ajustable)
}

/**
 * Regla 2: “a techo” en ancho + fondo + espesor
 * - filtro por línea (obligatorio)
 * - techo: candidate >= req en cada dimensión
 * - elegir el que minimiza el “exceso” (scoreCeil)
 * - fallback: si no hay techo, el más cercano “por arriba” parcial o el más grande (según política)
 */
export function resolveSurfaceCodigoPTCeil(req, surfaceSkus, opts = {}) {
  const {
    allowDepthMismatch = false, // por si alguna línea no tiene el fondo exacto
    allowThicknessMismatch = false,
    fallback = 'largest', // 'largest' | 'nearest' (si no hay techo perfecto)
  } = opts;

  const { line, widthMM, depthMM, thicknessMM } = req;

  // 1) filtrar por línea
  const byLine = surfaceSkus.filter((s) => s.line === line);
  if (!byLine.length) return null;

  // 2) candidatos techo estrictos
  let candidates = byLine.filter(
    (s) => s.widthMM >= widthMM && s.depthMM >= depthMM && s.thicknessMM >= thicknessMM
  );

  // 3) si no hay, permitir relajar reglas (opcional)
  if (!candidates.length && allowDepthMismatch) {
    candidates = byLine.filter((s) => s.widthMM >= widthMM && s.thicknessMM >= thicknessMM);
  }

  if (!candidates.length && allowThicknessMismatch) {
    candidates = byLine.filter((s) => s.widthMM >= widthMM && s.depthMM >= depthMM);
  }

  // 4) si hay candidatos, elige el mejor (mínimo exceso)
  if (candidates.length) {
    candidates.sort((a, b) => scoreCeil(a, req) - scoreCeil(b, req));
    return candidates[0].codigoPT;
  }

  // 5) fallback si no hay techo
  if (fallback === 'largest') {
    // el más grande de la línea (para garantizar facturación)
    const sorted = [...byLine].sort((a, b) => {
      const va = a.widthMM * 1e6 + a.depthMM * 1e3 + a.thicknessMM;
      const vb = b.widthMM * 1e6 + b.depthMM * 1e3 + b.thicknessMM;
      return vb - va;
    });
    return sorted[0].codigoPT;
  }

  // fallback === 'nearest' (más cercano en distancia euclidiana)
  const nearest = [...byLine].sort((a, b) => {
    const da =
      (a.widthMM - widthMM) ** 2 + (a.depthMM - depthMM) ** 2 + (a.thicknessMM - thicknessMM) ** 2;
    const db =
      (b.widthMM - widthMM) ** 2 + (b.depthMM - depthMM) ** 2 + (b.thicknessMM - thicknessMM) ** 2;
    return da - db;
  });

  return nearest[0]?.codigoPT || null;
}
