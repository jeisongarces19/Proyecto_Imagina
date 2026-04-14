// src/App.jsx
import './App.css';
import { useEffect, useRef, useState, useMemo } from 'react';

import ThreeCanvas from './components/ThreeCanvas';
import CatalogPanel from './components/CatalogPanel';
import PropertiesPanel from './components/PropertiesPanel';
import SurfaceModal from './components/SurfaceModal';

import TopMenuBar from './components/TopMenuBar';

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

import LeftRail from './components/LeftRail';
import LeftPanel from './components/LeftPanel';

import { loadCategoriasIntranet } from './services/categoriasIntranet.js';

import PropertiesPopup from './components/PropertiesPopup';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function pdfFileToDataUrl(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL('image/png');
}

function normalizeCode(code) {
  return String(code ?? '').trim();
}

function _getCatalogItemByAnyKey(code) {
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

function _getUnitPriceCO(item) {
  const raw = item?.prices?.CO;
  if (typeof raw === 'number') return raw;
  const v = Number(raw?.value ?? raw ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function _unionAllowedCodes(genericos = [], ptCodesByGenerico) {
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
  const [threeApi, setThreeApi] = useState(null);

  const [isReady, setIsReady] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedPartAcabado, _setSelectedPartAcabado] = useState(null);

  // Muros
  const [wallMode, setWallMode] = useState('NONE');
  const [wallHeight, setWallHeight] = useState(2.4);
  const [wallThickness, setWallThickness] = useState(0.1);
  const [walls, setWalls] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [surfaceOpen, setSurfaceOpen] = useState(false);

  //Tipologias
  const [leftSection, setLeftSection] = useState('catalog');
  const [categoriasRaw, setCategoriasRaw] = useState([]);
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState([]);
  const [selectedNombreCategoria, setSelectedNombreCategoria] = useState('');
  const [selectedCategoriaTipologiaId, setSelectedCategoriaTipologiaId] = useState(null);

  const [profundidadFilter, setProfundidadFilter] = useState('');
  const [longitudFilter, setLongitudFilter] = useState('');
  const [espesorFilter, setEspesorFilter] = useState('');

  //La Parte Superior o barra horizontal de opciones, archivo, etc
  const _handleSave = () => {
    const data = threeApiRef.current?.exportProject?.();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'proyecto-imagina.json';
    a.click();
  };

  const _handleOpenFile = async (file) => {
    const text = await file.text();
    const json = JSON.parse(text);

    // IMPORTANTE: llama tu API load (la que ya tienes con pendingProject)
    threeApiRef.current?.loadProject?.(json);
    // o si tu flujo es setProjectToLoad(json), usa el tuyo.
  };

  const handleNew = () => {
    threeApiRef.current?.clearProject?.(); // si expusiste clearProject
    // o resetea el estado del proyecto como lo tengas
  };

  const _handleExit = () => {
    // en web no se puede “cerrar” la pestaña por seguridad
    // pero puedes ir a Home, limpiar, abrir modal, etc.
    handleNew();
  };

  //////////////////////////

  // Si se elimina/deselecciona en 3D, limpiamos selección 2D para evitar IDs “fantasma”
  useEffect(() => {
    if (!selectedPart) {
      const timer = setTimeout(() => setSelectedIds([]), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedPart]);

  useEffect(() => {
    if (!selectedPartAcabado) {
      const timer = setTimeout(() => setSelectedIds([]), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedPartAcabado]);

  const [country, setCountry] = useState('CO');
  const [catalogItems, setCatalogItems] = useState([]);
  const [byCode, setByCode] = useState(new Map());
  const [bomItems, setBomItems] = useState([]);
  const [bomOpen, setBomOpen] = useState(false);

  const bomTotal = useMemo(() => {
    return (bomItems || []).reduce((acc, it) => {
      const qty = Number(it?.qty || 0);
      const unitPrice = Number(it?.unitPrice ?? it?.price ?? 0);
      const lineTotal = Number(it?.total ?? qty * unitPrice);
      return acc + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);
  }, [bomItems]);

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
  const [plan2DKind, setPlan2DKind] = useState(null);
  const [plan2DName, setPlan2DName] = useState('');
  const [plan2DTransform, setPlan2DTransform] = useState({
    metersPerPixel: 0.01, // temporal, luego se calibra
    offsetX: 0,
    offsetZ: 0,
    opacity: 0.35,
  });
  const plan2DUrlRef = useRef(null);

  const handleLoadPlan2D = async (file, meta) => {
    if (!file) return;

    if (plan2DUrlRef.current) {
      URL.revokeObjectURL(plan2DUrlRef.current);
      plan2DUrlRef.current = null;
    }

    const type = meta?.type || 'unknown';
    setPlan2DKind(type);
    setPlan2DName(meta?.name || file.name || '');

    if (type === 'image' || type === 'svg') {
      const url = URL.createObjectURL(file);
      plan2DUrlRef.current = url;
      setPlan2DSrc(url);
      setPlan2DVisible(true);
      return;
    }

    if (type === 'pdf') {
      try {
        const dataUrl = await pdfFileToDataUrl(file);
        setPlan2DSrc(dataUrl);
        setPlan2DKind('image');
        setPlan2DVisible(true);
        return;
      } catch (err) {
        console.error('Error renderizando PDF:', err);
        alert('No se pudo convertir el PDF a imagen para mostrarlo en 2D.');
        setPlan2DSrc(null);
        return;
      }
    }

    if (type === 'dwg') {
      alert(
        'El DWG no se puede renderizar directo en este visor. Convierte el archivo a DXF o SVG para visualizarlo en 2D.'
      );
      setPlan2DSrc(null);
      setPlan2DVisible(true);
      return;
    }

    if (type === 'dxf') {
      alert(
        'El DXF ya fue detectado, pero todavía falta integrar su renderer/parser. Por ahora usa SVG, imagen o PDF.'
      );
      setPlan2DSrc(null);
      setPlan2DVisible(true);
      return;
    }

    setPlan2DSrc(null);
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
     Cargar Tipologias por categorias (categorias_intranet)
     ========================== */

  useEffect(() => {
    async function load() {
      const data = await loadCategoriasIntranet();
      setCategoriasRaw(data);

      const map = {};

      data.forEach((c) => {
        const nombre = String(c.nombre || '').trim();
        if (!nombre) return;

        if (!map[nombre]) {
          map[nombre] = [];
        }

        map[nombre].push({
          id: c.id,
          padre_id: c.padre_id,
          slug: c.slug,
          nombre: c.nombre,
        });
      });

      const arr = Object.entries(map).map(([nombre, items]) => ({
        nombre,
        items,
      }));

      setCategoriasAgrupadas(arr);
    }

    load();
  }, []);

  const categoriasPorNombre = useMemo(() => {
    if (!selectedNombreCategoria) return [];
    return categoriasRaw.filter((c) => c.nombre === selectedNombreCategoria);
  }, [categoriasRaw, selectedNombreCategoria]);

  const categoriaIdsSeleccionados = useMemo(() => {
    if (selectedCategoriaTipologiaId) {
      return [Number(selectedCategoriaTipologiaId)];
    }

    if (selectedNombreCategoria) {
      return categoriasPorNombre.map((c) => Number(c.id));
    }

    return null;
  }, [selectedCategoriaTipologiaId, selectedNombreCategoria, categoriasPorNombre]);

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

  const [floatingEditor, setFloatingEditor] = useState({
    open: false,
    x: 0,
    y: 0,
    part: null,
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TOP BAR */}
      <TopMenuBar
        user={user}
        perms={perms}
        country={country}
        setCountry={setCountry}
        catalogCountries={CATALOG_COUNTRIES}
        materialsByCode={materialsByCode}
        threeApiRef={threeApiRef}
        onLogout={logout}
        onNewProject={() => threeApiRef.current?.clearProject?.()}
        debugSaveAlert={false}
        onOpenBom={() => setBomOpen(true)}
        onCloseBom={() => setBomOpen(false)}
        bomOpen={bomOpen}
        bomTotal={bomTotal}
        onExportSvg={exportPlanSvg}
        onExportPng={exportPlanPng}
        onExportPdf={exportPlanPdf}
      />

      {/* APP GRID */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '20% 70% 10%',
          minHeight: 0,
        }}
      >
        {/* LEFT (Rail + Panel estilo CET) */}
        <div style={{ display: 'flex', minHeight: 0, borderRight: '1px solid #e5e5e5' }}>
          <LeftRail active={leftSection} onChange={setLeftSection} />
          {/* CONTENEDOR VERTICAL */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* SELECT ARRIBA */}
            {leftSection === 'typologies' && (
              <div style={{ padding: 8, borderBottom: '1px solid #e5e5e5', background: '#fafafa' }}>
                {/* Select 1: Nombre */}
                <select
                  value={selectedNombreCategoria}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedNombreCategoria(value);
                    setSelectedCategoriaTipologiaId(null);
                    setProfundidadFilter('');
                    setLongitudFilter('');
                    setEspesorFilter('');
                  }}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    marginBottom: 8,
                  }}
                >
                  <option value="">Todas las líneas</option>

                  {categoriasAgrupadas.map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>

                {/* Select 2: Id dentro del nombre seleccionado */}
                <select
                  value={selectedCategoriaTipologiaId || ''}
                  onChange={(e) => {
                    setSelectedCategoriaTipologiaId(e.target.value ? Number(e.target.value) : null);

                    setProfundidadFilter('');
                    setLongitudFilter('');
                    setEspesorFilter('');
                  }}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                  }}
                  disabled={!selectedNombreCategoria}
                >
                  <option value="">
                    {selectedNombreCategoria
                      ? 'Todas las variantes de esta línea'
                      : 'Primero selecciona una línea'}
                  </option>

                  {categoriasPorNombre.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.slug}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PANEL */}
            <LeftPanel
              section={leftSection}
              threeApiRef={threeApiRef}
              readOnly={readOnly}
              catalogItems={catalogItems}
              country={country}
              categoriaTipologiaId={categoriaIdsSeleccionados}
              profundidadFilter={profundidadFilter}
              setProfundidadFilter={setProfundidadFilter}
              longitudFilter={longitudFilter}
              setLongitudFilter={setLongitudFilter}
              espesorFilter={espesorFilter}
              setEspesorFilter={setEspesorFilter}
              selectedPart={selectedPart}
              onAddCatalogItem={(codigoPT) =>
                !readOnly && threeApiRef.current?.addCatalogItem?.(codigoPT)
              }
              onAddTypology={(codigoPT) =>
                !readOnly && threeApiRef.current?.addTypology?.(codigoPT)
              }
              onAddChair={(codigoSilla) =>
                !readOnly && threeApiRef.current?.addChair?.(codigoSilla)
              }
              onAddHares={(codigoHares) =>
                !readOnly && threeApiRef.current?.addHares?.(codigoHares)
              }
              onAddPlant={(plantName) => !readOnly && threeApiRef.current?.addPlant?.(plantName)}
              onToggleSnap={() => !readOnly && threeApiRef.current?.toggleSnap?.()}
              onApplyGlobalMaterial={(code, scope = 'ALL') => {
                if (readOnly) return;
                const def = code ? materialsByCode?.get?.(String(code)) || null : null;
                threeApiRef.current?.applyFinishToActivePart?.(code, def, scope);
              }}
              materials={materials}
              materialsByCode={materialsByCode}
              setSurfaceOpen={setSurfaceOpen}
              Plan2DUploader={Plan2DUploader}
              handleLoadPlan2D={handleLoadPlan2D}
              plan2DVisible={plan2DVisible}
              setPlan2DVisible={setPlan2DVisible}
              wallMode={wallMode}
              setWallMode={setWallMode}
              wallHeight={wallHeight}
              setWallHeight={setWallHeight}
              wallThickness={wallThickness}
              setWallThickness={setWallThickness}
              onUndoLastWall={() => setWalls((prev) => prev.slice(0, -1))}
              onClearWalls={() => setWalls([])}
            />
          </div>

          {!isReady && (
            <div style={{ padding: 12, fontSize: 12, opacity: 0.7 }}>Cargando visor...</div>
          )}
        </div>

        {/* CENTER */}
        <div style={{ minHeight: 0, position: 'relative' }}>
          {/* Export buttons */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              display: 'flex',
              gap: 8,
            }}
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
            catalogByCode={byCode}
            country={country}
            onApiReady={(api) => {
              threeApiRef.current = api;
              setThreeApi(api);
              setIsReady(true);
            }}
            onSelectionChange={setSelectedPart}
            onBOMChange={handleBOMChange}
            onFloatingEditorRequest={setFloatingEditor}
          />
          <PropertiesPopup
            open={floatingEditor.open}
            x={floatingEditor.x}
            y={floatingEditor.y}
            part={floatingEditor.part}
            api={threeApiRef.current}
            onClose={() =>
              setFloatingEditor((prev) => ({
                ...prev,
                open: false,
              }))
            }
          />

          <Plan2DOverlay
            getSnapshot={() => threeApiRef.current?.getPartsSnapshot2D?.() || []}
            selectedIds={selectedIds}
            onPickIds={(ids) => {
              setSelectedIds(ids);
              const last = ids?.[ids.length - 1];
              if (last) threeApiRef.current?.selectPartById?.(last);
            }}
            onPickId={(id) => threeApiRef.current?.selectPartById?.(id)}
            walls={walls}
            wallMode={wallMode}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
            onAddWall={(wall) => setWalls((prev) => [...prev, wall])}
            onSetWalls={setWalls}
            height={240}
            invertZ={true}
            plan2DSrc={plan2DSrc}
            plan2DVisible={plan2DVisible}
            plan2DTransform={plan2DTransform}
          />

          <BOMWindow open={bomOpen} title="BOM - Proyecto" onClose={() => setBomOpen(false)}>
            <BOMView items={bomItems} defaultCountry="CO" catalogCountries={CATALOG_COUNTRIES} />
          </BOMWindow>

          {/* Help + PPT */}
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
        <div style={{}}>
          <PropertiesPanel
            part={selectedPart}
            partAcabado={materialsForPanel}
            bomItems={bomItems}
            country={country}
            byCode={byCode}
            api={threeApi}
            materials={filteredMaterials}
            materialsAcabado={filteredMaterialsAcabado}
            materialsByCode={materialsByCode}
            readOnly={readOnly}
          />
        </div>

        {/* MODAL (fuera del grid interno pero dentro del return) */}
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
              groupName: surface.groupName || groupName,
            });
          }}
        />
      </div>
    </div>
  );
}
