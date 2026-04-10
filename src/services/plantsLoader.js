// src/services/plantsLoader.js
// Lee plantas desde /assets/models/Plants and Flowers/plantas.json
// Opcionalmente busca precio en XML si el nombre coincide con un código

const cacheByList = new Map();
let cachePlantsItems = null;

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

async function loadPriceListMap(list = 'CO') {
  const key = normalizeList(list);

  if (cacheByList.has(key)) {
    return cacheByList.get(key);
  }

  const file = resolvePriceListFile(list);

  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`No se pudo cargar ${file}`);

    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/xml');

    const items = Array.from(doc.querySelectorAll('Articulo'));
    const map = new Map();

    for (const it of items) {
      const codigo = it.querySelector('Codigo')?.textContent?.trim();
      if (!codigo) continue;

      const descripcion = it.querySelector('Descripcion')?.textContent?.trim() || '';
      const precioText = it.querySelector('Precio')?.textContent?.trim() || '0';
      const precio = parsePrice(precioText);
      const udm = it.querySelector('UDM')?.textContent?.trim() || 'und';

      map.set(String(codigo), { codigo: String(codigo), descripcion, precio, udm });
    }

    cacheByList.set(key, map);
    return map;
  } catch (err) {
    console.error('[loadPriceListMap] Error:', err);
    return new Map();
  }
}

// Devuelve la lista de plantas desde plantas.json + precios del XML si existen
export async function loadPlantsItems(list = 'CO') {
  if (cachePlantsItems) return cachePlantsItems;

  try {
    // 1) Cargar lista de plantas desde plants.json
    const res = await fetch('/assets/models/Plants and Flowers/plantas.json');
    if (!res.ok) throw new Error('No se pudo cargar plantas.json');
    const plantsData = await res.json();
    const plantsArray = Array.isArray(plantsData) ? plantsData : [];

    // 2) Cargar precios del XML
    const priceMap = await loadPriceListMap(list);

    // 3) Mapear plantas con precios si existen
    const items = plantsArray.map((plant) => {
      const name = String(plant.name).trim();
      const det = priceMap.get(name);

      return {
        name,
        codigo: det?.codigo || null,
        descripcion: det?.descripcion || name,
        precio: det?.precio || 0,
        udm: det?.udm || 'und',
        found: !!det,
      };
    });

    cachePlantsItems = items;
    return items;
  } catch (err) {
    console.error('[loadPlantsItems] Error:', err);
    cachePlantsItems = [];
    return [];
  }
}

export async function getPlantDetail(plantName, list = 'CO') {
  try {
    const all = await loadPlantsItems(list);
    const found = all.find((p) => p.name === String(plantName).trim());
    return found || null;
  } catch (err) {
    console.error('[getPlantDetail] Error:', err);
    return null;
  }
}
