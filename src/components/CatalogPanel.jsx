// src/components/CatalogPanel.jsx
import React, { useMemo, useState, useEffect } from 'react';

import { loadTipologiasDetalle } from '../services/tipologiasDetalle';

function groupItems(items = []) {
  const groups = new Map();
  for (const it of items) {
    const key = it?.raw?.tipo || it?.type || 'OTROS';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return Array.from(groups.entries()).map(([group, groupItems]) => ({
    group,
    items: groupItems,
  }));
}

// ✅ agrupador específico para tipologías (por categoría_costos o un fallback)
function groupTipologias(items = []) {
  const groups = new Map();
  for (const it of items) {
    const key =
      it?.raw?.categoria_costos || it?.raw?.categoria_costos?.toString?.() || 'TIPOLOGÍAS';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return Array.from(groups.entries()).map(([group, groupItems]) => ({
    group,
    items: groupItems,
  }));
}

export default function CatalogPanel({
  items = [],
  country = 'CO',
  disabled = false,
  onAddCatalogItem,
  onToggleSnap,
  onAddSurface, // ✅ YA EXISTE
  onAddTypology, // ✅ NUEVO: agrega tipología como "prototipo"
}) {
  // =======================
  // 1) CATÁLOGO NORMAL
  // =======================

  //para controlar la cantidad:

  const MAX_CATALOGO_IDLE = 2; // cuando NO hay búsqueda
  const MAX_CATALOGO_SEARCH = 2; // cuando SI hay búsqueda
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    // ✅ sin búsqueda: solo los primeros N
    if (!q) return (items || []).slice(0, MAX_CATALOGO_IDLE);

    // ✅ con búsqueda: filtra
    const out = (items || []).filter((it) => {
      const t = (it?.ui?.title || '').toLowerCase();
      const s = (it?.ui?.subtitle || '').toLowerCase();
      const c = (it?.codigoPT || '').toLowerCase();
      return t.includes(q) || s.includes(q) || c.includes(q);
    });

    // ✅ y limita resultados para no llenar la UI
    return out.slice(0, MAX_CATALOGO_SEARCH);
  }, [items, query]);

  const groups = useMemo(() => groupItems(filtered), [filtered]);

  // =======================
  // 2) TIPOLOGÍAS (SEPARADO)
  // =======================
  const [tipologias, setTipologias] = useState([]);
  const [tipologiasQuery, setTipologiasQuery] = useState('');
  const [tipologiasReady, setTipologiasReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const map = await loadTipologiasDetalle();

        // convertir Map -> array "item-like"
        const arr = Array.from(map.values()).map((t) => {
          const hijos = t?.hijos || [];

          // ✅ total = suma de precio_acumulado
          const total = Number(hijos.reduce((acc, h) => acc + Number(h?.precio_acumulado || 0), 0));

          // ✅ unitPrice "estimado": total / suma cantidades (si quieres mostrar algo útil)
          const totalQty = hijos.reduce((acc, h) => acc + Number(h?.cantidad || 0), 0) || 1;

          const unitPrice = totalQty ? total / totalQty : 0;

          return {
            // mimetizamos shape del catálogo (para UI)
            codigoPT: String(t.codigo),
            ui: {
              title: t.descripcion || String(t.codigo),
              subtitle: 'Tipología',
            },
            prices: {
              // puedes mostrar unitPrice o total; yo dejo unitPrice para tener "precio unitario"
              [country]: Math.round(unitPrice),
              CO: Math.round(unitPrice),
            },
            // para permitir agregar
            model: { kind: 'TYPOLOGY' },

            // guardamos raw completo (incluye hijos)
            raw: t,

            // si luego quieres mostrar total real en la card:
            __total: total,
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

  const tipologiasFiltered = useMemo(() => {
    const q = tipologiasQuery.trim().toLowerCase();
    if (!q) return tipologias;

    return tipologias.filter((it) => {
      const t = (it?.ui?.title || '').toLowerCase();
      const c = (it?.codigoPT || '').toLowerCase();
      const cat = (it?.raw?.categoria_costos || '').toLowerCase();
      return t.includes(q) || c.includes(q) || cat.includes(q);
    });
  }, [tipologias, tipologiasQuery]);

  const tipologiasGroups = useMemo(() => groupTipologias(tipologiasFiltered), [tipologiasFiltered]);

  //para regular la cantidad de resultado
  const MAX_TIPOLOGIAS_IDLE = 2; // cuando NO hay búsqueda
  const MAX_TIPOLOGIAS_SEARCH = 2; // cuando SI hay búsqueda

  const [tipQuery, setTipQuery] = useState('');

  const visibleTipologias = useMemo(() => {
    const q = tipQuery.trim().toLowerCase();

    // sin búsqueda: muestra solo las primeras N (o puedes ordenar por precio/uso si quieres)
    if (!q) return (tipologias || []).slice(0, MAX_TIPOLOGIAS_IDLE);

    // con búsqueda: filtra y limita
    const filtered = (tipologias || []).filter((t) => {
      const code = (t.codigoPT || '').toLowerCase();
      const title = (t?.ui?.title || '').toLowerCase();
      return code.includes(q) || title.includes(q);
    });

    return filtered.slice(0, MAX_TIPOLOGIAS_SEARCH);
  }, [tipologias, tipQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* =======================
          CATÁLOGO NORMAL
         ======================= */}

      {/* importante, boton de snap, lo voy a dejar comentado mientras */}
      {/* 
      <button
        onClick={onToggleSnap}
        disabled={disabled}
        style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer' }}
      >
        Snap ON/OFF
      </button>
      */}

      <h3 style={{ margin: '0 0 12px 0' }}>Objetos</h3>
      <button
        onClick={() => onAddSurface?.()}
        disabled={disabled}
        style={{
          padding: 10,
          borderRadius: 10,
          border: '1px solid #ddd',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        + Superficie (paramétrica)
      </button>

      <h3 style={{ margin: '0 0 12px 0' }}>Catálogo</h3>

      {/* Buscador */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar código/nombre (22000032439)"
        style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd' }}
      />

      {/* Sugerencias */}
      {!query.trim() && (
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
          Mostrando {Math.min(MAX_CATALOGO_IDLE, items.length)} sugeridos. Escribe un código o
          nombre para ver más.
        </div>
      )}

      {!!query.trim() && (
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
          Mostrando hasta {MAX_CATALOGO_SEARCH} resultados.
        </div>
      )}

      {/* Grupos del catálogo */}
      {groups.map((g, gIdx) => (
        <div key={`${g.group || 'GRUPO'}__${gIdx}`} style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, margin: '10px 0 6px 0' }}>{g.group}</div>

          {g.items.map((it, idx) => {
            const price = it?.prices?.[country] ?? 0;
            const hasModel = !!it?.model;

            return (
              <div
                key={`${it.codigoPT || 'NO_CODE'}__${g.group}__${idx}`}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: '#f7f7f7',
                  marginBottom: 8,
                  opacity: disabled ? 0.6 : 1,
                  border: '1px solid #eee',
                }}
              >
                <div style={{ fontWeight: 700 }}>{it?.ui?.title || it.codigoPT}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{it?.ui?.subtitle || ''}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Código: {it.codigoPT}</div>

                {it.generico && (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Genérico Material: {it.generico}</div>
                )}

                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Precio {country}: <b>{price?.toLocaleString?.() ?? price}</b>
                </div>

                <button
                  disabled={disabled || !hasModel}
                  onClick={() => onAddCatalogItem?.(it.codigoPT)}
                  style={{
                    marginTop: 8,
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid #ddd',
                    cursor: disabled || !hasModel ? 'not-allowed' : 'pointer',
                  }}
                >
                  + Agregar
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {/* =======================
          SECCIÓN TIPOLOGÍAS (APARTE)
         ======================= 
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid rgba(0,0,0,0.10)',
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>TIPOLOGÍAS</div>

        <input
          value={tipologiasQuery}
          onChange={(e) => setTipologiasQuery(e.target.value)}
          placeholder="Buscar tipología por código o descripción…"
          style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd', width: '100%' }}
        />

        {!tipologiasReady ? (
          <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>Cargando tipologías…</div>
        ) : tipologiasFiltered.length === 0 ? (
          <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>No hay tipologías.</div>
        ) : (
          tipologiasGroups.map((g, gIdx) => (
            <div key={`TIPO__${g.group || 'GRUPO'}__${gIdx}`} style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 700, margin: '10px 0 6px 0' }}>{g.group}</div>

              {g.items.map((it, idx) => {
                const unit = it?.prices?.[country] ?? it?.prices?.CO ?? 0;
                const total = it?.__total ?? 0;

                return (
                  <div
                    key={`TIPO__${it.codigoPT || 'NO_CODE'}__${g.group}__${idx}`}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: '#f7f7f7',
                      marginBottom: 8,
                      opacity: disabled ? 0.6 : 1,
                      border: '1px solid #eee',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{it?.ui?.title || it.codigoPT}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{it?.ui?.subtitle || ''}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Código: {it.codigoPT}</div>

                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      Unit {country}: <b>{unit?.toLocaleString?.() ?? unit}</b>
                      {total ? (
                        <span style={{ opacity: 0.75 }}>
                          {' '}
                          · Total: <b>{total.toLocaleString?.() ?? total}</b>
                        </span>
                      ) : null}
                    </div>

                    <button
                      disabled={disabled || !onAddTypology}
                      onClick={() => onAddTypology?.(it.codigoPT)}
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #ddd',
                        cursor: disabled || !onAddTypology ? 'not-allowed' : 'pointer',
                      }}
                    >
                      + Agregar tipología
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.5 }}>TIPOLOGÍAS</div>

        <input
          value={tipQuery}
          onChange={(e) => setTipQuery(e.target.value)}
          placeholder="Buscar tipología código (22000131997)"
          style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd' }}
        />

        {!tipQuery.trim() && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Mostrando {Math.min(MAX_TIPOLOGIAS_IDLE, tipologias.length)} sugeridas. Escribe un
            código para ver más.
          </div>
        )}

        {visibleTipologias.map((it, idx) => {
          const price = it?.prices?.[country] ?? 0;

          return (
            <div
              key={`${it.codigoPT || 'NO_CODE'}__TIPO__${idx}`}
              style={{
                padding: 10,
                borderRadius: 12,
                background: '#f7f7f7',
                border: '1px solid #eee',
              }}
            >
              <div style={{ fontWeight: 800 }}>{it?.ui?.title || it.codigoPT}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{it?.ui?.subtitle || 'Tipología'}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Código: {it.codigoPT}</div>

              <div style={{ marginTop: 6, fontSize: 12 }}>
                Precio {country}: <b>{price?.toLocaleString?.() ?? price}</b>
              </div>

              <button
                disabled={disabled}
                onClick={() => onAddTypology?.(it.codigoPT)} // 👈 OJO: tipología NO va a onAddCatalogItem
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                + Agregar tipología
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
