// src/components/SurfaceModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { resolveSurfaceCodigoPT } from '../rules/surfaceRules';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle = {
  width: 'min(520px, 92vw)',
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e9e9e9',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  overflow: 'hidden',
};

const headerStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const bodyStyle = { padding: 16, display: 'grid', gap: 12 };
const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 12,
  border: '1px solid #ddd',
  outline: 'none',
};

const labelStyle = { fontSize: 12, opacity: 0.75, marginBottom: 6 };

const btnRowStyle = {
  padding: 16,
  borderTop: '1px solid #eee',
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
};

const btnStyle = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #ddd',
  background: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryBtnStyle = {
  ...btnStyle,
  background: '#111',
  color: '#fff',
  border: '1px solid #111',
};

export default function SurfaceModal({
  open,
  lines = ['LINK.SYS', 'KONCISA.PLUS'],
  defaultLine = 'LINK.SYS',
  onClose,
  onCreate, // ({ line, widthMm, depthMm, thickMm, codigoPT })
}) {
  const [line, setLine] = useState(defaultLine);
  const [widthMm, setWidthMm] = useState(1200);
  const [depthMm, setDepthMm] = useState(600);
  const [thickMm, setThickMm] = useState(25);

  useEffect(() => {
    if (!open) return;
    setLine(defaultLine);
    setWidthMm(1200);
    setDepthMm(600);
    setThickMm(25);
  }, [open, defaultLine]);

  const validDims = useMemo(
    () =>
      Number.isFinite(widthMm) &&
      widthMm > 0 &&
      Number.isFinite(depthMm) &&
      depthMm > 0 &&
      Number.isFinite(thickMm) &&
      thickMm > 0,
    [widthMm, depthMm, thickMm]
  );

  const suggestedCodigoPT = useMemo(() => {
    if (!validDims) return null;
    return resolveSurfaceCodigoPT({ line, widthMm, depthMm, thickMm });
  }, [validDims, line, widthMm, depthMm, thickMm]);

  const canCreate = validDims && !!suggestedCodigoPT;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Crear superficie</div>
          <button style={btnStyle} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div style={bodyStyle}>
          <div>
            <div style={labelStyle}>Línea</div>
            <select style={inputStyle} value={line} onChange={(e) => setLine(e.target.value)}>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Ancho (mm)</div>
              <input
                style={inputStyle}
                type="number"
                value={widthMm}
                min={1}
                onChange={(e) => setWidthMm(Number(e.target.value))}
              />
            </div>
            <div>
              <div style={labelStyle}>Fondo (mm)</div>
              <input
                style={inputStyle}
                type="number"
                value={depthMm}
                min={1}
                onChange={(e) => setDepthMm(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Espesor (mm)</div>
              <input
                style={inputStyle}
                type="number"
                value={thickMm}
                min={1}
                onChange={(e) => setThickMm(Number(e.target.value))}
              />
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, alignSelf: 'end' }}>
              Código sugerido (a techo):
              <br />
              <b>{suggestedCodigoPT || '— Sin regla —'}</b>
              {!suggestedCodigoPT && (
                <div style={{ marginTop: 6 }}>
                  No hay regla para estas medidas en esta línea. Agrega una regla en{' '}
                  <code>surfaceRules.js</code>.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={btnRowStyle}>
          <button style={btnStyle} onClick={onClose}>
            Cancelar
          </button>
          <button
            style={primaryBtnStyle}
            disabled={!canCreate}
            onClick={() =>
              onCreate?.({
                line,
                widthMm,
                depthMm,
                thickMm,
                codigoPT: suggestedCodigoPT, // ✅ SIEMPRE REAL
              })
            }
            title={!canCreate ? 'No hay código real para estas medidas/línea' : ''}
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
