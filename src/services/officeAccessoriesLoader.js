// src/services/officeAccessoriesLoader.js
// Lee accesorios de oficina desde /assets/models/Office Accesories/officeAccessories.json
// Opcionalmente busca precio en XML si el nombre coincide con un código

const cacheByList = new Map();
let cacheOfficeAccessoriesItems = null;

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

// Devuelve la lista de accesorios de oficina desde officeAccessories.json + precios del XML si existen
export async function loadOfficeAccessoriesItems(list = 'CO') {
  if (cacheOfficeAccessoriesItems) return cacheOfficeAccessoriesItems;

  try {
    // 1) Cargar lista de accesorios desde officeAccessories.json
    const res = await fetch('/assets/models/Office Accesories/officeAccessories.json');
    if (!res.ok) throw new Error('No se pudo cargar officeAccessories.json');
    const officeAccessoriesData = await res.json();
    const officeAccessoriesArray = Array.isArray(officeAccessoriesData) ? officeAccessoriesData : [];

    // 2) Cargar precios del XML
    const priceMap = await loadPriceListMap(list);

    // 3) Mapear accesorios con precios si existen
    const items = officeAccessoriesArray.map((acc) => {
      const name = String(acc.name).trim();
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

    cacheOfficeAccessoriesItems = items;
    return items;
  } catch (err) {
    console.error('[loadOfficeAccessoriesItems] Error:', err);
    cacheOfficeAccessoriesItems = [];
    return [];
  }
}

export async function getOfficeAccessoryDetail(accessoryName, list = 'CO') {
  try {
    const all = await loadOfficeAccessoriesItems(list);
    const found = all.find((a) => a.name === String(accessoryName).trim());
    return found || null;
  } catch (err) {
    console.error('[getOfficeAccessoryDetail] Error:', err);
    return null;
  }
}
