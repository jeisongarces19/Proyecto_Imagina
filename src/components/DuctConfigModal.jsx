export default function DuctConfigModal({ open, onClose, puestos, ductModes, setDuctModes }) {
  if (!open) return null;

  const updateMode = (index, value) => {
    const copy = [...ductModes];
    copy[index] = value;
    setDuctModes(copy);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 420,
          background: '#fff',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3>Configurar ductos</h3>

        {Array.from({ length: puestos }).map((_, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <label>Módulo {i + 1}</label>
            <select
              value={ductModes[i] || 'TERMINAL'}
              onChange={(e) => updateMode(i, e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="TERMINAL">Terminal</option>
              <option value="INTERMEDIO">Intermedio</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
