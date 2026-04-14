import { useEffect, useRef } from 'react';

export default function PropertiesPopup({ open, x, y, part, api, onClose }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        onClose?.();
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !part) return null;

  const isDucto = part?.kind === 'ducto' || part?.meta?.category === 'ductos';

  const popupLeft = Math.min(x + 12, window.innerWidth - 280);
  const popupTop = Math.min(y + 12, window.innerHeight - 220);

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left: popupLeft,
        top: popupTop,
        zIndex: 99999,
        width: 260,
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 12,
        boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Propiedades</div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        {part.description || part.code || 'Elemento'}
      </div>

      {part.code && (
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Código: {part.code}</div>
      )}

      {isDucto && (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            Tipo de ducto
          </label>

          <select
            value={part?.meta?.tipoModulo || 'terminal'}
            onChange={(e) => api?.updateSelectedDuctType?.(e.target.value)}
            style={{
              width: '100%',
              height: 34,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              padding: '0 8px',
              background: '#fff',
            }}
          >
            <option value="terminal">Terminal</option>
            <option value="intermedio">Intermedio</option>
            <option value="individual">Individual</option>
          </select>
        </div>
      )}

      {!isDucto && (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
          Este elemento aún no tiene propiedades editables desde el popup.
        </div>
      )}
    </div>
  );
}
