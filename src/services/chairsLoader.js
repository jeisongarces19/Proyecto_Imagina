// src/services/chairsLoader.js

const cacheByList = new Map();

function normalizeList(list) {
  return String(list || 'CO')
    .trim()
    .toUpperCase();
}

function resolvePriceListFile(list) {
  const key = normalizeList(list);

  console.log('[resolvePriceListFile] list recibido:', list);
  console.log('[resolvePriceListFile] key normalizado:', key);

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
  // "1254750" o "1.254.750" o "1,254,750" → número
  const cleaned = (raw || '').replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
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
