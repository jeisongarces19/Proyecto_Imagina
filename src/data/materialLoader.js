// src/data/materialLoader.js
import { fetchXml } from './xmlLoader';

function clean(s) {
  return String(s || '').trim();
}

export async function loadMaterialsFromGenEsp(url = '/data/xml/gen-esp_3.xml') {
  const doc = await fetchXml(url);

  const out = [];
  const byCode = new Map(); // lookup rápido
  const seen = new Set(); // deduplicación

  const get = (node, tag) => clean(node?.querySelector(tag)?.textContent);
  const getAny = (node, tags) => {
    for (const t of tags) {
      const v = get(node, t);
      if (v) return v;
    }
    return null;
  };

  const gens = Array.from(doc.querySelectorAll('G_CODIGO_GEN'));

  for (const g of gens) {
    const groupCode = getAny(g, ['COD_GENERICO', 'CODIGO_GENERICO', 'COD_GEN']) || null;
    const groupName = getAny(g, ['DESCRIPCION', 'DESCRIPCION_LARGA', 'NOMBRE']) || null;

    const pts = Array.from(g.querySelectorAll('LIST_G_CODIGO_PT > G_CODIGO_PT'));

    for (const pt of pts) {
      const code = String(getAny(pt, ['COD_ESPECIFICO', 'CODIGO_PT', 'COD_PT']) || '').trim();
      if (!code) continue;

      if (seen.has(code)) continue;
      seen.add(code);

      const name = getAny(pt, ['DESCRIPCION_LARGA', 'DESCRIPCION', 'NOMBRE']) || code;

      const shortName = getAny(pt, ['DESCRIPCION_CORTA', 'DESC_CORTA', 'CORTA']) || null;

      const type = getAny(pt, ['TIPO', 'TIPO_MATERIAL']) || null;

      const material = getAny(pt, ['MATERIAL']) || null;

      const activoRaw = getAny(pt, ['ACTIVO', 'HABILITADO']) || null;

      const activo = activoRaw != null ? /true|verdadero|1|si/i.test(String(activoRaw)) : null;

      const vigenciaRaw = getAny(pt, ['VIGENCIA']) || null;
      const subCategory = getAny(pt, ['SUB_CATEGORIA', 'SUBCATEGORIA']) || null;
      const category = getAny(pt, ['CATEGORIA']) || null;
      const family = getAny(pt, ['FAMILIA']) || null;
      const subfamily = getAny(pt, ['SUBFAMILIA']) || null;

      // ✅ claves para Three
      const rgbValue = getAny(pt, ['VALOR_RGB', 'RGB', 'RGB_VALUE']) || null; // "210_158_108"
      const textureFile = getAny(pt, ['ARCHIVO_TEXTURA', 'TEXTURA', 'TEXTURE_FILE']) || null; // "alpiclaro1799.jpg"

      const obj = {
        code,
        name,
        shortName,
        type,
        material,
        activo,
        activoRaw,
        groupCode,
        groupName,
        category,
        family,
        subfamily,
        vigenciaRaw,
        subCategory,
        rgbValue,
        textureFile,
      };

      out.push(obj);
      byCode.set(code, obj);
    }
  }

  // Orden estable (grupo + nombre + código)
  out.sort((a, b) => {
    const ka = `${a.groupName || ''} ${a.name || ''} ${a.code || ''}`;
    const kb = `${b.groupName || ''} ${b.name || ''} ${b.code || ''}`;
    return ka.localeCompare(kb, 'es', { sensitivity: 'base' });
  });

  // ✅ Retrocompatibilidad:
  // - si tu app espera Array, sigue recibiendo Array.
  // - si quieres byCode: usa .byCode o destructuring con la opción de abajo.
  out.byCode = byCode;

  return out;

  // Si prefieres explícito (y te adaptas en App), puedes retornar esto en vez de out:
  // return { materials: out, byCode };
}

// (Opcional) si quieres también byCode
export async function loadMaterialsWithIndex(url = '/data/xml/gen-esp_3.xml') {
  const materials = await loadMaterialsFromGenEsp(url);
  const byCode = new Map(materials.map((m) => [m.code, m]));
  return { materials, byCode };
}
