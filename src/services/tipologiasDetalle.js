// src/services/tipologiasDetalle.js
let cache = null;

export async function loadTipologiasDetalle() {
  if (cache) return cache;

  const res = await fetch('/assets/data/tipologias/tipologias-detalle.json');
  if (!res.ok) throw new Error('No se pudo cargar tipologias-detalle.json');

  const arr = await res.json();
  const map = new Map();

  for (const t of arr || []) {
    if (t?.codigo) map.set(String(t.codigo), t);
  }

  cache = map;
  return map;
}

export async function getTipologiaDetalle(codigo) {
  const map = await loadTipologiasDetalle();
  return map.get(String(codigo)) || null;
}
