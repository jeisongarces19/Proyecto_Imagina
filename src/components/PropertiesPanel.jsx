// src/components/PropertiesPanel.jsx
import { useEffect, useMemo, useState } from 'react';

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

  const [applyScope, setApplyScope] = useState('PART'); // PART | ALL
  const [finishQuery, setFinishQuery] = useState(''); // 🔎 buscar por código o nombre

  //
  const allowedSet = useMemo(() => {
    if (!Array.isArray(allowedFinishCodes) || allowedFinishCodes.length === 0) return null;
    return new Set(allowedFinishCodes.map((x) => String(x)));
  }, [allowedFinishCodes]);

  // 1) primero restringe por allowedSet (si existe)
  const scopedMaterials = useMemo(() => {
    const list = materials || [];
    if (!allowedSet) return list;
    return list.filter((m) => allowedSet.has(String(m?.code)));
  }, [materials, allowedSet]);

  // 2) luego aplica búsqueda dentro de ese scope
  const filteredMaterialsAcanado = useMemo(() => {
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

  const filteredMaterials = useMemo(() => {
    const q = (finishQuery || '').trim().toLowerCase();
    if (!q) return materials || [];

    return (materials || []).filter((m) => {
      const code = String(m?.code ?? '').toLowerCase();
      const name = String(m?.name ?? '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [materials, finishQuery]);

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
            {part?.generico ? (
              <span>{part.generico}</span>
            ) : (
              <span style={{ opacity: 0.7 }}>Sin genérico</span>
            )}
            <div style={{ marginTop: 4 }}>
              <b>Genérico (Acabado):</b>{' '}
              {partAcabado?.generico ? (
                <span>{partAcabado.generico}</span>
              ) : (
                <span style={{ opacity: 0.7 }}>Sin genérico Acabado</span>
              )}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setApplyScope('PART')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'PART' ? '#111827' : '#fff',
                  color: applyScope === 'PART' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                }}
              >
                Parte seleccionada
              </button>

              <button
                type="button"
                onClick={() => setApplyScope('ALL')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'ALL' ? '#111827' : '#fff',
                  color: applyScope === 'ALL' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                }}
              >
                Objeto completo
              </button>
            </div>

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

              {filteredMaterials.map((m) => (
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

          {/* Acabado con filtro de generico base/ Material */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Acabado Filtro</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setApplyScope('PART')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'PART' ? '#111827' : '#fff',
                  color: applyScope === 'PART' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                }}
              >
                Parte seleccionada
              </button>

              <button
                type="button"
                onClick={() => setApplyScope('ALL')}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: applyScope === 'ALL' ? '#111827' : '#fff',
                  color: applyScope === 'ALL' ? '#fff' : '#111827',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                }}
              >
                Objeto completo
              </button>
            </div>

            {partAcabado.subName && (
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                Editando parte: <b>{partAcabado.subName}</b>
              </div>
            )}

            {/* 🔎 Buscar por código o nombre (dentro de los permitidos) */}
            <input
              value={finishQuery}
              onChange={(e) => setFinishQuery(e.target.value)}
              placeholder={
                allowedSet
                  ? 'Buscar dentro de los acabados permitidos (ej: 22002383)'
                  : 'Buscar por código o nombre (ej: 22002383)'
              }
              disabled={readOnly}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #ddd',
                marginBottom: 8,
              }}
            />

            {/* Info de filtro */}
            {allowedSet && (
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                Mostrando <b>{scopedMaterials.length}</b> acabados permitidos para este PT
              </div>
            )}

            <select
              value={partAcabado.subMaterialCode ?? partAcabado.materialCode ?? ''}
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

              {filteredMaterials.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>

            {partAcabado.materialBase && (
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
                Material base: {partAcabado.materialBase}
              </div>
            )}
          </div>
        </>
      )}

      <hr style={{ margin: '14px 0' }} />
    </div>
  );
}
