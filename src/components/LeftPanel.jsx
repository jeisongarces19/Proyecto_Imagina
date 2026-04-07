import { useRef } from 'react';
import { useMemo, useState, useEffect } from 'react';
import { loadTipologiasDetalle } from '../services/tipologiasDetalle';
import { getChairDetail, loadChairsPriceList } from '../services/chairsLoader';
import { getThreeMaterialFromDef } from '../materials/materialRegistry'; // Ajusta la ruta según tu estructura de carpetas

import KoncisaPlusPanel from './KoncisaPlusPanel';
import { buildKoncisaPlus } from '../koncisaPlus/KoncisaPlusBuilder';

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
  materialsByCode,
  selectedPart,
  onApplyGlobalMaterial,
  onAddCatalogItem,
  onAddTypology,
  onAddChair,
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
  const [tipologiasReady, setTipologiasReady] = useState(false);

  const [qChairs, setQChairs] = useState('');
  const [chairs, setChairs] = useState([]);
  const [chairsReady, setChairsReady] = useState(false)

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

  function rgbValueToCss(rgbValue) {
    if (!rgbValue) return 'rgb(200,200,200)';

    const raw = String(rgbValue).trim();

    if (raw.startsWith('#')) return raw;

    if (raw.includes('_')) {
      return `rgb(${raw.replaceAll('_', ',')})`;
    }

    if (raw.includes(',')) {
      return `rgb(${raw})`;
    }

    return 'rgb(200,200,200)';
  }

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
          setTipologiasReady(true);
        }
      } catch (err) {
        console.error('Error cargando tipologias-detalle:', err);
        if (alive) setTipologiasReady(true);
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
        const map = await loadChairsPriceList(country);

        const arr = Array.from(map.values()).map((c) => {
          return {
            codigoPT: String(c.codigo),
            ui: {
              title: c.descripcion || String(c.codigo),
              subtitle: 'Silla',
            },
            prices: {
              [country]: Number(c.precio || 0),
              CO: Number(c.precio || 0),
            },
            model: { kind: 'CHAIR' },
            raw: c,
          };
        });

        if (alive) {
          setChairs(arr);
          setChairsReady(true);
        }
      } catch (err) {
        console.error('Error cargando sillas:', err);
        if (alive) setChairsReady(true);
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

      return matchesSearch;
    });
  }, [chairs, qChairs]);

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
          onCreate={(config) => {
            //const parts = buildKoncisaPlus(config);
            const result = buildKoncisaPlus(config);
            const { groupId, parts } = result;

            // SUPERFICIES
            const superficies = parts.filter((p) => p.type === 'superficie');

            superficies.forEach((surface) => {
              if (!surface.code) {
                alert(`No tenemos disponible esta superficie: ${surface.logicalCode}`);
                return;
              }

              const { widthMm, depthMm, thickMm } = surface.dimMm || {};

              threeApiRef.current?.addSurface?.({
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
                logicalCode: surface.logicalCode,
              });
            });

            // GROMMETS
            const grommets = parts.filter((p) => p.type === 'grommet');

            grommets.forEach((grommet) => {
              if (!grommet.code) {
                alert(`No tenemos disponible este grommet: ${grommet.logicalCode}`);
                return;
              }

              threeApiRef.current?.addExternalGlbPart?.({
                ...grommet,
                groupId: grommet.groupId || groupId,
              });
            });

            const pasacables = parts.filter((p) => p.type === 'pasacable');

            pasacables.forEach((pasacable) => {
              if (!pasacable.code) {
                alert(`No tenemos disponible este pasacable: ${pasacable.logicalCode}`);
                return;
              }

              threeApiRef.current?.addExternalGlbPart?.({
                ...pasacable,
                groupId: pasacable.groupId || groupId,
              });
            });

            console.log('PARTS KONCISA', parts);
            console.log('GROUP KONCISA', groupId);
            console.log('PARTS KONCISA', parts);
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
          <Plan2DUploader onLoadFile={handleLoadPlan2D} />

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

                {it.ui?.subtitle ? (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{it.ui.subtitle}</div>
                ) : null}
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
    </div>
  );
}

function cardBtn(readOnly) {
  return {
    textAlign: 'left',
    padding: '10px 10px',
    borderRadius: 12,
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
  padding: '10px 10px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  background: '#fafafa',
  cursor: 'not-allowed',
  opacity: 0.7,
};
