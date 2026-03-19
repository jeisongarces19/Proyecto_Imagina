// src/components/TopMenuBar.jsx
import { useMemo, useRef, useState } from 'react';

export default function TopMenuBar({
  user,
  perms,
  country,
  setCountry,
  catalogCountries = [],
  materialsByCode,
  threeApiRef,
  onLogout,
  onNewProject,
  debugSaveAlert = false,
  onOpenBom,
  onCloseBom,
  onExportSvg,
  onExportPng,
  onExportPdf,
}) {
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const fileRef = useRef(null);

  const canLoadSave = !!perms?.canLoadSave;

  const labelUser = useMemo(() => {
    const ses = user?.label || user?.role || '—';
    const u = user?.username || '';
    return u ? `${ses} · ${u}` : ses;
  }, [user]);

  const doSave = () => {
    const data = threeApiRef.current?.exportProject?.();
    if (!data) return;

    if (debugSaveAlert) {
      alert(
        JSON.stringify(
          {
            firstPartKeys: Object.keys(data.parts?.[0] || {}),
            firstFinishes: data.parts?.[0]?.finishes || null,
            finishesCount: data.parts?.[0]?.finishes
              ? Object.keys(data.parts[0].finishes).length
              : 0,
          },
          null,
          2
        )
      );
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'proyecto-imagina.json';
    a.click();
  };

  const doOpen = () => {
    if (!canLoadSave) return;
    fileRef.current?.click();
  };

  const onPickFile = async (e) => {
    try {
      if (!canLoadSave) return;

      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const json = JSON.parse(text);

      if (!materialsByCode || materialsByCode.size === 0) {
        alert('Aún no se han cargado los materiales. Espera un momento y vuelve a intentar.');
        return;
      }

      threeApiRef.current?.loadProject?.(json);
    } catch (err) {
      console.error('Error cargando JSON:', err);
      alert('No pude cargar el proyecto. Revisa que sea un JSON válido.');
    } finally {
      e.target.value = '';
      setOpen(false);
      setExportOpen(false);
    }
  };

  const doNew = () => {
    if (!canLoadSave) return;
    onNewProject?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExit = () => {
    setOpen(false);
    setExportOpen(false);
    onLogout?.();
  };

  const doExportSvg = () => {
    onExportSvg?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExportPng = () => {
    onExportPng?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExportPdf = () => {
    onExportPdf?.();
    setOpen(false);
    setExportOpen(false);
  };

  return (
    <div
      style={{
        height: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        borderBottom: '1px solid #e5e5e5',
        background: '#fff',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setExportOpen(false);
          }}
          style={{
            border: '1px solid #111',
            background: open ? '#f3f4f6' : '#fff',
            padding: '6px 12px',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 800,
          }}
        >
          Archivo
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 0,
              width: 220,
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 12,
              boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
              overflow: 'visible',
              zIndex: 9999,
            }}
          >
            <MenuItem label="Nuevo" disabled={!canLoadSave} onClick={doNew} />
            <MenuItem label="Abrir..." disabled={!canLoadSave} onClick={doOpen} />
            <MenuItem label="Guardar" disabled={!canLoadSave} onClick={doSave} />

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: 'none',
                  background: exportOpen ? '#f3f4f6' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                exportar 2d
              </button>

              {exportOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    width: 220,
                    background: '#fff',
                    border: '1px solid #111',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
                    zIndex: 10000,
                  }}
                >
                  <MenuItem label="Exportar SVG" onClick={doExportSvg} />
                  <MenuItem label="Exportar PNG" onClick={doExportPng} />
                  <MenuItem label="Exportar PDF" onClick={doExportPdf} />
                  <div style={{ marginTop: 8, fontSize: 11, color: '#777', lineHeight: 1.35 }}>
                    PDF abre la ventana de impresión (puedes elegir “Guardar como PDF”).
                  </div>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: '#e5e7eb', margin: '6px 0' }} />
            <MenuItem label="Salir" onClick={doExit} />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={onPickFile}
          disabled={!canLoadSave}
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{
            height: 34,
            borderRadius: 8,
            border: '1px solid #ddd',
            padding: '0 8px',
          }}
        >
          {catalogCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>
        {labelUser}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onOpenBom}>Abrir BOM</button>
          <button onClick={onCloseBom}>Cerrar BOM</button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 800,
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
