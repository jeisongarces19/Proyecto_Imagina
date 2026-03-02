// src/data/priceListLoader.js
import { fetchXml, text } from './xmlLoader';

function parsePrice(raw) {
  // "410000" o "410.000" o "410,000" → número
  const cleaned = (raw || '').replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

export async function loadPriceList(url) {
  const doc = await fetchXml(url);
  const items = Array.from(doc.querySelectorAll('Articulo'));

  const map = new Map();
  for (const it of items) {
    const code = text(it, 'Codigo');
    if (!code) continue;
    const precio = parsePrice(text(it, 'Precio'));
    map.set(code, precio);
  }
  return map;
}
