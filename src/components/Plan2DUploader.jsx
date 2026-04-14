import React, { useRef, useState } from 'react';

const DEFAULT_ACCEPT =
  '.svg,.png,.jpg,.jpeg,.pdf,.dwg,.dxf,application/pdf,image/svg+xml,image/png,image/jpeg';

function detectPlanType(file) {
  const name = (file?.name || '').toLowerCase();

  if (name.endsWith('.svg')) return 'svg';
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image';
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.dwg')) return 'dwg';
  if (name.endsWith('.dxf')) return 'dxf';

  return 'unknown';
}

export default function Plan2DUploader({ onLoadFile, accept = DEFAULT_ACCEPT }) {
  const ref = useRef(null);
  const [error, setError] = useState('');

  const pick = () => ref.current?.click();

  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = detectPlanType(file);

    if (type === 'unknown') {
      setError('Formato no soportado. Usa SVG, PNG, JPG, PDF, DWG o DXF.');
      e.target.value = '';
      return;
    }

    setError('');

    onLoadFile?.(file, {
      type,
      name: file.name,
      size: file.size,
      mime: file.type || '',
      extension: file.name.split('.').pop()?.toLowerCase() || '',
    });

    // permitir volver a cargar el mismo archivo
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={onChange}
      />

      <button
        onClick={pick}
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid #ddd',
          cursor: 'pointer',
          fontWeight: 700,
          background: '#fff',
        }}
        title="Carga SVG, PNG, JPG, PDF, DWG o DXF"
      >
        + Cargar plano 2D
      </button>

      <div style={{ fontSize: 12, opacity: 0.75 }}>Formatos: SVG, PNG, JPG, PDF, DWG, DXF</div>

      {error ? (
        <div
          style={{
            fontSize: 12,
            color: '#b42318',
            background: '#fef3f2',
            border: '1px solid #fecdca',
            borderRadius: 8,
            padding: '6px 8px',
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
