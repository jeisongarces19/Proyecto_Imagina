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
  // opcional: si quieres seguir usando el debug alert
  debugSaveAlert = false,
  onOpenBom,
  onCloseBom,
}) {
  const [open, setOpen] = useState(false);
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

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
    }
  };

  const doNew = () => {
    if (!canLoadSave) return;
    onNewProject?.();
    setOpen(false);
  };

  const doExit = () => {
    setOpen(false);
    onLogout?.();
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
      {/* LEFT: Menú Archivo */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            border: '1px solid transparent',
            background: open ? '#f3f4f6' : 'transparent',
            padding: '6px 10px',
            borderRadius: 8,
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
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              zIndex: 9999,
            }}
          >
            <MenuItem label="Nuevo" disabled={!canLoadSave} onClick={doNew} />
            <MenuItem label="Abrir…" disabled={!canLoadSave} onClick={doOpen} />
            <MenuItem label="Guardar" disabled={!canLoadSave} onClick={doSave} />
            <div style={{ height: 1, background: '#e5e7eb', margin: '6px 0' }} />
            <MenuItem label="Salir" onClick={doExit} />
          </div>
        )}

        {/* Input oculto del Abrir */}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={onPickFile}
          disabled={!canLoadSave}
        />

        {/* País (si lo quieres en la barra) */}
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{
            height: 30,
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

      {/* RIGHT: estado sesión */}
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
      onMouseDown={(e) => e.preventDefault()} // evita perder foco raro
    >
      {label}
    </button>
  );
}
