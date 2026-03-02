import React, { useRef } from 'react';

export default function Plan2DUploader({ onLoadFile, accept = '.svg,.png,.jpg,.jpeg' }) {
  const ref = useRef(null);

  const pick = () => ref.current?.click();

  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onLoadFile?.(file);
    e.target.value = ''; // permitir volver a cargar el mismo archivo
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
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
        }}
      >
        + Cargar plano 2D
      </button>
    </div>
  );
}
