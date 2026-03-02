// src/catalog/catalogData.js

export const CATALOG_COUNTRIES = ['CO', 'EUC', 'USD'];

// Tipos de item (para UI / reglas)
export const ITEM_TYPES = {
  COSTADO: 'COSTADO',
  SUPERFICIE: 'SUPERFICIE',
};

// Tipos de modelo 3D
export const MODEL_TYPES = {
  GLB: 'glb',
  PROCEDURAL: 'procedural',
};

/**
 * Un CatalogItem representa “lo comercial + lo visual”
 *
 * - codigoPT: el código numérico (CODIGO_PT / PriceList Codigo)
 * - ui: datos para mostrar en catálogo
 * - model: cómo se genera/carga en 3D
 * - connectorsMeta: dónde está el json de conectores (si aplica)
 */
export const catalogItems = [
  {
    codigoPT: '22000032439',
    type: ITEM_TYPES.COSTADO,
    ui: {
      title: 'Costado doble intermedio 120 (Link)',
      subtitle: 'ELSO-080-000',
      tags: ['LINK.SYS', 'METAL', '120cm'],
    },
    model: {
      kind: MODEL_TYPES.GLB,
      // El nombre del GLB lo decides tú (no depende del codigoPT)
      // Por ahora usamos el mismo que ya estabas usando:
      src: '/assets/models/2KSO330000_60.glb',
      // opcional: si quieres tener “variante” (para UI)
      variant: '60',
    },
    connectorsMeta: {
      units: 'm',
      src: '/assets/meta/2KSO330000_60.connectors.json',
    },
    // (por ahora mock) luego lo llena el loader de PriceList
    prices: { CO: 410000 },
  },

  {
    // En superficies, el “codigoPT” también puede existir como un producto comercial
    // o lo puedes manejar como “servicio/procedural” con reglas internas.
    codigoPT: 'SURFACE_PROC', // temporal mientras definimos si tendrá codigoPT real numérico
    type: ITEM_TYPES.SUPERFICIE,
    ui: {
      title: 'Superficie (procedural)',
      subtitle: 'Paramétrica',
      tags: ['RECT', 'CANTO', 'CUSTOM'],
    },
    model: {
      kind: MODEL_TYPES.PROCEDURAL,
      factory: 'surfaceFactory',
      // defaults para crearla al agregar desde catálogo
      defaults: { widthM: 1.2, depthM: 0.6, thicknessM: 0.025 },
    },
    connectorsMeta: {
      units: 'm', // en procedural vamos en metros
      // src no aplica aquí; lo genera la factory
    },
    prices: { CO: 120000 }, // mock (ejemplo)
  },
];

/**
 * Índice por codigoPT para lookup rápido
 */
export const catalogByCodigoPT = new Map(catalogItems.map((it) => [it.codigoPT, it]));

/**
 * Para el Catálogo lateral: agrupar por tipo
 */
export function getCatalogGroups() {
  const groups = new Map();
  for (const it of catalogItems) {
    if (!groups.has(it.type)) groups.set(it.type, []);
    groups.get(it.type).push(it);
  }
  return Array.from(groups.entries()).map(([type, items]) => ({ type, items }));
}
