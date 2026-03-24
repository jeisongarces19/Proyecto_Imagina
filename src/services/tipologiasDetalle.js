// src/services/tipologiasDetalle.js

const cacheByList = new Map();

function normalizeList(list) {
  return String(list || 'CO')
    .trim()
    .toUpperCase();
}

function resolveTipologiasFile(list) {
  const key = normalizeList(list);

  //print('nomeda', key);
  console.log('[resolveTipologiasFile] list recibido:', list);
  console.log('[resolveTipologiasFile] key normalizado:', key);

  if (key === 'EC' || key === 'ECUADOR' || key === 'EUC') {
    return '/assets/data/tipologias/tipologias-detalle-Ecuador.json';
  }

  if (
    key === 'USD' ||
    key === 'DIST' ||
    key === 'DISTRIBUIDORES' ||
    key === 'DISTRIBUIDOR' ||
    key === 'SUR_AMERICA'
  ) {
    return '/assets/data/tipologias/tipologias-detalle-Distribuidores.json';
  }

  return '/assets/data/tipologias/tipologias-detalle-Colombia.json';
}

export async function loadTipologiasDetalle(list = 'CO') {
  const key = normalizeList(list);

  if (cacheByList.has(key)) {
    return cacheByList.get(key);
  }

  const file = resolveTipologiasFile(key);
  const res = await fetch(file);

  if (!res.ok) {
    throw new Error(`No se pudo cargar ${file}`);
  }

  const arr = await res.json();
  const map = new Map();

  for (const t of arr || []) {
    if (t?.codigo) {
      map.set(String(t.codigo), t);
    }
  }

  cacheByList.set(key, map);
  return map;
}

export async function getTipologiaDetalle(codigo, list = 'CO') {
  const map = await loadTipologiasDetalle(list);
  return map.get(String(codigo)) || null;
}
