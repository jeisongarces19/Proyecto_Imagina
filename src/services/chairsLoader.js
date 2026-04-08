// src/services/chairsLoader.js

const cacheByList = new Map();
let cacheCategoryMap = null;
let cacheCategoriasSillas = null;

function normalizeList(list) {
  return String(list || 'CO')
    .trim()
    .toUpperCase();
}

function resolvePriceListFile(list) {
  const key = normalizeList(list);

  if (key === 'EC' || key === 'ECUADOR' || key === 'EUC') {
    return '/data/xml/Pricelist_EUC_2.xml';
  }

  if (
    key === 'USD' ||
    key === 'DIST' ||
    key === 'DISTRIBUIDORES' ||
    key === 'DISTRIBUIDOR' ||
    key === 'SUR_AMERICA'
  ) {
    return '/data/xml/PriceList_USD_2.xml';
  }

  return '/data/xml/PriceList_CO_2.xml';
}

function parsePrice(raw) {
  const cleaned = (raw || '').replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

// Carga categorias_sillas.json (lista de categorías de sillas)
export async function loadCategoriasSillas() {
  if (cacheCategoriasSillas) return cacheCategoriasSillas;

  try {
    const res = await fetch('/assets/models/Sillas/categorias_sillas.json');
    if (!res.ok) throw new Error('No se pudo cargar categorias_sillas.json');
    const raw = await res.json();
    // El JSON puede ser { value: [...], Count: N } o un array directo
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.value) ? raw.value : []);
    cacheCategoriasSillas = arr;
    return cacheCategoriasSillas;
  } catch (err) {
    console.error('[loadCategoriasSillas] Error:', err);
    cacheCategoriasSillas = [];
    return [];
  }
}

// Carga el mapa de producto_codigo → categoria (2do nivel del slug)
// Sólo incluye entradas cuyo slug comienza con "SILLAS Y MESAS"
export async function loadChairsCategoryMap() {
  if (cacheCategoryMap) return cacheCategoryMap;

  try {
    const res = await fetch('/assets/data/tipologias/precios-detalle_filtrados.json');
    if (!res.ok) throw new Error('No se pudo cargar precios-detalle_filtrados.json');

    const arr = await res.json();
    const map = new Map();

    for (const entry of arr || []) {
      const codigo = String(entry?.producto_codigo || '').trim();
      const slug = String(entry?.categoria_slug || '').trim();

      if (!codigo || !slug.startsWith('SILLAS Y MESAS')) continue;
      if (map.has(codigo)) continue; // ya tiene categoría registrada (tomamos la primera)

      // Extraer el nivel 2: "SILLAS Y MESAS.SILLAS DE COLECTIVIDAD INTERIORES.OFIPARTES" → "SILLAS DE COLECTIVIDAD INTERIORES"
      const parts = slug.split('.');
      const nivel2 = parts[1]?.trim() || '';
      const nivel3 = parts[2]?.trim() || '';
      const categoriaId = entry?.categoria?.padre_id || entry?.categoria?.id || null;

      map.set(codigo, {
        slug,
        nivel2,      // nombre de la categoría principal (para filtro)
        nivel3,      // sub-categoría (ej: OFIPARTES)
        categoriaId,
      });
    }

    cacheCategoryMap = map;
    return map;
  } catch (err) {
    console.error('[loadChairsCategoryMap] Error:', err);
    cacheCategoryMap = new Map();
    return cacheCategoryMap;
  }
}

export async function loadChairsPriceList(list = 'CO') {
  const key = normalizeList(list);

  if (cacheByList.has(key)) {
    return cacheByList.get(key);
  }

  const file = resolvePriceListFile(list);

  try {
    const res = await fetch(file);
    if (!res.ok) {
      throw new Error(`No se pudo cargar ${file}`);
    }

    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/xml');

    const items = Array.from(doc.querySelectorAll('Articulo'));
    const map = new Map();

    for (const it of items) {
      const codigoElement = it.querySelector('Codigo');
      const codigo = codigoElement?.textContent?.trim();

      if (!codigo) continue;

      const descripcion = it.querySelector('Descripcion')?.textContent?.trim() || '';
      const precioText = it.querySelector('Precio')?.textContent?.trim() || '0';
      const precio = parsePrice(precioText);
      const udm = it.querySelector('UDM')?.textContent?.trim() || 'und';

      map.set(String(codigo), {
        codigo: String(codigo),
        descripcion,
        precio,
        udm,
      });
    }

    cacheByList.set(key, map);
    return map;
  } catch (err) {
    console.error('[loadChairsPriceList] Error:', err);
    throw err;
  }
}

export async function getChairDetail(codigo, list = 'CO') {
  const map = await loadChairsPriceList(list);
  return map.get(String(codigo)) || null;
}
