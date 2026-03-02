// src/App.jsx
import './App.css';
import { useEffect, useRef, useState, useMemo } from 'react';

import ThreeCanvas from './components/ThreeCanvas';
import CatalogPanel from './components/CatalogPanel';
import PropertiesPanel from './components/PropertiesPanel';
import SurfaceModal from './components/SurfaceModal';
import WallsPanel from './components/WallsPanel';

import { buildCatalogFromXml, CATALOG_COUNTRIES } from './catalog/buildCatalogFromXml';
import { loadMaterialsFromGenEsp } from './data/materialLoader';

import {
  generatePlanSvg,
  downloadTextFile,
  exportSvgToPng,
  printSvgAsPdf,
} from './utils/planExport';

//2d
import Plan2DOverlay from './components/Plan2DOverlay';
import BOMWindow from './components/BOMWindow';
import BOMView from './components/BOMView';
import { catalogByCodigoPT } from './catalog/catalogData';

import Plan2DUploader from './components/Plan2DUploader';

import { exportProjectPPT } from './exports/exportPPT';

import { useAuth, getRolePermissions } from './auth/AuthContext.jsx';

function normalizeCode(code) {
  return String(code ?? '').trim();
}

function getCatalogItemByAnyKey(code) {
  const k = normalizeCode(code);

  // intento 1: string
  if (catalogByCodigoPT?.get) {
    const a = catalogByCodigoPT.get(k);
    if (a) return a;
  }

  // intento 2: number (por si el Map fue construido con keys numéricas)
  const n = Number(k);
  if (Number.isFinite(n) && catalogByCodigoPT?.get) {
    const b = catalogByCodigoPT.get(n);
    if (b) return b;
  }

  // intento 3: búsqueda manual (último recurso, pero salva la vida)
  if (catalogByCodigoPT?.values) {
    for (const it of catalogByCodigoPT.values()) {
      const itKey = normalizeCode(it?.codigoPT);
      if (itKey === k) return it;
    }
  }

  return null;
}

