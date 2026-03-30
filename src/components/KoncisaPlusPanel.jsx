import { useMemo, useState } from 'react';

/*
function redondearLargoSencillo(mm) {
  const metros = mm / 1000;

  if (metros <= 1) return 1000;
  if (metros > 1 && metros <= 1.2) return 1200;
  if (metros > 1.2 && metros <= 1.5) return 1500;
  return 1200;
}
*/

function redondearLargo(mm) {
  if (mm <= 1000) return 1000;
  if (mm <= 1200) return 1200;
  if (mm <= 1500) return 1500;
  return 1200;
}

function redondearAnchoSencillo(mm) {
  if (mm <= 600) return 600;
  if (mm <= 700) return 700;
  if (mm <= 750) return 750;
  return 600;
}

function redondearAnchoDoble(mm) {
  if (mm <= 1200) return 1200;
  if (mm <= 1500) return 1500;
  return 1200;
}

export default function KoncisaPlusPanel({ onCreate }) {
  const [puestos, setPuestos] = useState(1);
  const [tipoPuesto, setTipoPuesto] = useState('sencillo'); // sencillo | doble
  const [modoEspecial, setModoEspecial] = useState(false);

  const [largoRealMm, setLargoRealMm] = useState(1200);
  const [anchoRealMm, setAnchoRealMm] = useState(600);

  const [grommet, setGrommet] = useState(true);

  const largoCobroMm = useMemo(() => {
    return redondearLargo(largoRealMm);
  }, [largoRealMm]);

  const anchoCobroMm = useMemo(() => {
    return tipoPuesto === 'sencillo'
      ? redondearAnchoSencillo(anchoRealMm)
      : redondearAnchoDoble(anchoRealMm);
  }, [anchoRealMm, tipoPuesto]);

  const opcionesLargoNormal = tipoPuesto === 'sencillo' ? [1000, 1200, 1500] : [1000, 1200, 1500];

  const opcionesAnchoNormal = tipoPuesto === 'sencillo' ? [600, 750] : [1200, 1500];

  const opcionesLargoEspecial = [1000, 1100, 1150, 1200, 1300, 1400, 1500];

  const opcionesAnchoEspecial =
    tipoPuesto === 'sencillo' ? [600, 700, 750] : [1200, 1300, 1400, 1500];

  const handleTipoPuestoChange = (value) => {
    setTipoPuesto(value);

    if (value === 'sencillo') {
      setAnchoRealMm(600);
    } else {
      setAnchoRealMm(1200);
    }

    setLargoRealMm(1200);
  };

  const handleCreate = () => {
    onCreate({
      puestos,
      tipoPuesto,
      modoEspecial,
      largoRealMm,
      anchoRealMm,
      largoCobroMm,
      anchoCobroMm,
      hasGrommet: grommet,
      hasDuct: true,
    });
  };

  const opcionesLargo = modoEspecial ? opcionesLargoEspecial : opcionesLargoNormal;
  const opcionesAncho = modoEspecial ? opcionesAnchoEspecial : opcionesAnchoNormal;

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Koncisa Plus</h3>

      <div>
        <label>Tipo de puesto</label>
        <select
          value={tipoPuesto}
          onChange={(e) => handleTipoPuestoChange(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="sencillo">Sencillo</option>
          <option value="doble">Doble</option>
        </select>
      </div>

      <div>
        <label>Puestos</label>
        <select
          value={puestos}
          onChange={(e) => setPuestos(Number(e.target.value))}
          style={{ width: '100%' }}
        >
          <option value={1}>1 puesto</option>
          <option value={2}>2 puestos</option>
          <option value={3}>3 puestos</option>
        </select>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={modoEspecial}
            onChange={(e) => setModoEspecial(e.target.checked)}
          />{' '}
          Puesto especial
        </label>
      </div>

      <div>
        <label>Largo real</label>
        <select
          value={largoRealMm}
          onChange={(e) => setLargoRealMm(Number(e.target.value))}
          style={{ width: '100%' }}
        >
          {opcionesLargo.map((v) => (
            <option key={v} value={v}>
              {v} mm
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Ancho real</label>
        <select
          value={anchoRealMm}
          onChange={(e) => setAnchoRealMm(Number(e.target.value))}
          style={{ width: '100%' }}
        >
          {opcionesAncho.map((v) => (
            <option key={v} value={v}>
              {v} mm
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>
          <input type="checkbox" checked={grommet} onChange={(e) => setGrommet(e.target.checked)} />{' '}
          Grommet
        </label>
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 10,
          background: '#fafafa',
          fontSize: 13,
        }}
      >
        <div>
          <b>Resumen técnico</b>
        </div>
        <div>Largo real: {largoRealMm} mm</div>
        <div>Ancho real: {anchoRealMm} mm</div>
        <div>Largo de cobro/código: {largoCobroMm} mm</div>
        <div>Ancho de cobro/código: {anchoCobroMm} mm</div>
      </div>

      <button onClick={handleCreate}>Crear puesto</button>
    </div>
  );
}
