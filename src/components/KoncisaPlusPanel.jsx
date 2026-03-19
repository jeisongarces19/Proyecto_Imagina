import { useState } from 'react';

export default function KoncisaPlusPanel({ onCreate }) {
  const [puestos, setPuestos] = useState(1);
  const [width, setWidth] = useState(1200);
  const [grommet, setGrommet] = useState(true);

  const handleCreate = () => {
    onCreate({
      puestos,
      widthMm: width,
      hasGrommet: grommet,
      hasDuct: true,
    });
  };

  return (
    <div style={{ padding: 12 }}>
      <h3>Koncisa Plus</h3>

      {/* PUESTOS */}
      <div>
        <label>Puestos</label>
        <select value={puestos} onChange={(e) => setPuestos(Number(e.target.value))}>
          <option value={1}>1 puesto</option>
          <option value={2}>2 puestos</option>
          <option value={3}>3 puestos</option>
        </select>
      </div>

      {/* MEDIDA */}
      <div>
        <label>Medida</label>
        <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
          <option value={1200}>1.20 m</option>
          <option value={1500}>1.50 m</option>
        </select>
      </div>

      {/* OPCIONES */}
      <div>
        <label>
          <input type="checkbox" checked={grommet} onChange={(e) => setGrommet(e.target.checked)} />
          Grommet
        </label>
      </div>

      <button onClick={handleCreate} style={{ marginTop: 10 }}>
        Crear puesto
      </button>
    </div>
  );
}
