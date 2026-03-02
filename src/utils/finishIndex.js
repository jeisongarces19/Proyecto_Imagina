// utils/finishIndex.js
export function buildPtGenericosByPt(ptsinbomRecords = []) {
  const map = new Map();

  for (const r of ptsinbomRecords) {
    const pt = String(r?.CODIGO_PT ?? '').trim();
    if (!pt) continue;

    // RecordsGenericos -> Genericos -> Generico
    const gens = [];

    const rg = r?.RecordsGenericos;
    const items = rg?.Genericos
      ? Array.isArray(rg.Genericos)
        ? rg.Genericos
        : [rg.Genericos]
      : [];

    for (const g of items) {
      const genCode = String(g?.Generico ?? '').trim();
      if (genCode) gens.push(genCode);
    }

    map.set(pt, gens);
  }

  return map;
}

export function buildPtCodesByGenerico(genEspRecords = []) {
  const map = new Map(); // gen -> Set(pt)

  for (const g of genEspRecords) {
    const gen = String(g?.COD_GENERICO ?? '').trim();
    if (!gen) continue;

    const set = map.get(gen) || new Set();

    // LIST_G_CODIGO_PT -> G_CODIGO_PT -> COD_ESPECIFICO
    const list = g?.LIST_G_CODIGO_PT?.G_CODIGO_PT
      ? Array.isArray(g.LIST_G_CODIGO_PT.G_CODIGO_PT)
        ? g.LIST_G_CODIGO_PT.G_CODIGO_PT
        : [g.LIST_G_CODIGO_PT.G_CODIGO_PT]
      : [];

    for (const ptNode of list) {
      const cod = String(ptNode?.COD_ESPECIFICO ?? ptNode?.CODIGO_PT ?? '').trim();
      if (cod) set.add(cod);
    }

    map.set(gen, set);
  }

  return map;
}
