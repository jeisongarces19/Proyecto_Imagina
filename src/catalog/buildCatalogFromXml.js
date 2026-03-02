// src/catalog/buildCatalogFromXml.js
import { loadPts } from '../data/ptsLoader';
import { loadPriceList } from '../data/priceListLoader';
import { modelRegistry } from './modelRegistry';

export const CATALOG_COUNTRIES = ['CO', 'EUC', 'USD'];

export async function buildCatalogFromXml() {
  const ptsMap = await loadPts('/data/xml/ptsinbom_4.xml');

  const pricesCO = await loadPriceList('/data/xml/PriceList_CO_2.xml');
  const pricesEUC = await loadPriceList('/data/xml/Pricelist_EUC_2.xml');
  const pricesUSD = await loadPriceList('/data/xml/PriceList_USD_2.xml');

  // ✅ Deduplicación fuerte (por si el loader o XML repite)
  const items = [];
  const seen = new Set();

  for (const [codigoPT, p] of ptsMap.entries()) {
    const code = String(codigoPT || '').trim();
    if (!code) continue;

    // ✅ evita duplicados
    if (seen.has(code)) continue;
    seen.add(code);

    const prices = {
      CO: pricesCO.get(code) || 0,
      EUC: pricesEUC.get(code) || 0,
      USD: pricesUSD.get(code) || 0,
    };

    // UI
    const title = p?.descLarga || `Producto ${code}`;
    const subtitle = p?.numeroPlano ? p.numeroPlano : p?.tipo || '';

    const tags = [p?.linea, p?.material, p?.tipo, p?.subTipo].filter(Boolean);

    // Model (si existe)
    const model = modelRegistry[code] || null;

    // ✅ NUEVO: lista completa de genéricos permitidos para este PT
    // - soporta múltiples nombres por si el loader lo trae distinto
    // - normaliza a strings y elimina vacíos y duplicados
    const genericos = Array.from(
      new Set(
        (p?.genericos || p?.recordsGenericos || p?.records_genericos || p?.genericosList || [])
          .map((g) => String(g || '').trim())
          .filter(Boolean)
      )
    );

    items.push({
      codigoPT,
      generico: p.generico || null, // ✅ (lo dejas tal cual)
      genericos, // ✅ NUEVO (NO rompe nada existente)
      materialBase: p.material || null,
      ui: { title, subtitle, tags },
      prices,
      model,
      raw: p,
    });
  }

  // Índice rápido
  const byCode = new Map(items.map((it) => [it.codigoPT, it]));

  return { items, byCode };
}