function getUnitPriceCO(item) {
  const raw = item?.prices?.CO;
  if (typeof raw === 'number') return raw;
  const v = Number(raw?.value ?? raw ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function unionAllowedCodes(genericos = [], ptCodesByGenerico) {
  const out = new Set();
  for (const gen of genericos) {
    const set = ptCodesByGenerico.get(String(gen));
    if (!set) continue;
    for (const code of set) out.add(String(code));
  }
  return Array.from(out);
}

export default function App() {
  const { user, logout } = useAuth();
  const perms = getRolePermissions(user?.role);
  const readOnly = !perms.canEdit;

  const threeApiRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedPartAcabado, setSelectedPartAcabado] = useState(null);

  // Muros
  const [wallMode, setWallMode] = useState(false);
  const [wallHeight, setWallHeight] = useState(2.4);
  const [wallThickness, setWallThickness] = useState(0.1);
  const [walls, setWalls] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [surfaceOpen, setSurfaceOpen] = useState(false);

  // Si se elimina/deselecciona en 3D, limpiamos selección 2D para evitar IDs “fantasma”
  useEffect(() => {
    if (!selectedPart) setSelectedIds([]);
  }, [selectedPart]);

  useEffect(() => {
    if (!selectedPartAcabado) setSelectedIds([]);
  }, [selectedPartAcabado]);

  const [country, setCountry] = useState('CO');
  const [catalogItems, setCatalogItems] = useState([]);
  const [byCode, setByCode] = useState(new Map());
  const [bomItems, setBomItems] = useState([]);
  const [bomOpen, setBomOpen] = useState(false);

  const handleBOMChange = (items) => {
    //console.log('BOM rows:', items);
    setBomItems(items || []);
  };

  const [materials, setMaterials] = useState([]);
  const [materialsAcabado, setMaterialsAcabado] = useState([]);

  const materialsByCode = useMemo(() => {
    const map = new Map();
    for (const m of materials || []) {
      if (!m) continue;
      map.set(String(m.code), m);
    }
    return map;
  }, [materials]);

  //console.log('[App] materials:', materials?.length, 'materialsByCode:', materialsByCode.size);

  const getPlanData = () => {
    const parts = threeApiRef.current?.getPartsSnapshot2D?.() || [];
    return { parts, walls };
  };

  const exportPlanSvg = () => {
    const { parts, walls } = getPlanData();
    const svg = generatePlanSvg({ parts, walls, title: 'Planta 2D (Piezas + Muros)' });
    downloadTextFile('planta_2d.svg', svg, 'image/svg+xml');
  };

  const exportPlanPng = async () => {
    const { parts, walls } = getPlanData();
    const svg = generatePlanSvg({ parts, walls, title: 'Planta 2D (Piezas + Muros)' });
    await exportSvgToPng(svg, { scale: 2, filename: 'planta_2d.png' });
  };

  const exportPlanPdf = () => {
    const { parts, walls } = getPlanData();
    const svg = generatePlanSvg({ parts, walls, title: 'Planta 2D (Piezas + Muros)' });
    printSvgAsPdf(svg, { title: 'Planta 2D' });
  };

  const [plan2DVisible, setPlan2DVisible] = useState(true);
  const [plan2DSrc, setPlan2DSrc] = useState(null);
  const plan2DUrlRef = useRef(null);

  const handleLoadPlan2D = (file) => {
    // Limpia URL anterior
    if (plan2DUrlRef.current) URL.revokeObjectURL(plan2DUrlRef.current);

    const url = URL.createObjectURL(file);
    plan2DUrlRef.current = url;
    setPlan2DSrc(url);
    setPlan2DVisible(true);
  };

  /* =====================================================
     FILTRO DE MATERIALES POR CÓDIGO GENÉRICO (✔ correcto)
     ===================================================== */
  const filteredMaterials = useMemo(() => {
    const gen = String(selectedPart?.generico || '').trim();

    if (!gen) return materials;

    return materials.filter((m) => String(m.groupCode || '').trim() === gen);
  }, [materials, selectedPart?.generico]);

  const filteredMaterialsAcabado = useMemo(() => {
    const gen = String(selectedPartAcabado?.generico || '').trim();

    if (!gen) return materialsAcabado;

    return materialsAcabado.filter((m) => String(m.groupCode || '').trim() === gen);
  }, [materialsAcabado, selectedPartAcabado?.generico]);

  const allowedFinishCodes = useMemo(() => {
    const pt = String(selectedPartAcabado?.code ?? '').trim();
    if (!pt) return null;

    const item = byCode?.get?.(pt) || null;
    const genericosRaw = item?.raw?.genericos || item?.genericos || [];

    const genericos = (Array.isArray(genericosRaw) ? genericosRaw : [])
      .map((g) => String(g).trim())
      .filter(Boolean);

    // si no hay genéricos => NO restringimos (muestra todos)
    if (!genericos.length) return null;

    // materials ya trae groupCode = COD_GENERICO y code = COD_ESPECIFICO
    const allowed = new Set();
    for (const m of materialsAcabado || []) {
      const g = String(m.groupCode || '').trim();
      if (g && genericos.includes(g)) {
        allowed.add(String(m.code));
      }
    }

    return allowed; // Set<string>
  }, [selectedPartAcabado?.code, byCode, materialsAcabado]);

  const materialsForPanel = useMemo(() => {
    if (!allowedFinishCodes) return materialsAcabado;
    return (materialsAcabado || []).filter((m) => allowedFinishCodes.has(String(m.code)));
  }, [materialsAcabado, allowedFinishCodes]);

  /* ==========================
     Cargar materiales (gen-esp)
     ========================== */
  useEffect(() => {
    (async () => {
      try {
        const mats = await loadMaterialsFromGenEsp('/data/xml/gen-esp_3.xml');
        setMaterials(mats);
        setMaterialsAcabado(mats);
      } catch (e) {
        console.error('Error cargando materiales:', e);
      }
    })();
  }, []);

  /* ==========================
     Cargar catálogo (ptsinbom)
     ========================== */
  useEffect(() => {
    (async () => {
      const { items, byCode } = await buildCatalogFromXml();
      setCatalogItems(items);
      setByCode(byCode);
    })().catch(console.error);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', height: '100vh' }}>
      {/* LEFT */}

      <div
        style={{
          borderRight: '1px solid #e5e5e5',
          padding: 12,
          background: '#fff',
          overflow: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0' }}>Productos/Materiales</h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 10,
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Sesión: {user?.label || user?.role}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Usuario: {user?.username}</div>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Salir
          </button>
        </div>

        <div style={{ marginTop: 6, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/*style={{ position: 'absolute', top: 12, right: 12, zIndex: 50, display: 'flex', gap: 8 }}*/}
          <button onClick={() => setBomOpen(true)}>Abrir BOM</button>
          <button onClick={() => setBomOpen(false)}>Cerrar BOM</button>
        </div>

        <Plan2DUploader onLoadFile={handleLoadPlan2D} />

        <button
          onClick={() => setPlan2DVisible((v) => !v)}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {plan2DVisible ? 'Ocultar plano' : 'Mostrar plano'}
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {CATALOG_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              const data = threeApiRef.current?.exportProject?.();
              if (!data) return;

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

              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
              });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'proyecto-imagina.json';
              a.click();
            }}
            disabled={!perms.canLoadSave}
          >
            Guardar
          </button>

          <label
            style={{
              border: '1px solid #ddd',
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              opacity: perms.canLoadSave ? 1 : 0.5,
            }}
          >
            Cargar
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              disabled={!perms.canLoadSave}
              onChange={async (e) => {
                if (!perms.canLoadSave) return;
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const json = JSON.parse(text);
                if (!materialsByCode || materialsByCode.size === 0) {
                  alert(
                    'Aún no se han cargado los materiales. Espera un momento y vuelve a intentar.'
                  );
                  return;
                }
                threeApiRef.current?.loadProject?.(json);
                e.target.value = '';
              }}
            />
          </label>

          <button
            onClick={() => perms.canLoadSave && threeApiRef.current?.clearProject?.()}
            disabled={!perms.canLoadSave}
          >
            Nuevo
          </button>
        </div>

        {/*<button onClick={() => threeApiRef.current?.addTypology?.('22000131997')}>
            Agregar tipología 22000131997
          </button>*/}

        <CatalogPanel
          country={country}
          items={catalogItems}
          disabled={!isReady || readOnly}
          onAddCatalogItem={(codigoPT) =>
            !readOnly && threeApiRef.current?.addCatalogItem?.(codigoPT)
          }
          onToggleSnap={() => !readOnly && threeApiRef.current?.toggleSnap?.()}
          onAddSurface={() => !readOnly && setSurfaceOpen(true)}
          onAddTypology={(codigoPT) => !readOnly && threeApiRef.current?.addTypology?.(codigoPT)} // ✅ NUEVO
        />

        {!isReady && (
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>Cargando visor...</div>
        )}
      </div>

      {/* CENTER */}
      <div style={{ minHeight: 0, position: 'relative' }}>
        {/* BOTONES UI */}
        <div
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}
        >
          {perms.canExport && (
            <>
              <button onClick={() => threeApiRef.current?.exportGLTF?.()}>Exportar GLB</button>
              <button onClick={() => threeApiRef.current?.exportDXF?.()}>
                Exportar DXF (planta)
              </button>
            </>
          )}
        </div>

        <ThreeCanvas
          walls={walls}
          readOnly={readOnly}
          materialsByCode={materialsByCode}
          onApiReady={(api) => {
            threeApiRef.current = api;
            setIsReady(true);
          }}
          onSelectionChange={setSelectedPart}
          onBOMChange={handleBOMChange}
        />
        <Plan2DOverlay
          getSnapshot={() => threeApiRef.current?.getPartsSnapshot2D?.() || []}
          selectedIds={selectedIds}
          onPickIds={(ids) => {
            setSelectedIds(ids);

            // opcional: si quieres que el 3D seleccione el último que tocaste
            const last = ids?.[ids.length - 1];
            if (last) threeApiRef.current?.selectPartById?.(last);
          }}
          // compat (si aún lo usas en otras partes)
          onPickId={(id) => threeApiRef.current?.selectPartById?.(id)}
          walls={walls}
          wallMode={wallMode}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          onAddWall={(wall) => setWalls((prev) => [...prev, wall])}
          onSetWalls={setWalls}
          height={240} // ✅ grande como antes
          invertZ={true} // ✅ si lo ves “vertical al revés”, cambia a false
        />

        {/* ✅ Ventana nueva del BOM */}
        <BOMWindow open={bomOpen} title="BOM - Proyecto" onClose={() => setBomOpen(false)}>
          <BOMView items={bomItems} />
        </BOMWindow>

        {/* Ayuda + export PPT */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            zIndex: 10,
            display: 'grid',
            gap: 10,
            maxWidth: 360,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              border: '1px solid #e5e7eb',
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(6px)',
              fontSize: 12,
              opacity: 0.95,
              lineHeight: 1.4,
            }}
          >
            <b>Controles</b>
            <br />• Mover pieza activa: <b>WASD</b> o <b>Flechas</b>
            <br />• Subir/Bajar: <b>Q</b> / <b>E</b>
            <br />• Snap: <b>Espacio</b>
            <br />• Eliminar pieza: <b>Supr</b> (Delete)
            {readOnly && (
              <div style={{ marginTop: 6, opacity: 0.8 }}>
                <b>Modo comercial:</b> navegación y exportación, sin edición.
              </div>
            )}
          </div>

          {perms.canExport && (
            <button
              onClick={() => {
                const planCanvas = document.querySelector('#plan2d-canvas');
                const planPng = planCanvas?.toDataURL?.('image/png');

                // mejor: usa tu ref real del renderer
                const threeCanvas = document.querySelector('canvas');
                const threePng = threeCanvas?.toDataURL?.('image/png') || null;

                exportProjectPPT({
                  projectName: 'Proyecto IMAGINA',
                  planPngDataUrl: planPng,
                  threePngDataUrl: threePng,
                  bomItems: bomItems,
                });
              }}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid #111827',
                background: '#111827',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              Exportar PowerPoint
            </button>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ borderLeft: '1px solid #e5e5e5', background: '#fff', overflow: 'auto' }}>
        <WallsPanel
          wallMode={wallMode}
          setWallMode={setWallMode}
          wallHeight={wallHeight}
          setWallHeight={setWallHeight}
          wallThickness={wallThickness}
          setWallThickness={setWallThickness}
          wallsCount={walls.length}
          onUndoLastWall={() => setWalls((prev) => prev.slice(0, -1))}
          onClearWalls={() => setWalls([])}
          onExportSvg={exportPlanSvg}
          onExportPng={exportPlanPng}
          onExportPdf={exportPlanPdf}
          readOnly={readOnly}
        />

        <PropertiesPanel
          part={selectedPart}
          partAcabado={materialsForPanel}
          bomItems={bomItems}
          country={country}
          byCode={byCode}
          api={threeApiRef.current}
          materials={filteredMaterials} // ✅ SOLO LOS DEL GENÉRICO
          materialsAcabado={filteredMaterialsAcabado}
          materialsByCode={materialsByCode}
          readOnly={readOnly}
        />
      </div>

      {/* MODAL */}
      <SurfaceModal
        open={surfaceOpen}
        onClose={() => setSurfaceOpen(false)}
        lines={['LINK.SYS', 'KONCISA.PLUS']}
        defaultLine="LINK.SYS"
        onCreate={({ line, widthMm, depthMm, thickMm, codigoPT }) => {
          setSurfaceOpen(false);

          threeApiRef.current?.addSurface?.({
            line,
            codigoPT,
            widthM: widthMm / 1000,
            depthM: depthMm / 1000,
            thicknessM: thickMm / 1000,
            dim: { widthMm, depthMm, thickMm },
          });
        }}
      />

      {/* (Se movió ayuda + export PPT al overlay del visor para evitar romper el grid) */}
    </div>
  );
}
