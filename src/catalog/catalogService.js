// src/catalog/catalogService.js
import { loadPtsInBom } from '../data/ptsLoader';
import { loadAllPriceLists } from '../data/priceListLoader';
import { catalogItems } from './catalogData';

export async function loadCatalogFromXml() {
  const [ptsMap, priceLists] = await Promise.all([loadPtsInBom(), loadAllPriceLists()]);

  const enriched = catalogItems.map((it) => {
    const ficha = it.codigoPT ? ptsMap.get(it.codigoPT) : null;

    const prices = {
      CO: it.codigoPT ? priceLists.CO.get(it.codigoPT) ?? 0 : 0,
      EUC: it.codigoPT ? priceLists.EUC.get(it.codigoPT) ?? 0 : 0,
      USD: it.codigoPT ? priceLists.USD.get(it.codigoPT) ?? 0 : 0,
    };

    return {
      ...it,
      // si en tu catalogData ya pusiste title/subtitle, se respeta;
      // si no, se rellena desde ptsinbom.
      ui: {
        ...it.ui,
        title: it.ui?.title || ficha?.descripcionLarga || it.codigoPT,
        subtitle: it.ui?.subtitle || ficha?.numeroPlano || '',
        tags: it.ui?.tags?.length
          ? it.ui.tags
          : [ficha?.lineaProducto, ficha?.material, ficha?.tipo].filter(Boolean),
      },
      ficha, // guarda toda la ficha técnica
      prices, // precios reales por país
    };
  });

  return { catalogItems: enriched, ptsMap, priceLists };
}
