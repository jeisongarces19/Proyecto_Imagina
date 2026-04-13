/*
function redondearLargoSencillo(mm) {
  const metros = mm / 1000;

  if (metros <= 1) return 1000;
  if (metros > 1 && metros <= 1.2) return 1200;
  if (metros > 1.2 && metros <= 1.5) return 1500;
  return 1200;
}
*/
import { useMemo, useState, useEffect } from 'react';
import { KONCISA_SURFACE_FINISH_OPTIONS } from '../koncisaPlus/rules/koncisaSurfaceFinishOptions';
import DuctConfigModal from './DuctConfigModal';

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
  const [tipoPuesto, setTipoPuesto] = useState('sencillo');
  const [modoEspecial, setModoEspecial] = useState(false);

  const [largoRealMm, setLargoRealMm] = useState(1200);
  const [anchoRealMm, setAnchoRealMm] = useState(600);

  const [grommet, setGrommet] = useState(true);
  const [tipoPasoCable, setTipoPasoCable] = useState('none');
  const [grommetFinish, setGrommetFinish] = useState('ALUMINIUM');
  const [selectedFinishId, setSelectedFinishId] = useState('FORMICA_30');

  const [tipoCostado, setTipoCostado] = useState('RECT');

  const selectedFinish = useMemo(() => {
    return (
      KONCISA_SURFACE_FINISH_OPTIONS.find((f) => f.id === selectedFinishId) ||
      KONCISA_SURFACE_FINISH_OPTIONS[0]
    );
  }, [selectedFinishId]);

  const largoCobroMm = useMemo(() => {
    return redondearLargo(largoRealMm);
  }, [largoRealMm]);

  const anchoCobroMm = useMemo(() => {
    return tipoPuesto === 'sencillo'
      ? redondearAnchoSencillo(anchoRealMm)
      : redondearAnchoDoble(anchoRealMm);
  }, [anchoRealMm, tipoPuesto]);

  const opcionesLargoNormal = [1000, 1200, 1500];

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
      tipoCostado,
      modoEspecial,
      largoRealMm,
      anchoRealMm,
      largoCobroMm,
      anchoCobroMm,
      tipoPasoCable,
      pasacablePosition,
      grommetFinish,
      hasDuct: true,
      finishCode: selectedFinish.finishCode,
      thickMm: selectedFinish.thickMm,
      variant: selectedFinish.variant,
      finishLabel: selectedFinish.label,
      ductModes,
    });
  };

  const opcionesLargo = modoEspecial ? opcionesLargoEspecial : opcionesLargoNormal;
  const opcionesAncho = modoEspecial ? opcionesAnchoEspecial : opcionesAnchoNormal;

  const [pasacablePosition, setPasacablePosition] = useState('CENTER');

  useEffect(() => {
    if (tipoPasoCable !== 'pasacable') {
      setPasacablePosition('CENTER');
    }
  }, [tipoPasoCable]);

  const [ductConfigOpen, setDuctConfigOpen] = useState(false);
  const [ductModes, setDuctModes] = useState([]);

  useEffect(() => {
    setDuctModes((prev) => {
      const next = Array.from({ length: puestos }, (_, i) => prev[i] || 'TERMINAL');
      return next;
    });
  }, [puestos]);

  const opcionesCostado =
    tipoPuesto === 'sencillo'
      ? [
          { value: 'RECT', label: 'Rectangular' },
          { value: 'TEK_DER', label: 'Tek derecho' },
          { value: 'TEK_IZQ', label: 'Tek izquierdo' },
          { value: 'ORTOGONAL_DER', label: 'Ortogonal derecho' },
          { value: 'ORTOGONAL_IZQ', label: 'Ortogonal izquierdo' },
          { value: 'O', label: 'O' },
          { value: 'CURVO_DER', label: 'Curvo derecho' },
          { value: 'CURVO_IZQ', label: 'Curvo izquierdo' },
          { value: 'TRAP_DER', label: 'Trapecial derecho' },
          { value: 'TRAP_IZQ', label: 'Trapecial izquierdo' },
        ]
      : [
          { value: 'RECT', label: 'Rectangular' },
          { value: 'TEK', label: 'Tek' },
          { value: 'ORTOGONAL', label: 'Ortogonal' },
          { value: 'O', label: 'O' },
          { value: 'CURVO', label: 'Curvo' },
          { value: 'TRAP', label: 'Trapecial' },
        ];

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
          <option value={4}>4 puestos</option>
          <option value={5}>5 puestos</option>
          <option value={6}>6 puestos</option>
          <option value={7}>7 puestos</option>
          <option value={8}>8 puestos</option>
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
        <label>Acabado / tipo de superficie</label>
        <select
          value={selectedFinishId}
          onChange={(e) => setSelectedFinishId(e.target.value)}
          style={{ width: '100%' }}
        >
          {KONCISA_SURFACE_FINISH_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={() => setDuctConfigOpen(true)}>
        Configurar ductos
      </button>

      <DuctConfigModal
        open={ductConfigOpen}
        onClose={() => setDuctConfigOpen(false)}
        puestos={puestos}
        ductModes={ductModes}
        setDuctModes={setDuctModes}
      />

      <div>
        <label>Tipo de costado</label>
        <select
          value={tipoCostado}
          onChange={(e) => setTipoCostado(e.target.value)}
          style={{ width: '100%' }}
        >
          {opcionesCostado.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Acceso para cableado</label>
        <select
          value={tipoPasoCable}
          onChange={(e) => setTipoPasoCable(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="none">Ninguno</option>
          <option value="grommet">Grommet</option>
          <option value="pasacable">Pasacable</option>
        </select>
      </div>
      {/* =========================
    PASACABLE
========================= */}
      {tipoPasoCable === 'pasacable' && (
        <div>
          <label>Posición pasacables</label>

          {tipoPuesto === 'sencillo' && (
            <select
              value={pasacablePosition}
              onChange={(e) => setPasacablePosition(e.target.value)}
            >
              <option value="LEFT">Izquierda</option>
              <option value="CENTER">Centro</option>
              <option value="RIGHT">Derecha</option>
            </select>
          )}

          {tipoPuesto === 'doble' && (
            <select
              value={pasacablePosition}
              onChange={(e) => setPasacablePosition(e.target.value)}
            >
              <option value="CENTER">Centro</option>
              <option value="LEFT_RIGHT">Izq - Der</option>
              <option value="LEFT_LEFT">Izq - Izq</option>
              <option value="RIGHT_RIGHT">Der - Der</option>
            </select>
          )}
        </div>
      )}

      {/* =========================
    GROMMET
========================= */}
      {tipoPasoCable === 'grommet' && (
        <div>
          <label>Acabado del grommet</label>
          <select
            value={grommetFinish}
            onChange={(e) => setGrommetFinish(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="ALUMINIUM">Aluminium</option>
            <option value="PAINTED">Painted</option>
            <option value="METALICO">Metálico</option>
            <option value="ALUMINIUM_PINTADO">Aluminium pintado</option>
          </select>
        </div>
      )}
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
        <div>Acabado: {selectedFinish.label}</div>
        <div>Finish code: {selectedFinish.finishCode}</div>
        <div>Espesor: {selectedFinish.thickMm} mm</div>
        <div>Variante: {selectedFinish.variant || 'base'}</div>
      </div>
      <button onClick={handleCreate}>Crear puesto</button>
    </div>
  );
}
