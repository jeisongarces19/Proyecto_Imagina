// src/components/PropertiesPanel.jsx
import { useEffect, useMemo, useState } from 'react';

import {
  KONCISA_PRIVACY_PANEL_FINISH_OPTIONS,
  getKoncisaPrivacyPanelFinishById,
} from '../koncisaPlus/rules/koncisaPrivacyPanelFinishOptions';

export default function PropertiesPanel({
  part,
  partAcabado,
  allowedFinishCodes = null, // ✅ NUEVO: array de códigos permitidos o null
  bomItems = [],
  byCode,
  api,
  materials = [],
  materialsAcabado = [],
  materialsByCode,
  readOnly = false,
}) {
  const hasBom = Array.isArray(bomItems) && bomItems.length > 0;

  const [applyScope, setApplyScope] = useState('PART'); // PART | GROUP | ALL
  const [finishQuery, setFinishQuery] = useState(''); // 🔎 buscar por código o nombre

  //
  const hasFinishRestriction = Array.isArray(allowedFinishCodes);

  const allowedSet = useMemo(() => {
    if (!hasFinishRestriction) return null;
    return new Set((allowedFinishCodes || []).map((x) => String(x)));
  }, [allowedFinishCodes, hasFinishRestriction]);

  // 1) primero restringe por allowedSet (si existe)
  const scopedMaterials = useMemo(() => {
    const list = materials || [];

    // null/undefined = sin restricción
    if (!hasFinishRestriction) return list;

    // [] = restricción activa pero sin coincidencias => lista vacía
    return list.filter((m) => allowedSet.has(String(m?.code)));
  }, [materials, allowedSet, hasFinishRestriction]);

  // 2) luego aplica búsqueda dentro de ese scope
  const filteredMaterialsAcabado = useMemo(() => {
    const q = (finishQuery || '').trim().toLowerCase();
    if (!q) return scopedMaterials;

    return scopedMaterials.filter((m) => {
      const code = String(m?.code ?? '').toLowerCase();
      const name = String(m?.name ?? '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [scopedMaterials, finishQuery]);

  //

  const formatMoney = (n) => (n || 0).toLocaleString('es-CO');

  // (opcional) limpiar búsqueda cuando cambias de parte/subparte
  useEffect(() => {
    setFinishQuery('');
  }, [part?.code, part?.subKey, part?.activeSubKey, part?.subName]);

  function normalizeGenericos(source, byCodeMap) {
    const code = String(source?.code || '').trim();
    const item = code ? byCodeMap?.get?.(code) || null : null;

    const values = [
      ...(Array.isArray(source?.raw?.genericos) ? source.raw.genericos : []),
      ...(Array.isArray(source?.genericos) ? source.genericos : []),
      source?.raw?.generico ?? null,
      source?.generico ?? null,

      ...(Array.isArray(item?.raw?.genericos) ? item.raw.genericos : []),
      ...(Array.isArray(item?.genericos) ? item.genericos : []),
      item?.raw?.generico ?? null,
      item?.generico ?? null,
    ]
      .map((g) => String(g ?? '').trim())
      .filter(Boolean);

    return [...new Set(values)];
  }

  const partGenericos = useMemo(() => normalizeGenericos(part, byCode), [part, byCode]);
  const partAcabadoGenericos = useMemo(
    () => normalizeGenericos(partAcabado, byCode),
    [partAcabado, byCode]
  );

  const partGenericoText = partGenericos.length ? partGenericos.join(', ') : 'Sin genérico';
  const partAcabadoGenericoText = partAcabadoGenericos.length
    ? partAcabadoGenericos.join(', ')
    : 'Sin genérico Acabado';

  //para poner el acabado por grupos
  const canApplyGroup = !!part?.groupId;

  const groupScopeLabel = useMemo(() => {
    if (part?.kind === 'SURFACE') return 'Grupo similar';
    const cat = String(part?.meta?.category || '').toLowerCase();

    if (cat === 'costados') return 'Grupo similar';
    if (cat === 'ductos') return 'Grupo similar';
    if (cat === 'pantallas') return 'Grupo similar';
    if (cat === 'grommets') return 'Grupo similar';

    return 'Grupo similar';
  }, [part]);

  return (
    <div
      style={{
        borderLeft: '1px solid #e5e5e5',
        padding: 12,
        background: '#fff',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Propiedades</h3>

      {readOnly && (
        <div
          style={{
            margin: '8px 0 12px',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fafafa',
            fontSize: 12,
            fontWeight: 700,
            opacity: 0.9,
          }}
        >
          Modo solo lectura (Comercial): puedes revisar propiedades y BOM, pero no editar acabados.
        </div>
      )}

      {!part && (
        <div style={{ opacity: 0.7 }}>Selecciona una pieza para ver y editar sus propiedades.</div>
      )}

      {part && (
        <>
          {/* Código */}
          <div style={{ marginBottom: 10 }}>
            <b>Código:</b> {part.code || '—'}
          </div>

          {/* Genérico */}
          <div style={{ marginBottom: 10 }}>
            <b>Genérico:</b>{' '}
            <span style={{ opacity: partGenericos.length ? 1 : 0.7 }}>{partGenericoText}</span>
            <div style={{ marginTop: 4 }}>
              <b>Genérico (Acabado):</b>{' '}
              <span style={{ opacity: partAcabadoGenericos.length ? 1 : 0.7 }}>
                {partAcabadoGenericoText}
              </span>
            </div>
          </div>

          {/* Dimensiones */}
          {(part.dimMm || part.dimM) && (
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <b>Dimensiones</b>
              {part.dimMm ? (
                <>
                  <div>Ancho: {part.dimMm.widthMm} mm</div>
                  <div>Fondo: {part.dimMm.depthMm} mm</div>
                  <div>Espesor: {part.dimMm.thickMm} mm</div>
                </>
              ) : (
                <>
                  <div>Ancho: {Math.round((part.dimM?.widthM || 0) * 1000)} mm</div>
                  <div>Fondo: {Math.round((part.dimM?.depthM || 0) * 1000)} mm</div>
                  <div>Espesor: {Math.round((part.dimM?.thicknessM || 0) * 1000)} mm</div>
                </>
              )}
            </div>
          )}

          {/* Acabado / Material */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Acabado</div>

            {/* Scope */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                title="Aplicar a la parte seleccionada"
                onClick={() => setApplyScope('PART')}
                disabled={readOnly}
                style={{
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'PART' ? '#111827' : '#fff',
                  color: applyScope === 'PART' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                ◧ Parte
              </button>

              <button
                type="button"
                title="Aplicar a piezas similares del mismo conjunto"
                onClick={() => setApplyScope('GROUP')}
                disabled={readOnly || !canApplyGroup}
                style={{
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'GROUP' ? '#111827' : '#fff',
                  color: applyScope === 'GROUP' ? '#fff' : '#111827',
                  cursor: readOnly || !canApplyGroup ? 'not-allowed' : 'pointer',
                  opacity: !canApplyGroup ? 0.6 : 1,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                ◫ Grupo
              </button>

              <button
                type="button"
                title="Aplicar al objeto completo"
                onClick={() => setApplyScope('ALL')}
                disabled={readOnly}
                style={{
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'ALL' ? '#111827' : '#fff',
                  color: applyScope === 'ALL' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                ⬚ Todo
              </button>
            </div>

            {applyScope === 'GROUP' && (
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8, lineHeight: 1.3 }}>
                Mismo grupo y misma familia.
              </div>
            )}

            {part.subName && (
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                Editando parte: <b>{part.subName}</b>
              </div>
            )}

            {/* 🔎 Buscador por código o nombre */}
            <input
              value={finishQuery}
              onChange={(e) => setFinishQuery(e.target.value)}
              placeholder="Buscar por código o nombre (ej: 22002383)"
              disabled={readOnly}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #ddd',
                marginBottom: 8,
              }}
            />

            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Acabados permitidos: <b>{filteredMaterialsAcabado.length}</b>
            </div>

            <select
              value={part.subMaterialCode ?? part.materialCode ?? ''}
              onChange={(e) => {
                const code = e.target.value || null;
                const def = code ? (materialsByCode?.get?.(code) ?? null) : null;

                api?.applyFinishToActivePart?.(code, def, applyScope ?? 'PART');
              }}
              disabled={readOnly || !api?.applyFinishToActivePart}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #ddd',
              }}
            >
              <option value="">Sin acabado</option>

              {filteredMaterialsAcabado.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>

            {part.materialBase && (
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
                Material base: {part.materialBase}
              </div>
            )}
          </div>
        </>
      )}

      {part?.type === 'pantalla' && (
        <div style={{ marginTop: 12 }}>
          <label>Acabado de pantalla</label>

          <select
            value={part?.privacyPanelFinishId || ''}
            onChange={(e) => {
              const selected = getKoncisaPrivacyPanelFinishById(e.target.value);
              api?.updateActivePrivacyPanelFinish?.({
                ...selected,
                privacyPanelFinishId: selected.id,
              });
            }}
            style={{ width: '100%' }}
            disabled={readOnly}
          >
            <option value="">Seleccionar acabado de pantalla</option>

            {KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <hr style={{ margin: '14px 0' }} />
    </div>
  );
}
