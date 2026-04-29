import { useEffect, useMemo, useState } from 'react';
import { loadTipologiasDetalle } from '../services/tipologiasDetalle';
import {
  loadChairsPriceList,
  loadChairsCategoryMap,
  loadCategoriasSillas,
} from '../services/chairsLoader';
import { loadAresItems } from '../services/aresLoader';
import { loadPlantsItems } from '../services/plantsLoader';
import { loadOfficeAccessoriesItems } from '../services/officeAccessoriesLoader';

import KoncisaPlusPanel from './KoncisaPlusPanel';
import { buildKoncisaPlus } from '../koncisaPlus/KoncisaPlusBuilder';

const TYPOLOGY_IMAGE_EXTENSIONS = ['png', 'jpeg', 'jpg', 'webp'];
const typologyImageCache = new Map();

function buildCardImageCandidates(assetName) {
  const code = String(assetName || '').trim();
  if (!code) return [];
  return TYPOLOGY_IMAGE_EXTENSIONS.map((ext) => `/assets/imagen/${code}.${ext}`);
}

function CardImage({
  assetName,
  title,
  imageFit = 'cover',
  imageHeight = 96,
  imagePadding = 0,
  imageBackground = '#ffffff',
}) {
  const cacheKey = String(assetName || '').trim();
  const candidates = useMemo(() => buildCardImageCandidates(assetName), [assetName]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [resolvedImage, setResolvedImage] = useState(() => {
    if (!cacheKey) return null;
    return typologyImageCache.has(cacheKey)
      ? typologyImageCache.get(cacheKey)
      : candidates[0] || null;
  });

  if (!resolvedImage) return null;

  const handleLoad = () => {
    if (cacheKey) typologyImageCache.set(cacheKey, resolvedImage);
  };

  const handleError = () => {
    const nextIndex = candidateIndex + 1;
    if (nextIndex < candidates.length) {
      setCandidateIndex(nextIndex);
      setResolvedImage(candidates[nextIndex]);
      return;
    }

    if (cacheKey) typologyImageCache.set(cacheKey, null);
    setResolvedImage(null);
  };

  return (
    <div
      style={{
        width: '100%',
        height: imageHeight,
        overflow: 'hidden',
        borderRadius: 8,
        marginBottom: 6,
        background: imageBackground,
        padding: imagePadding,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={resolvedImage}
        alt={title || assetName}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: imageFit,
          objectPosition: 'center',
          display: 'block',
        }}
      />
    </div>
  );
}

function TypologyCardImage({ codigoPT, title }) {
  return <CardImage assetName={codigoPT} title={title} />;
}

function PlantCardImage({ plantName, title }) {
  return (
    <CardImage
      assetName={plantName}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

function OfficeAccessoryCardImage({ accessoryName, title }) {
  return (
    <CardImage
      assetName={accessoryName}
      title={title}
      imageFit="contain"
      imageHeight={120}
      imagePadding={8}
      imageBackground="#ffffff"
    />
  );
}

export default function LeftPanel({
  section,
  threeApiRef,
  readOnly,
  // datos
  catalogItems,
  country,
  categoriaTipologiaId,
  profundidadFilter,
  setProfundidadFilter,
  longitudFilter,
  setLongitudFilter,
  espesorFilter,
  setEspesorFilter,
  materials, // 👈 nuevo
  selectedPart,
  onApplyGlobalMaterial,
  onAddCatalogItem,
  onAddTypology,
  onAddChair,
  onAddAres,
  onAddPlant,
  onAddOfficeAccessory,
  onToggleSnap,
  // muros
  wallMode,
  setWallMode,
  wallHeight,
  setWallHeight,
  wallThickness,
  setWallThickness,
  onClearWalls,
  onUndoLastWall,
  // otros
  Plan2DUploader,
  handleLoadPlan2D,
  plan2DVisible,
  setPlan2DVisible,
  setSurfaceOpen,
}) {
  const [qCatalog, setQCatalog] = useState('');
  const [qTyp, setQTyp] = useState('');
  const [tipologias, setTipologias] = useState([]);

  const [qChairs, setQChairs] = useState('');
  const [chairs, setChairs] = useState([]);
  const [categoriasSillas, setCategoriasSillas] = useState([]);
  const [categoriaSillaFilter, setCategoriaSillaFilter] = useState('');
  const [subcategoriaSillaFilter, setSubcategoriaSillaFilter] = useState('');
  const [subcategoriasSillasByCategoria, setSubcategoriasSillasByCategoria] = useState({});
  const [subcategoriasSillasGlobalCountByCategoria, setSubcategoriasSillasGlobalCountByCategoria] =
    useState({});

  // Ares states
  const [qAres, setQAres] = useState('');
  const [aresItems, setAresItems] = useState([]);
  const [aresReady, setAresReady] = useState(false);

  // PLANTS AND FLOWERS states
  const [qPlants, setQPlants] = useState('');
  const [plantsItems, setPlantsItems] = useState([]);
  const [plantsReady, setPlantsReady] = useState(false);

  // OFFICE ACCESORIES states
  const [qOfficeAccesories, setQOfficeAccesories] = useState('');
  const [officeAccessoriesItems, setOfficeAccessoriesItems] = useState([]);
  const [officeAccessoriesReady, setOfficeAccessoriesReady] = useState(false);

  //Materiales genericos
  const [qMaterials, setQMaterials] = useState('');
  const [applyScope, setApplyScope] = useState('PART');

  const materialsFiltered = useMemo(() => {
    const q = String(qMaterials || '')
      .trim()
      .toLowerCase();
    if (!q) return materials || [];

    return (materials || []).filter((m) => {
      const code = String(m?.code ?? '').toLowerCase();
      const name = String(m?.name ?? '').toLowerCase();
      const shortName = String(m?.shortName ?? '').toLowerCase();
      const groupCode = String(m?.groupCode ?? '').toLowerCase();
      const groupName = String(m?.groupName ?? '').toLowerCase();

      return (
        code.includes(q) ||
        name.includes(q) ||
        shortName.includes(q) ||
        groupCode.includes(q) ||
        groupName.includes(q)
      );
    });
  }, [materials, qMaterials]);

  function onApplyMaterialToPart(materialCode) {
    if (!selectedPart) {
      alert('Por favor, selecciona una pieza o una parte en el visor primero.');
      return;
    }

    onApplyGlobalMaterial?.(materialCode, 'PART');
  }

  // ================================
  // Filtrado de Catálogo
  // ================================
  const catalogFiltered = useMemo(() => {
    const q = String(qCatalog || '')
      .trim()
      .toLowerCase();
    if (!q) return catalogItems || [];
    return (catalogItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const subtitle = String(it?.ui?.subtitle ?? '').toLowerCase();
      const tags = Array.isArray(it?.ui?.tags) ? it.ui.tags.join(' ').toLowerCase() : '';
      return code.includes(q) || title.includes(q) || subtitle.includes(q) || tags.includes(q);
    });
  }, [catalogItems, qCatalog]);

  // ================================
  // Cargar Tipologías
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const map = await loadTipologiasDetalle(country);

        const arr = Array.from(map.values()).map((t) => {
          const hijos = t?.hijos || [];
          const total = Number(hijos.reduce((acc, h) => acc + Number(h?.precio_acumulado || 0), 0));
          const totalQty = hijos.reduce((acc, h) => acc + Number(h?.cantidad || 0), 0) || 1;
          const unitPrice = totalQty ? total / totalQty : 0;

          return {
            codigoPT: String(t.codigo),
            ui: {
              title: t.descripcion || String(t.codigo),
              subtitle: 'Tipología',
            },
            prices: {
              [country]: Math.round(unitPrice),
              CO: Math.round(unitPrice),
            },
            model: { kind: 'TYPOLOGY' },
            raw: t,
            __total: total,
            categoriaTipologiaId: t?.categoria_tipologia_id,
          };
        });

        if (alive) {
          setTipologias(arr);
        }
      } catch (err) {
        console.error('Error cargando tipologias-detalle:', err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar Sillas
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Cargamos en paralelo: precios del XML, mapa de categorías, y lista de categorías
        const [priceMap, categoryMap, categoriasArr] = await Promise.all([
          loadChairsPriceList(country),
          loadChairsCategoryMap(),
          loadCategoriasSillas(),
        ]);

        if (!alive) return;

        // Solo incluimos sillas que tienen categoría en SILLAS Y MESAS (vienen del JSON de categorías)
        // o que al menos coincida su código con algo del XML
        const arr = Array.from(priceMap.values())
          .map((c) => {
            const cat = categoryMap.get(String(c.codigo));
            return {
              codigoPT: String(c.codigo),
              ui: {
                title: c.descripcion || String(c.codigo),
                subtitle: cat?.nivel2 || 'Silla',
              },
              prices: {
                [country]: Number(c.precio || 0),
                CO: Number(c.precio || 0),
              },
              model: { kind: 'CHAIR' },
              raw: c,
              categoriaNivel2: cat?.nivel2 || '', // ej: "SILLAS DE COLECTIVIDAD INTERIORES"
              categoriaNivel3: cat?.nivel3 || '', // ej: "OFIPARTES"
              categoriaSlug: cat?.slug || '',
            };
          })
          // Solo mostramos las que tienen categoría bajo "SILLAS Y MESAS"
          .filter((c) => c.categoriaSlug.startsWith('SILLAS Y MESAS'));

        const byCategoria = {};
        const byCategoriaCounts = {};
        for (const cat of categoryMap.values()) {
          const nivel2 = String(cat?.nivel2 || '').trim();
          const nivel3 = String(cat?.nivel3 || '').trim();
          if (!nivel2 || !nivel3) continue;

          if (!byCategoria[nivel2]) byCategoria[nivel2] = new Set();
          byCategoria[nivel2].add(nivel3);

          if (!byCategoriaCounts[nivel2]) byCategoriaCounts[nivel2] = {};
          byCategoriaCounts[nivel2][nivel3] = (byCategoriaCounts[nivel2][nivel3] || 0) + 1;
        }

        const byCategoriaNormalized = Object.fromEntries(
          Object.entries(byCategoria).map(([key, set]) => [
            key,
            Array.from(set).sort((a, b) => a.localeCompare(b)),
          ])
        );

        setCategoriasSillas(categoriasArr);
        setSubcategoriasSillasByCategoria(byCategoriaNormalized);
        setSubcategoriasSillasGlobalCountByCategoria(byCategoriaCounts);
        setChairs(arr);
      } catch (err) {
        console.error('Error cargando sillas:', err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar Ares
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadAresItems(country);
        if (!alive) return;
        const arr = items.map((c) => ({
          codigoPT: String(c.codigo),
          ui: {
            title: c.descripcion || String(c.codigo),
            subtitle: 'ARES',
          },
          prices: {
            [country]: Number(c.precio || 0),
            CO: Number(c.precio || 0),
          },
          model: { kind: 'ARES' },
          raw: c,
        }));
        setAresItems(arr);
        setAresReady(true);
      } catch (err) {
        console.error('Error cargando Ares:', err);
        if (alive) setAresReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar PLANTS AND FLOWERS
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadPlantsItems(country);
        if (!alive) return;
        const arr = items.map((p) => ({
          codigoPT: p.name,
          ui: {
            title: p.descripcion || p.name,
            subtitle: p.found ? `${country}` : 'Sin precio',
          },
          prices: {
            [country]: Number(p.precio || 0),
            CO: Number(p.precio || 0),
          },
          model: { kind: 'PLANT' },
          raw: p,
        }));
        setPlantsItems(arr);
        setPlantsReady(true);
      } catch (err) {
        console.error('Error cargando Plants and Flowers:', err);
        if (alive) setPlantsReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Cargar OFFICE ACCESORIES
  // ================================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await loadOfficeAccessoriesItems(country);
        if (!alive) return;
        const arr = items.map((acc) => ({
          codigoPT: acc.name,
          ui: {
            title: acc.descripcion || acc.name,
            subtitle: acc.found ? `${country}` : 'Sin precio',
          },
          prices: {
            [country]: Number(acc.precio || 0),
            CO: Number(acc.precio || 0),
          },
          model: { kind: 'OFFICE_ACCESSORY' },
          raw: acc,
        }));
        setOfficeAccessoriesItems(arr);
        setOfficeAccessoriesReady(true);
      } catch (err) {
        console.error('Error cargando Office Accesories:', err);
        if (alive) setOfficeAccessoriesReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [country]);

  // ================================
  // Filtrado de Tipologías
  // ================================
  const typologiesFiltered = useMemo(() => {
    const q = String(qTyp || '')
      .trim()
      .toLowerCase();

    return (tipologias || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const subtitle = String(it?.ui?.subtitle ?? '').toLowerCase();
      const tags = Array.isArray(it?.ui?.tags) ? it.ui.tags.join(' ').toLowerCase() : '';

      const matchesSearch =
        !q || code.includes(q) || title.includes(q) || subtitle.includes(q) || tags.includes(q);

      const matchesCategory =
        !categoriaTipologiaId ||
        categoriaTipologiaId.includes(Number(it.raw?.categoria_tipologia_id));

      const matchesProfundidad =
        !profundidadFilter || String(it?.raw?.profundidad ?? '') === String(profundidadFilter);

      const matchesLongitud =
        !longitudFilter || String(it?.raw?.longitud ?? '') === String(longitudFilter);

      const matchesEspesor =
        !espesorFilter ||
        String(it?.raw?.espesor ?? '').replace(',', '.') ===
          String(espesorFilter).replace(',', '.');

      return (
        matchesSearch && matchesCategory && matchesProfundidad && matchesLongitud && matchesEspesor
      );
    });
  }, [tipologias, qTyp, categoriaTipologiaId, profundidadFilter, longitudFilter, espesorFilter]);

  const profundidades = useMemo(() => {
    const vals = new Set();

    (tipologias || []).forEach((it) => {
      const v = it?.raw?.profundidad;
      if (v !== null && v !== undefined && v !== '') {
        vals.add(String(v));
      }
    });

    return Array.from(vals).sort((a, b) => Number(a) - Number(b));
  }, [tipologias]);

  const longitudes = useMemo(() => {
    const vals = new Set();

    (tipologias || []).forEach((it) => {
      const v = it?.raw?.longitud;
      if (v !== null && v !== undefined && v !== '') {
        vals.add(String(v));
      }
    });

    return Array.from(vals).sort((a, b) => Number(a) - Number(b));
  }, [tipologias]);

  const espesores = useMemo(() => {
    const vals = new Set();

    (tipologias || []).forEach((it) => {
      const v = it?.raw?.espesor;
      if (v !== null && v !== undefined && v !== '') {
        vals.add(String(v).replace(',', '.'));
      }
    });

    return Array.from(vals).sort((a, b) => Number(a) - Number(b));
  }, [tipologias]);

  // ================================
  // Filtrado de Sillas
  // ================================
  const chairsFiltered = useMemo(() => {
    const q = String(qChairs || '')
      .trim()
      .toLowerCase();

    return (chairs || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      const subtitle = String(it?.ui?.subtitle ?? '').toLowerCase();
      const tags = Array.isArray(it?.ui?.tags) ? it.ui.tags.join(' ').toLowerCase() : '';

      const matchesSearch =
        !q || code.includes(q) || title.includes(q) || subtitle.includes(q) || tags.includes(q);

      const matchesCategoria = !categoriaSillaFilter || it.categoriaNivel2 === categoriaSillaFilter;

      const matchesSubcategoria =
        !subcategoriaSillaFilter || it.categoriaNivel3 === subcategoriaSillaFilter;

      return matchesSearch && matchesCategoria && matchesSubcategoria;
    });
  }, [chairs, qChairs, categoriaSillaFilter, subcategoriaSillaFilter]);

  const chairCategoryCounts = useMemo(() => {
    const counts = new Map();

    (chairs || []).forEach((it) => {
      const key = String(it?.categoriaNivel2 || '').trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [chairs]);

  const chairSubcategoryCounts = useMemo(() => {
    const counts = new Map();

    (chairs || []).forEach((it) => {
      if (categoriaSillaFilter && it?.categoriaNivel2 !== categoriaSillaFilter) return;

      const key = String(it?.categoriaNivel3 || '').trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [chairs, categoriaSillaFilter]);

  const chairSubcategories = useMemo(() => {
    if (categoriaSillaFilter) {
      return subcategoriasSillasByCategoria[categoriaSillaFilter] || [];
    }

    const all = new Set();
    Object.values(subcategoriasSillasByCategoria || {}).forEach((arr) => {
      (arr || []).forEach((value) => all.add(value));
    });

    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [categoriaSillaFilter, subcategoriasSillasByCategoria]);

  const chairSubcategoryGlobalCounts = useMemo(() => {
    const counts = new Map();

    if (categoriaSillaFilter) {
      const bySubcat = subcategoriasSillasGlobalCountByCategoria[categoriaSillaFilter] || {};
      Object.entries(bySubcat).forEach(([subcat, count]) => {
        counts.set(subcat, Number(count || 0));
      });
      return counts;
    }

    Object.values(subcategoriasSillasGlobalCountByCategoria || {}).forEach((bySubcat) => {
      Object.entries(bySubcat || {}).forEach(([subcat, count]) => {
        counts.set(subcat, (counts.get(subcat) || 0) + Number(count || 0));
      });
    });

    return counts;
  }, [categoriaSillaFilter, subcategoriasSillasGlobalCountByCategoria]);

  // ================================
  // Filtrado de Ares
  // ================================
  const aresFiltered = useMemo(() => {
    const q = String(qAres || '')
      .trim()
      .toLowerCase();
    if (!q) return aresItems || [];
    return (aresItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [aresItems, qAres]);

  // ================================
  // Filtrado de PLANTS AND FLOWERS
  // ================================
  const plantsFiltered = useMemo(() => {
    const q = String(qPlants || '')
      .trim()
      .toLowerCase();
    if (!q) return plantsItems || [];
    return (plantsItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [plantsItems, qPlants]);

  // ================================
  // Filtrado de OFFICE ACCESORIES
  // ================================
  const officeAccessoriesFiltered = useMemo(() => {
    const q = String(qOfficeAccesories || '')
      .trim()
      .toLowerCase();
    if (!q) return officeAccessoriesItems || [];
    return (officeAccessoriesItems || []).filter((it) => {
      const code = String(it?.codigoPT ?? '').toLowerCase();
      const title = String(it?.ui?.title ?? '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });
  }, [officeAccessoriesItems, qOfficeAccesories]);

  return (
    <div
      style={{
        flex: 1,
        padding: 12,
        overflow: 'auto',
        background: '#fff',
        minHeight: 0,
      }}
    >
      {/* ======================= CATALOGO ======================= */}
      {section === 'catalog' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Catálogo</h3>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button disabled={readOnly} onClick={() => !readOnly && setSurfaceOpen(true)}>
              + Superficie
            </button>
            <button disabled={readOnly} onClick={() => !readOnly && onToggleSnap?.()}>
              Snap
            </button>
          </div>

          <input
            value={qCatalog}
            onChange={(e) => setQCatalog(e.target.value)}
            placeholder="Buscar catálogo 22000032439 (código o descripción)..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Mostrando <b>{catalogFiltered.length}</b> items
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {catalogFiltered.slice(0, 150).map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddCatalogItem(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{country}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{it.ui?.title}</div>
                {it.ui?.subtitle ? (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{it.ui.subtitle}</div>
                ) : null}
              </button>
            ))}
          </div>

          {catalogFiltered.length > 150 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 150 resultados. Refina la búsqueda para ver los demás.
            </div>
          )}
        </>
      )}

      {/* ======================= TIPOLOGÍAS ======================= */}
      {section === 'typologies' && (
        <>
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            <select
              value={profundidadFilter}
              onChange={(e) => setProfundidadFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las profundidades</option>
              {profundidades.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={longitudFilter}
              onChange={(e) => setLongitudFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las longitudes</option>
              {longitudes.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={espesorFilter}
              onChange={(e) => setEspesorFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todos los espesores</option>
              {espesores.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <h3 style={{ margin: '0 0 12px 0' }}>Tipologías</h3>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Busca y selecciona una tipología para agregarla al proyecto.
          </div>

          <input
            value={qTyp}
            onChange={(e) => setQTyp(e.target.value)}
            placeholder="Tipologías 131997 (código o descripción)..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Tipologías encontradas: <b>{typologiesFiltered.length}</b>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {typologiesFiltered.slice(0, 120).map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddTypology(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <TypologyCardImage codigoPT={it.codigoPT} title={it.ui?.title || it.codigoPT} />

                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>

                {it.raw?.lista ? (
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{it.raw.lista}</div>
                ) : null}

                {it.ui?.subtitle ? (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{it.ui.subtitle}</div>
                ) : null}
              </button>
            ))}
          </div>

          {typologiesFiltered.length > 120 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 120 resultados. Refina la búsqueda para ver los demás.
            </div>
          )}
        </>
      )}

      {section === 'koncisaPlus' && (
        <KoncisaPlusPanel
          onCreate={async (config) => {
            const api = threeApiRef.current;
            if (!api) {
              alert('El visor 3D aún no está listo.');
              return;
            }

            const result = buildKoncisaPlus(config);
            const { groupId, groupName, parts } = result;

            // ✅ 1. Crear grupo padre del puesto
            const puestoGroup = api.createKoncisaPlusAssemblyGroup?.({
              ...config,
              groupId,
              groupName,
            });

            if (!puestoGroup) {
              alert('No se pudo crear el grupo del puesto Koncisa Plus.');
              return;
            }

            // =========================
            // SUPERFICIES
            // =========================
            const superficies = parts.filter((p) => p.type === 'superficie');

            for (const surface of superficies) {
              if (!surface.code) {
                alert(`No tenemos disponible esta superficie: ${surface.logicalCode}`);
                continue;
              }

              const { widthMm, depthMm, thickMm } = surface.dimMm || {};

              api.addSurface?.(
                {
                  line: surface.line,
                  codigoPT: surface.code,
                  widthM: (widthMm || 0) / 1000,
                  depthM: (depthMm || 0) / 1000,
                  thicknessM: (thickMm || 0) / 1000,
                  dim: {
                    widthMm,
                    depthMm,
                    thickMm,
                  },
                  position: {
                    x: (surface.position?.x || 0) / 1000,
                    y: (surface.position?.y || 0) / 1000,
                    z: (surface.position?.z || 0) / 1000,
                  },
                  groupId: surface.groupId || groupId,
                  groupName: surface.groupName || groupName,

                  // ✅ CLAVE
                  parentGroup: puestoGroup,

                  logicalCode: surface.logicalCode,
                },
                surface
              );
            }

            // =========================
            // GROMMETS
            // =========================
            const grommets = parts.filter((p) => p.type === 'grommet');

            for (const grommet of grommets) {
              if (!grommet.code) {
                alert(`No tenemos disponible este grommet: ${grommet.logicalCode}`);
                continue;
              }

              await api.addExternalGlbPart?.({
                ...grommet,
                groupId: grommet.groupId || groupId,
                groupName: grommet.groupName || groupName,

                // ✅ CLAVE
                parentGroup: puestoGroup,
              });
            }

            // =========================
            // PASACABLES
            // =========================
            const pasacables = parts.filter((p) => p.type === 'pasacable');

            for (const pasacable of pasacables) {
              if (!pasacable.code) {
                alert(`No tenemos disponible este pasacable: ${pasacable.logicalCode}`);
                continue;
              }

              await api.addExternalGlbPart?.({
                ...pasacable,
                groupId: pasacable.groupId || groupId,
                groupName: pasacable.groupName || groupName,

                // ✅ CLAVE
                parentGroup: puestoGroup,
              });
            }

            // =========================
            // COSTADOS
            // =========================
            const costados = parts.filter((p) => p.type === 'costado');

            for (const costado of costados) {
              if (!costado.code) {
                alert(`No tenemos disponible este costado: ${costado.logicalCode}`);
                continue;
              }

              if (!costado?.model?.src) {
                alert(`Este costado no tiene modelo 3D asociado: ${costado.logicalCode}`);
                continue;
              }

              await api.addExternalGlbPart?.({
                ...costado,
                groupId: costado.groupId || groupId,
                groupName: costado.groupName || groupName,

                // ✅ CLAVE
                parentGroup: puestoGroup,
              });
            }

            // =========================
            // VIGAS
            // =========================
            const vigas = parts.filter((p) => p.type === 'viga');

            for (const viga of vigas) {
              if (!viga.code) {
                alert(`No tenemos disponible esta viga: ${viga.logicalCode}`);
                continue;
              }

              api.addNativeBlockPart?.({
                ...viga,
                groupId: viga.groupId || groupId,
                groupName: viga.groupName || groupName,

                // ✅ CLAVE
                parentGroup: puestoGroup,
              });
            }

            // =========================
            // DUCTOS
            // =========================
            const ductos = parts.filter((p) => p.type === 'ducto');

            for (const ducto of ductos) {
              if (!ducto.code) {
                alert(`No tenemos disponible este ducto: ${ducto.logicalCode}`);
                continue;
              }

              await api.addExternalGlbPart?.({
                ...ducto,
                groupId: ducto.groupId || groupId,
                groupName: ducto.groupName || groupName,

                // ✅ CLAVE
                parentGroup: puestoGroup,
              });
            }

            // =========================
            // PANTALLA KONCISA PLUS
            // =========================
            if (config.privacyPanel?.enabled) {
              await api.addKoncisaPrivacyPanel?.({
                tipo: config.privacyPanel.tipo,
                material: config.privacyPanel.material,
                lengthMm: config.privacyPanel.lengthMm,
                heightMm: config.privacyPanel.heightMm,
                finishCode: config.privacyPanel.finishCode,
                finishLabel: config.privacyPanel.finishLabel,
                privacyPanelFinishId: config.privacyPanel.privacyPanelFinishId,

                // posición relativa dentro del puesto
                x: 0,
                y: 900,
                z: 0,

                // ✅ CLAVE: queda pegada al puesto
                parentGroup: puestoGroup,
              });
            }

            // ✅ Dejar seleccionado el puesto completo al final
            api.selectObject?.(puestoGroup);

            console.log('PARTS KONCISA', parts);
            console.log('GROUP KONCISA', groupId);
            console.log('PUESTO GROUP', puestoGroup);
          }}
        />
      )}

      {/* ======================= MUROS ======================= */}
      {section === 'walls' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Muros</h3>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Modo</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setWallMode('NONE')}
                  style={btnMini(wallMode === 'NONE')}
                >
                  Ninguno
                </button>
                <button
                  type="button"
                  onClick={() => setWallMode('DRAW')}
                  style={btnMini(wallMode === 'DRAW')}
                >
                  Dibujar
                </button>
                <button
                  type="button"
                  onClick={() => setWallMode('EDIT')}
                  style={btnMini(wallMode === 'EDIT')}
                >
                  Editar
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                En “Dibujar”: clic para puntos, doble clic para terminar.
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: '#666', lineHeight: 1.35 }}>
                <div>
                  <b>Cómo trazar:</b> activa “Modo muros”, luego haz click para poner puntos.
                </div>
                <div>
                  <b>Terminar muro:</b> doble click.
                </div>
                <div>
                  <b>Cancelar trazo:</b> tecla Esc.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={lab}>
                Alto (m)
                <input
                  type="number"
                  step="0.05"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(Number(e.target.value))}
                  style={inp}
                />
              </label>

              <label style={lab}>
                Espesor (m)
                <input
                  type="number"
                  step="0.01"
                  value={wallThickness}
                  onChange={(e) => setWallThickness(Number(e.target.value))}
                  style={inp}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onUndoLastWall}>Deshacer</button>
              <button onClick={onClearWalls}>Borrar muros</button>
            </div>
          </div>
        </>
      )}

      {/* ======================= PUERTAS/VENTANAS ======================= */}
      {section === 'openings' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Puertas y Ventanas</h3>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Próximo: librería de aperturas para insertar en muros.
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <button disabled style={disabledCard}>
              🚪 Puerta estándar (próximo)
            </button>
            <button disabled style={disabledCard}>
              🪟 Ventana estándar (próximo)
            </button>
          </div>
        </>
      )}

      {/* ======================= MATERIALES (placeholder) ======================= */}
      {section === 'materials' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Materiales</h3>

          {/* Texto indicando qué parte estamos editando */}
          {selectedPart?.subName && (
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
              Editando parte: <b>{selectedPart.subName}</b>
            </div>
          )}

          {!selectedPart?.subName && selectedPart?.code && (
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
              Editando objeto: <b>{selectedPart.code}</b>
            </div>
          )}

          {!selectedPart && (
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
              Selecciona primero una pieza en el visor.
            </div>
          )}

          {/* Filtro de búsqueda */}
          <input
            value={qMaterials}
            onChange={(e) => setQMaterials(e.target.value)}
            placeholder="Código o nombre"
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
              fontSize: 13,
            }}
          />

          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
            Mostrando {materialsFiltered.length} materiales
          </div>

          {/* Opciones para aplicar el material */}
          {selectedPart && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setApplyScope('PART')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 6px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: applyScope === 'PART' ? '#111827' : '#fff',
                  color: applyScope === 'PART' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Parte
              </button>

              <button
                type="button"
                onClick={() => setApplyScope('ALL')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 6px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: applyScope === 'ALL' ? '#111827' : '#fff',
                  color: applyScope === 'ALL' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Objeto
              </button>
            </div>
          )}

          {/* Lista de materiales */}
          <div style={{ display: 'grid', gap: 10 }}>
            {materialsFiltered.slice(0, 150).map((m) => (
              <div
                key={String(m.code)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  minWidth: 0,
                  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                  width: '100%',
                }}
              >
                {/* Color */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: `rgb(${m.rgbValue?.replaceAll('_', ',') || '200,200,200'})`,
                    flexShrink: 0,
                  }}
                />

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={m.shortName || m.name}
                  >
                    {m.shortName || m.name}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>{m.code}</div>

                  {(m.groupCode || m.groupName) && (
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.6,
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${m.groupCode || ''}${m.groupCode && m.groupName ? ' — ' : ''}${m.groupName || ''}`}
                    >
                      {m.groupCode}
                      {m.groupCode && m.groupName ? ' — ' : ''}
                      {m.groupName}
                    </div>
                  )}
                </div>

                {/* BOTÓN APLICAR */}
                <button
                  disabled={readOnly || !selectedPart}
                  onClick={() => {
                    if (readOnly) return;

                    if (applyScope === 'PART') {
                      onApplyMaterialToPart(m.code);
                    } else {
                      onApplyGlobalMaterial?.(m.code, 'ALL');
                    }
                  }}
                  style={{
                    marginTop: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    background: '#111827',
                    color: '#fff',
                    cursor: readOnly || !selectedPart ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  Aplicar
                </button>
              </div>
            ))}
          </div>

          {materialsFiltered.length > 150 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 150 resultados. Refina la búsqueda.
            </div>
          )}
        </>
      )}

      {/* ======================= PLANOS ======================= */}
      {section === 'plans' && (
        <>
          <h3 style={{ margin: '0 0 12px 0' }}>Planos</h3>

          {Plan2DUploader ? <Plan2DUploader onLoadFile={handleLoadPlan2D} /> : null}

          <button
            onClick={() => setPlan2DVisible((v) => !v)}
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {plan2DVisible ? 'Ocultar plano' : 'Mostrar plano'}
          </button>
        </>
      )}

      {/* ======================= SILLAS ======================= */}
      {section === 'sillas' && (
        <>
          <h1 style={{ margin: '0 0 12px 0' }}>Sillas</h1>

          <h3 style={{ margin: '0 0 12px 0' }}>Bases y Mesas</h3>

          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            <select
              value={categoriaSillaFilter}
              onChange={(e) => {
                setCategoriaSillaFilter(e.target.value);
                setSubcategoriaSillaFilter('');
              }}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las categorías</option>
              {categoriasSillas.map((cat) => (
                <option key={cat.id} value={cat.nombre}>
                  {cat.nombre} ({chairCategoryCounts.get(cat.nombre) || 0})
                </option>
              ))}
            </select>

            <select
              value={subcategoriaSillaFilter}
              onChange={(e) => setSubcategoriaSillaFilter(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            >
              <option value="">Todas las subcategorías</option>
              {chairSubcategories.map((subcat) => (
                <option key={subcat} value={subcat}>
                  {subcat} ({chairSubcategoryCounts.get(subcat) || 0}/
                  {chairSubcategoryGlobalCounts.get(subcat) || 0})
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 11, opacity: 0.65, marginTop: -4, marginBottom: 10 }}>
            Subcategoría: <b>actual/global</b> (códigos en la lista del país / códigos únicos en
            JSON).
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Busca y selecciona una silla para agregarla al proyecto.
          </div>

          <input
            value={qChairs}
            onChange={(e) => setQChairs(e.target.value)}
            placeholder="Sillas 22000116019 (código o descripción)..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Sillas encontradas: <b>{chairsFiltered.length}</b>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {chairsFiltered.slice(0, 120).map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddChair(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>

                <div style={{ fontSize: 11, opacity: 0.65 }}>{it.categoriaNivel2 || 'Silla'}</div>
              </button>
            ))}
          </div>

          {chairsFiltered.length > 120 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Mostrando 120 resultados. Refina la búsqueda para ver los demás.
            </div>
          )}
        </>
      )}

      {/* ======================= ARES ======================= */}
      {section === 'ares' && (
        <>
          <h1 style={{ margin: '0 0 12px 0' }}>Ares</h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un producto Ares para agregarlo al proyecto.
          </div>

          <input
            value={qAres}
            onChange={(e) => setQAres(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!aresReady && <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Ares...</div>}

          <div style={{ display: 'grid', gap: 8 }}>
            {aresFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddAres(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ======================= PLANTS AND FLOWERS ======================= */}
      {section === 'plants' && (
        <>
          <h1 style={{ margin: '0 0 12px 0' }}>Plants and Flowers</h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona una planta para agregarla al proyecto.
          </div>

          <input
            value={qPlants}
            onChange={(e) => setQPlants(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!plantsReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Plants and Flowers...</div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {plantsFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddPlant(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <PlantCardImage plantName={it.codigoPT} title={it.ui?.title || it.codigoPT} />
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>
                {it.raw?.found && (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    Precio: ${it.prices?.[country] || 0}
                  </div>
                )}
              </button>
            ))}
          </div>

          {plantsReady && plantsFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay plantas disponibles. Agrega entradas a plantas.json
            </div>
          )}
        </>
      )}

      {/* ======================= OFFICE ACCESORIES ======================= */}
      {section === 'officeAccesories' && (
        <>
          <h1 style={{ margin: '0 0 12px 0' }}>Office Accesories</h1>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Selecciona un accesorio de oficina para agregarlo al proyecto.
          </div>

          <input
            value={qOfficeAccesories}
            onChange={(e) => setQOfficeAccesories(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              outline: 'none',
            }}
          />

          {!officeAccessoriesReady && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cargando Office Accesories...</div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {officeAccessoriesFiltered.map((it) => (
              <button
                key={String(it.codigoPT)}
                disabled={readOnly}
                onClick={() => !readOnly && onAddOfficeAccessory(it.codigoPT)}
                style={cardBtn(readOnly)}
              >
                <OfficeAccessoryCardImage
                  accessoryName={it.codigoPT}
                  title={it.ui?.title || it.codigoPT}
                />
                <div style={{ fontWeight: 900 }}>{it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{it.ui?.title}</div>
                {it.raw?.found && (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    Precio: ${it.prices?.[country] || 0}
                  </div>
                )}
              </button>
            ))}
          </div>

          {officeAccessoriesReady && officeAccessoriesFiltered.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              No hay accesorios disponibles. Agrega entradas a officeAccessories.json
            </div>
          )}
        </>
      )}
    </div>
  );
}

function cardBtn(readOnly) {
  return {
    textAlign: 'left',
    padding: '8px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: readOnly ? 'not-allowed' : 'pointer',
  };
}

function btnMini(active) {
  return {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #ddd',
    background: active ? '#111827' : '#fff',
    color: active ? '#fff' : '#111827',
    cursor: 'pointer',
    fontWeight: 900,
  };
}

const lab = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 800 };
const inp = { padding: 8, borderRadius: 10, border: '1px solid #ddd' };
const disabledCard = {
  textAlign: 'left',
  padding: '8px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#fafafa',
  cursor: 'not-allowed',
  opacity: 0.7,
};
