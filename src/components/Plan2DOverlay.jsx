import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

function fmtMeters(m) {
  if (!isFinite(m)) return '';
  const r2 = Math.round(m * 100) / 100;
  const r0 = Math.round(m);
  return Math.abs(r2 - r0) < 0.005 ? `${r0} m` : `${r2.toFixed(2)} m`;
}

function drawDimText(ctx, x1, y1, x2, y2, label, opts = {}) {
  const {
    font = '12px sans-serif',
    pad = 3,
    bg = 'rgba(255,255,255,0.88)',
    fg = 'rgba(0,0,0,0.75)',
  } = opts;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ang = Math.atan2(y2 - y1, x2 - x1);

  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(ang);
  ctx.font = font;

  const w = ctx.measureText(label).width;
  const h = 12;

  ctx.fillStyle = bg;
  ctx.fillRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  ctx.restore();
}
function fmtMeasure(m) {
  if (!isFinite(m)) return '';
  const mm = Math.round(m * 1000);

  if (m < 1) return `${mm} mm`;

  const m2 = Math.round(m * 100) / 100;
  return `${m2.toFixed(2)} m`;
}

function drawMeasureLine(ctx, x1, y1, x2, y2, label, opts = {}) {
  const {
    preview = false,
    line = preview ? 'rgba(245, 158, 11, 0.95)' : 'rgba(37, 99, 235, 0.95)',
    text = preview ? 'rgba(146, 64, 14, 0.95)' : 'rgba(30, 64, 175, 0.95)',
    bg = 'rgba(255,255,255,0.95)',
  } = opts;

  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const tick = 8;

  ctx.save();

  ctx.strokeStyle = line;
  ctx.fillStyle = line;
  ctx.lineWidth = 2;

  if (preview) ctx.setLineDash([8, 6]);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.setLineDash([]);

  // marcas perpendiculares
  ctx.beginPath();
  ctx.moveTo(x1 + nx * tick, y1 + ny * tick);
  ctx.lineTo(x1 - nx * tick, y1 - ny * tick);
  ctx.moveTo(x2 + nx * tick, y2 + ny * tick);
  ctx.lineTo(x2 - nx * tick, y2 - ny * tick);
  ctx.stroke();

  // puntos extremos
  ctx.beginPath();
  ctx.arc(x1, y1, 3, 0, Math.PI * 2);
  ctx.arc(x2, y2, 3, 0, Math.PI * 2);
  ctx.fill();

  drawDimText(ctx, x1, y1, x2, y2, label, {
    fg: text,
    bg,
    font: '12px sans-serif',
  });

  ctx.restore();
}
export default function Plan2DOverlay({
  getSnapshot,
  selectedIds = [],
  onPickIds,
  onPickId,
  walls = [],
  wallMode = false,
  wallHeight = 2.4,
  wallThickness = 0.1,
  onAddWall,
  onSetWalls,
  width = '100%',
  height = 220,
  defaultVisible = true,
  title = 'Planta 2D',
  allowMultiSelect = true,
  invertZ = true,
  plan2DSrc,
  plan2DVisible = true,
  plan2DTransform = {
    metersPerPixel: 0.01,
    offsetX: 0,
    offsetZ: 0,
    opacity: 0.35,
  },
}) {
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState(null);
  const [measureHover, setMeasureHover] = useState(null);
  const [measurements, setMeasurements] = useState([]);

  const planImageRef = useRef(null);

  useEffect(() => {
    if (!plan2DSrc) {
      planImageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      planImageRef.current = img;
    };
    img.onerror = () => {
      console.error('No se pudo cargar el plano 2D:', plan2DSrc);
      planImageRef.current = null;
    };
    img.src = plan2DSrc;
  }, [plan2DSrc]);

  const isWallDrawMode = wallMode === true || wallMode === 'DRAW';

  const canvasRef = useRef(null);

  // visible toggle
  const [visible, setVisible] = useState(defaultVisible);

  // draft muros
  const [draftPts, setDraftPts] = useState([]); // [{x,z}...]
  const [mouseWorld, setMouseWorld] = useState(null);

  // View transform (pan/zoom)
  const viewRef = useRef({
    cx: 0, // centro world X
    cz: 0, // centro world Z
    s: 80, // pixeles por metro (zoom)
    initialized: false,
  });

  // drag/pan
  const dragRef = useRef({
    isDown: false,
    mode: null, // 'PAN'
    startMx: 0,
    startMy: 0,
    startCx: 0,
    startCz: 0,
  });

  const resolveCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { w: 0, h: 0 };
    // width puede venir en px o '100%'
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width || canvas.width, h: rect.height || canvas.height };
  }, []);

  const getAllBounds = useCallback(() => {
    const snap = (getSnapshot?.() || []).filter(Boolean);

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;

    for (const p of snap) {
      minX = Math.min(minX, p.x - p.w / 2);
      maxX = Math.max(maxX, p.x + p.w / 2);
      minZ = Math.min(minZ, p.z - p.d / 2);
      maxZ = Math.max(maxZ, p.z + p.d / 2);
    }

    for (const w of walls || []) {
      const pts = w?.points || [];
      for (const pt of pts) {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minZ = Math.min(minZ, pt.z);
        maxZ = Math.max(maxZ, pt.z);
      }
    }

    for (const pt of draftPts || []) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minZ = Math.min(minZ, pt.z);
      maxZ = Math.max(maxZ, pt.z);
    }

    if (mouseWorld) {
      minX = Math.min(minX, mouseWorld.x);
      maxX = Math.max(maxX, mouseWorld.x);
      minZ = Math.min(minZ, mouseWorld.z);
      maxZ = Math.max(maxZ, mouseWorld.z);
    }

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
      return null;
    }

    return { minX, maxX, minZ, maxZ, snap };
  }, [getSnapshot, walls, draftPts, mouseWorld]);

  const ensureInitializedView = useCallback(() => {
    const b = getAllBounds();
    if (!b) return;

    const { minX, maxX, minZ, maxZ } = b;

    const { w, h } = resolveCanvasSize();
    if (!w || !h) return;

    const pad = 18;
    const spanX = Math.max(0.001, maxX - minX);
    const spanZ = Math.max(0.001, maxZ - minZ);

    const sx = (w - pad * 2) / spanX;
    const sz = (h - pad * 2) / spanZ;

    const fitS = Math.min(sx, sz);

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    viewRef.current = {
      cx,
      cz,
      s: Math.max(25, Math.min(260, fitS)), // clamp zoom razonable
      initialized: true,
    };
  }, [getAllBounds, resolveCanvasSize]);

  // World <-> Canvas
  const toCanvas = useCallback(
    (x, z) => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];

      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.width;
      const h = rect.height || canvas.height;

      const { cx, cz, s } = viewRef.current;

      const px = (x - cx) * s + w / 2;

      // ✅ Este es el punto de “al revés”
      // invertZ=true => canvas Y sube cuando Z baja (como “plano” típico)
      // invertZ=false => canvas Y sube cuando Z sube
      const sign = invertZ ? -1 : 1;
      const py = sign * (z - cz) * s + h / 2;

      return [px, py];
    },
    [invertZ]
  );

  const canvasToWorld = useCallback(
    (mx, my) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.width;
      const h = rect.height || canvas.height;

      const { cx, cz, s } = viewRef.current;

      const x = (mx - w / 2) / s + cx;

      const sign = invertZ ? -1 : 1;
      const z = ((my - h / 2) / s) * sign + cz;

      return { x, z };
    },
    [invertZ]
  );

  const commitWall = useCallback(() => {
    if ((draftPts?.length || 0) < 2) return;

    const wall = {
      id: `WALL_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      points: draftPts,
      height: wallHeight,
      thickness: wallThickness,
    };

    onAddWall?.(wall);
    setDraftPts([]);
    setMouseWorld(null);
  }, [draftPts, wallHeight, wallThickness, onAddWall]);

  const clearDraft = useCallback(() => {
    setDraftPts([]);
    setMouseWorld(null);
  }, []);

  const clearMeasureDraft = useCallback(() => {
    setMeasureStart(null);
    setMeasureHover(null);
  }, []);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    clearMeasureDraft();
  }, [clearMeasureDraft]);

  // fit view button
  const fitView = useCallback(() => {
    viewRef.current.initialized = false;
    ensureInitializedView();
  }, [ensureInitializedView]);

  // Mouse move for wall preview + pan drag
  const handleMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // pan dragging
      if (dragRef.current.isDown && dragRef.current.mode === 'PAN') {
        const { startMx, startMy, startCx, startCz } = dragRef.current;
        const dx = mx - startMx;
        const dy = my - startMy;

        const { s } = viewRef.current;

        // mover centro en world (dx pix -> metros)
        const nx = startCx - dx / s;

        const sign = invertZ ? -1 : 1;
        const nz = startCz - (dy / s) * sign;

        viewRef.current.cx = nx;
        viewRef.current.cz = nz;
        return;
      }

      if (measureMode && measureStart) {
        const wpt = canvasToWorld(mx, my);
        if (!wpt) return;
        setMeasureHover({ x: wpt.x, z: wpt.z });
        return;
      }

      if (!isWallDrawMode) return;

      const wpt = canvasToWorld(mx, my);
      if (!wpt) return;
      setMouseWorld({ x: wpt.x, z: wpt.z });
    },
    [measureMode, measureStart, isWallDrawMode, canvasToWorld, invertZ]
  );

  const handleMouseDown = useCallback((e) => {
    // click derecho / medio para pan
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      dragRef.current.isDown = true;
      dragRef.current.mode = 'PAN';
      dragRef.current.startMx = mx;
      dragRef.current.startMy = my;
      dragRef.current.startCx = viewRef.current.cx;
      dragRef.current.startCz = viewRef.current.cz;

      e.preventDefault();
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDown = false;
    dragRef.current.mode = null;
  }, []);

  // zoom wheel
  const handleWheel = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const before = canvasToWorld(mx, my);
      if (!before) return;

      const delta = Math.sign(e.deltaY);
      const factor = delta > 0 ? 0.9 : 1.1;

      const s0 = viewRef.current.s;
      const s1 = Math.max(20, Math.min(360, s0 * factor));
      viewRef.current.s = s1;

      // zoom al cursor: mantener el punto bajo el mouse fijo
      const after = canvasToWorld(mx, my);
      if (!after) return;

      viewRef.current.cx += before.x - after.x;
      viewRef.current.cz += before.z - after.z;

      e.preventDefault();
    },
    [canvasToWorld]
  );

  const handleDoubleClick = useCallback(() => {
    if (!isWallDrawMode) return;
    commitWall();
  }, [wallMode, commitWall]);

  const pickRectHit = useCallback(
    (mx, my, p, s) => {
      // bounding rect en canvas con rotación (aprox):
      const [px, py] = toCanvas(p.x, p.z);
      const rw = p.w * s;
      const rd = p.d * s;

      // transformar punto a coords del rect rotado
      const ang = -(p.rotY || 0);
      const dx = mx - px;
      const dy = my - py;
      const rx = dx * Math.cos(ang) - dy * Math.sin(ang);
      const ry = dx * Math.sin(ang) + dy * Math.cos(ang);

      if (Math.abs(rx) <= rw / 2 && Math.abs(ry) <= rd / 2) {
        return rx * rx + ry * ry;
      }
      return null;
    },
    [toCanvas]
  );

  const handleClick = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // REGLA: click 1 inicia, click 2 termina
      if (measureMode) {
        const wpt = canvasToWorld(mx, my);
        if (!wpt) return;

        // primer click
        if (!measureStart) {
          setMeasureStart({ x: wpt.x, z: wpt.z });
          setMeasureHover({ x: wpt.x, z: wpt.z });
          return;
        }

        // segundo click: guardar medida
        const len = Math.hypot(wpt.x - measureStart.x, wpt.z - measureStart.z);

        if (len > 0.001) {
          setMeasurements((prev) => [
            ...prev,
            {
              id: `MEASURE_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              a: measureStart,
              b: { x: wpt.x, z: wpt.z },
            },
          ]);
        }

        setMeasureStart(null);
        setMeasureHover(null);
        return;
      }

      // MUROS: click agrega punto
      if (isWallDrawMode) {
        const wpt = canvasToWorld(mx, my);
        if (!wpt) return;
        setDraftPts((prev) => [...prev, { x: wpt.x, z: wpt.z }]);
        return;
      }

      // PICK piezas
      const b = getAllBounds();
      const snap = b?.snap || [];
      if (!snap.length) return;

      const { s } = viewRef.current;

      let best = null;
      let bestDist = Infinity;

      for (const p of snap) {
        const dist = pickRectHit(mx, my, p, s);
        if (dist == null) continue;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }

      if (!best?.id) return;

      // multi-select con Ctrl / Cmd / Shift
      const wantsMulti = allowMultiSelect && (e.ctrlKey || e.metaKey || e.shiftKey);

      if (!wantsMulti) {
        onPickIds?.([best.id]);
        onPickId?.(best.id);
        return;
      }

      const next = new Set(selectedIds || []);
      if (next.has(best.id)) next.delete(best.id);
      else next.add(best.id);

      const arr = Array.from(next);
      onPickIds?.(arr);

      // compatibilidad con listeners antiguos
      onPickId?.(best.id);
    },
    [
      measureMode,
      measureStart,
      isWallDrawMode,
      canvasToWorld,
      getAllBounds,
      pickRectHit,
      onPickIds,
      onPickId,
      selectedIds,
      allowMultiSelect,
    ]
  );

  // keys
  useEffect(() => {
    const onKey = (ev) => {
      const key = ev.key?.toLowerCase?.();

      if (ev.key === 'Escape') {
        if (measureMode) {
          clearMeasureDraft();
          return;
        }
        clearDraft();
        return;
      }

      if (ev.key === 'Enter') {
        if (isWallDrawMode) commitWall();
      }

      if (key === 'f') fitView();

      if (key === 'r') {
        setMeasureMode((prev) => {
          const next = !prev;
          if (!next) {
            setMeasureStart(null);
            setMeasureHover(null);
          }
          return next;
        });
      }

      if ((ev.key === 'Delete' || ev.key === 'Backspace') && measureMode && !measureStart) {
        setMeasurements((prev) => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    measureMode,
    measureStart,
    isWallDrawMode,
    commitWall,
    clearDraft,
    clearMeasureDraft,
    fitView,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      handleWheel?.(e);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => canvas.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  // Inicializa view una vez que haya contenido
  useEffect(() => {
    if (!viewRef.current.initialized) ensureInitializedView();
  }, [walls, ensureInitializedView]);

  // Draw loop
  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // adaptar canvas a tamaño real si width='100%'
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width || canvas.width || 1));
      const h = Math.max(1, Math.floor(rect.height || canvas.height || 1));

      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      // si no hay view init, intenta
      if (!viewRef.current.initialized) ensureInitializedView();

      const snap = (getSnapshot?.() || []).filter(Boolean);
      const { s, cx, cz } = viewRef.current;

      // helpers inline
      const toCanvasLocal = (x, z) => {
        const px = (x - cx) * s + w / 2;
        const py = -(z - cz) * s + h / 2;
        return [px, py];
      };

      // Fondo
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(0, 0, w, h);

      // Plano 2D de fondo
      if (plan2DVisible && planImageRef.current) {
        const img = planImageRef.current;

        const {
          metersPerPixel = 0.01,
          offsetX = 0,
          offsetZ = 0,
          opacity = 0.35,
        } = plan2DTransform || {};

        // ancho/alto del plano en canvas a partir de escala mundo
        const drawW = img.width * metersPerPixel * s;
        const drawH = img.height * metersPerPixel * s;

        // ancla en mundo
        const px = (offsetX - cx) * s + w / 2;
        const py = -(offsetZ - cz) * s + h / 2;

        ctx.save();
        ctx.globalAlpha = opacity;

        // dibuja con origen en esquina superior izquierda
        ctx.drawImage(img, px, py, drawW, drawH);

        ctx.restore();
      }

      // borde
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

      // grid suave
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 1;

      const stepM = 1;
      const stepPx = stepM * s;

      if (stepPx > 25) {
        const xMinW = cx - w / 2 / s;
        const xMaxW = cx + w / 2 / s;
        const zMinW = cz - h / 2 / s;
        const zMaxW = cz + h / 2 / s;

        const xStart = Math.floor(xMinW / stepM) * stepM;
        const xEnd = Math.ceil(xMaxW / stepM) * stepM;

        for (let x = xStart; x <= xEnd; x += stepM) {
          const px = (x - cx) * s + w / 2;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        }

        const zStart = Math.floor(zMinW / stepM) * stepM;
        const zEnd = Math.ceil(zMaxW / stepM) * stepM;

        for (let z = zStart; z <= zEnd; z += stepM) {
          const py = -(z - cz) * s + h / 2;
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(w, py);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Muros existentes
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const wall of walls || []) {
        const pts = wall?.points || [];
        if (pts.length < 2) continue;

        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const [x, y] = toCanvasLocal(pts[i].x, pts[i].z);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(20,20,20,0.78)';
        ctx.lineWidth = Math.max(1, (wall.thickness || wallThickness) * s);
        ctx.stroke();

        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const len = Math.hypot(b.x - a.x, b.z - a.z);
          const [x1, y1] = toCanvasLocal(a.x, a.z);
          const [x2, y2] = toCanvasLocal(b.x, b.z);
          const pixLen = Math.hypot(x2 - x1, y2 - y1);
          if (pixLen > 40) drawDimText(ctx, x1, y1, x2, y2, fmtMeters(len));
        }
      }

      // Muro en construcción
      if (isWallDrawMode && (draftPts?.length || 0) > 0) {
        const pts = [...draftPts];
        if (mouseWorld) pts.push(mouseWorld);

        if (pts.length >= 2) {
          ctx.beginPath();
          for (let i = 0; i < pts.length; i++) {
            const [x, y] = toCanvasLocal(pts[i].x, pts[i].z);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(56, 194, 212, 0.95)';
          ctx.lineWidth = Math.max(1, wallThickness * s);
          ctx.stroke();

          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const len = Math.hypot(b.x - a.x, b.z - a.z);
            const [x1, y1] = toCanvasLocal(a.x, a.z);
            const [x2, y2] = toCanvasLocal(b.x, b.z);
            const pixLen = Math.hypot(x2 - x1, y2 - y1);

            if (pixLen > 36) {
              drawDimText(ctx, x1, y1, x2, y2, fmtMeters(len), {
                fg: 'rgba(20, 80, 90, 0.95)',
                bg: 'rgba(255,255,255,0.88)',
              });
            }
          }
        }
      }

      // Piezas
      const selSet = new Set(selectedIds || []);

      for (const p of snap) {
        const [px, py] = toCanvasLocal(p.x, p.z);
        const rw = p.w * s;
        const rd = p.d * s;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-(p.rotY || 0));

        const isSel = selSet.has(p.id);

        ctx.fillStyle = isSel ? 'rgba(56, 194, 212, 0.28)' : 'rgba(0,0,0,0.07)';
        ctx.strokeStyle = isSel ? 'rgba(56, 194, 212, 0.95)' : 'rgba(0,0,0,0.30)';
        ctx.lineWidth = isSel ? 2.2 : 1;

        ctx.beginPath();
        ctx.rect(-rw / 2, -rd / 2, rw, rd);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSel ? 'rgba(56, 194, 212, 1)' : 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Medidas guardadas
      for (const m of measurements) {
        const [x1, y1] = toCanvasLocal(m.a.x, m.a.z);
        const [x2, y2] = toCanvasLocal(m.b.x, m.b.z);
        const len = Math.hypot(m.b.x - m.a.x, m.b.z - m.a.z);

        drawMeasureLine(ctx, x1, y1, x2, y2, fmtMeasure(len));
      }

      // Medida en preview
      if (measureMode && measureStart && measureHover) {
        const [x1, y1] = toCanvasLocal(measureStart.x, measureStart.z);
        const [x2, y2] = toCanvasLocal(measureHover.x, measureHover.z);
        const len = Math.hypot(measureHover.x - measureStart.x, measureHover.z - measureStart.z);

        if (len > 0.001) {
          drawMeasureLine(ctx, x1, y1, x2, y2, fmtMeasure(len), {
            preview: true,
          });
        }
      }

      // Header
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.font = '13px sans-serif';
      ctx.fillText(title, 12, 20);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    getSnapshot,
    selectedIds,
    walls,
    isWallDrawMode,
    draftPts,
    mouseWorld,
    wallThickness,
    title,
    ensureInitializedView,
    measureMode,
    measureStart,
    measureHover,
    measurements,
  ]);

  if (!visible) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          pointerEvents: 'auto',
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setVisible(true)}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
            cursor: 'pointer',
          }}
        >
          Mostrar 2D
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        height,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 10px 26px rgba(0,0,0,0.18)',
        border: '1px solid rgba(0,0,0,0.08)',
        background: 'rgba(255,255,255,0.2)',
        pointerEvents: 'auto',
        zIndex: 20,
      }}
    >
      {/* barra superior */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 8,
          zIndex: 30,
        }}
      >
        <button
          onClick={fitView}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'rgba(255,255,255,0.92)',
            cursor: 'pointer',
          }}
          title="Fit (F)"
        >
          Fit
        </button>

        <button
          onClick={() => {
            setMeasureMode((prev) => {
              const next = !prev;
              if (!next) {
                setMeasureStart(null);
                setMeasureHover(null);
              }
              return next;
            });
          }}
          disabled={isWallDrawMode}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: measureMode ? 'rgba(37, 99, 235, 0.14)' : 'rgba(255,255,255,0.92)',
            color: measureMode ? 'rgba(30, 64, 175, 1)' : 'inherit',
            cursor: isWallDrawMode ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            opacity: isWallDrawMode ? 0.6 : 1,
          }}
          title={isWallDrawMode ? 'Desactiva muros para medir' : 'Regla (R)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 21L21 3M14 4l2 2M11 7l2 2M8 10l2 2M5 13l2 2M16 8l2 2M13 11l2 2M10 14l2 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Regla
        </button>

        {measureMode && (
          <button
            onClick={clearMeasurements}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'rgba(255,255,255,0.92)',
              cursor: 'pointer',
            }}
            title="Borrar medidas"
          >
            Limpiar medidas
          </button>
        )}

        {isWallDrawMode ? (
          <>
            <button
              onClick={commitWall}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'rgba(56, 194, 212, 0.14)',
                cursor: 'pointer',
              }}
              title="Enter"
            >
              Terminar muro
            </button>
            <button
              onClick={clearDraft}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'rgba(255,255,255,0.92)',
                cursor: 'pointer',
              }}
              title="Esc"
            >
              Cancelar
            </button>
          </>
        ) : null}

        <button
          onClick={() => setVisible(false)}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'rgba(255,255,255,0.92)',
            cursor: 'pointer',
          }}
        >
          Ocultar
        </button>
      </div>

      <canvas
        id="plan2d-canvas"
        ref={canvasRef}
        style={{
          width,
          height: '100%',
          display: 'block',
          cursor: measureMode || isWallDrawMode ? 'crosshair' : 'pointer',
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
