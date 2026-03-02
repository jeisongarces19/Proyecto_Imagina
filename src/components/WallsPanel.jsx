import React from 'react';

export default function WallsPanel({
  wallMode,
  setWallMode,
  wallHeight,
  setWallHeight,
  wallThickness,
  setWallThickness,
  onUndoLastWall,
  onClearWalls,
  onExportSvg,
  onExportPng,
  onExportPdf,
  wallsCount = 0,
  readOnly = false,
}) {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Muros</h3>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <button
          onClick={() => !readOnly && setWallMode(!wallMode)}
          disabled={readOnly}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: wallMode ? '#111' : '#fff',
            color: wallMode ? '#fff' : '#111',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            opacity: readOnly ? 0.6 : 1,
          }}
        >
          {wallMode ? 'Modo muros: ON' : 'Modo muros: OFF'}
        </button>

        <span style={{ fontSize: 12, color: '#666' }}>Muros: {wallsCount}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: '#444' }}>
          Altura (m)
          <input
            type="number"
            min={0.1}
            step={0.05}
            value={wallHeight}
            onChange={(e) => !readOnly && setWallHeight(parseFloat(e.target.value || '0'))}
            disabled={readOnly}
            style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>

        <label style={{ fontSize: 12, color: '#444' }}>
          Grosor (m)
          <input
            type="number"
            min={0.01}
            step={0.005}
            value={wallThickness}
            onChange={(e) => !readOnly && setWallThickness(parseFloat(e.target.value || '0'))}
            disabled={readOnly}
            style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => !readOnly && onUndoLastWall?.()}
          disabled={readOnly}
          style={{
            padding: '7px 10px',
            borderRadius: 10,
            border: '1px solid #ddd',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            opacity: readOnly ? 0.6 : 1,
          }}
        >
          Deshacer último
        </button>
        <button
          onClick={() => !readOnly && onClearWalls?.()}
          disabled={readOnly}
          style={{
            padding: '7px 10px',
            borderRadius: 10,
            border: '1px solid #ddd',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            opacity: readOnly ? 0.6 : 1,
          }}
        >
          Borrar todo
        </button>
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #eee' }}>
        <div style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>
          <b>Exportar planta</b>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={onExportSvg}
            style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer' }}
          >
            Exportar SVG
          </button>
          <button
            onClick={onExportPng}
            style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer' }}
          >
            Exportar PNG
          </button>
          <button
            onClick={onExportPdf}
            style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer' }}
          >
            Exportar PDF
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#777', lineHeight: 1.35 }}>
          PDF abre la ventana de impresión (puedes elegir “Guardar como PDF”).
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: '#666', lineHeight: 1.35 }}>
        <div><b>Cómo trazar:</b> activa “Modo muros”, luego haz click para poner puntos.</div>
        <div><b>Terminar muro:</b> doble click.</div>
        <div><b>Cancelar trazo:</b> tecla Esc.</div>
      </div>
    </div>
  );
}
