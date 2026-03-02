import React, { useEffect, useMemo, useRef, useState } from 'react';

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function rectNorm(a, b) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

function pointInPoly(pt, poly) {
  // Ray casting in XZ plane
  if (!poly || poly.length < 3) return false;
  const x = pt.x;
  const z = pt.z;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      zi = poly[i].z;
    const xj = poly[j].x,
      zj = poly[j].z;
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function worldPointFromLocal(p, lx, lz) {
  // local -> world (XZ) using rotY + translate
  const c = Math.cos(p.rotY || 0);
  const s = Math.sin(p.rotY || 0);
  const wx = p.x + lx * c + lz * s;
  const wz = p.z + -lx * s + lz * c;
  return { x: wx, z: wz };
}

export default function Plan2DView({
  getSnapshot, // () => snapshot[]
  selectedIds = [],
  onSelectIds, // ({ ids, mode:'replace'|'add'|'toggle' })
  height = 260,
  showLabels = true,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  // view transform: screen = world * scale + offset, with z inverted for y-axis
  const [view, setView] = useState(() => ({ scale: 120, ox: 0, oy: 0 }));
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);

  const [dragSel, setDragSel] = useState(null); // {a:{x,y}, b:{x,y}}
  const [pointerDown, setPointerDown] = useState(null); // {x,y, button, shiftKey, ctrlKey}

  const snapshot = useMemo(() => (getSnapshot?.() || []).filter(Boolean), [getSnapshot]);

  // Resize canvas to wrapper
  useEffect(() => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // keep current view; redraw will happen next frame
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit to content (call once when we have snapshot and view is default)
  const fitToContent = () => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const rect = el.getBoundingClientRect();
    const wPx = rect.width;
    const hPx = rect.height;

    const snap = (getSnapshot?.() || []).filter(Boolean);
    if (!snap.length) return;

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;

    for (const p of snap) {
      if (p.poly && Array.isArray(p.poly) && p.poly.length >= 3) {
        for (const v of p.poly) {
          const wp = worldPointFromLocal(p, v.x, v.z);
          minX = Math.min(minX, wp.x);
          maxX = Math.max(maxX, wp.x);
          minZ = Math.min(minZ, wp.z);
          maxZ = Math.max(maxZ, wp.z);
        }
      } else {
        minX = Math.min(minX, p.x - p.w / 2);
        maxX = Math.max(maxX, p.x + p.w / 2);
        minZ = Math.min(minZ, p.z - p.d / 2);
        maxZ = Math.max(maxZ, p.z + p.d / 2);
      }
    }

    const pad = 24;
    const spanX = Math.max(0.001, maxX - minX);
    const spanZ = Math.max(0.001, maxZ - minZ);

    // pixels per meter
    const sx = (wPx - pad * 2) / spanX;
    const sy = (hPx - pad * 2) / spanZ;
    const scale = clamp(Math.min(sx, sy), 10, 600);

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    // center in screen
    const ox = wPx / 2 - cx * scale;
    const oy = hPx / 2 - -cz * scale; // note z inverted

    setView({ scale, ox, oy });
  };

  useEffect(() => {
    // auto-fit when snapshot first appears
    if (!snapshot.length) return;
    // only if view hasn't been positioned yet (ox=0,oy=0 roughly)
    if (Math.abs(view.ox) < 1e-6 && Math.abs(view.oy) < 1e-6) {
      fitToContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.length]);

  const worldToScreen = (x, z) => {
    const el = wrapRef.current;
    if (!el) return [0, 0];
    // use CSS pixels for events; canvas is in DPR, so we draw scaled
    const px = x * view.scale + view.ox;
    const py = -z * view.scale + view.oy;
    return [px, py];
  };

  const screenToWorld = (px, py) => {
    const x = (px - view.ox) / view.scale;
    const z = -((py - view.oy) / view.scale);
    return [x, z];
  };

  // Rendering loop
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const el = wrapRef.current;
      if (!canvas || !el) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = window.devicePixelRatio || 1;

      // clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // background
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // draw grid (subtle)
      const gridPx = 50; // in screen px
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      for (let x = 0; x <= w; x += gridPx) {
        ctx.moveTo(x * dpr + 0.5, 0);
        ctx.lineTo(x * dpr + 0.5, h * dpr);
      }
      for (let y = 0; y <= h; y += gridPx) {
        ctx.moveTo(0, y * dpr + 0.5);
        ctx.lineTo(w * dpr, y * dpr + 0.5);
      }
      ctx.stroke();

      // border
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.strokeRect(0.5 * dpr, 0.5 * dpr, canvas.width - 1 * dpr, canvas.height - 1 * dpr);

      // world to canvas helper (DPR applied)
      const toC = (x, z) => {
        const [sx, sy] = worldToScreen(x, z);
        return [sx * dpr, sy * dpr];
      };

      // pieces
      const selSet = new Set(selectedIds || []);
      for (const p of snapshot) {
        const [cx, cy] = toC(p.x, p.z);
        const rw = p.w * view.scale * dpr;
        const rd = p.d * view.scale * dpr;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-p.rotY);

        const isSel = selSet.has(p.id);

        ctx.fillStyle = isSel ? 'rgba(56, 194, 212, 0.28)' : 'rgba(0,0,0,0.07)';
        ctx.strokeStyle = isSel ? 'rgba(56, 194, 212, 0.95)' : 'rgba(0,0,0,0.30)';
        ctx.lineWidth = (isSel ? 2 : 1) * dpr;

        ctx.beginPath();
        if (p.poly && Array.isArray(p.poly) && p.poly.length >= 3) {
          const s = view.scale * dpr;
          const p0 = p.poly[0];
          ctx.moveTo(p0.x * s, -p0.z * s);
          for (let i = 1; i < p.poly.length; i++) {
            const v = p.poly[i];
            ctx.lineTo(v.x * s, -v.z * s);
          }
          ctx.closePath();
        } else {
          ctx.rect(-rw / 2, -rd / 2, rw, rd);
        }
        ctx.fill();
        ctx.stroke();

        // center dot
        ctx.fillStyle = isSel ? 'rgba(56, 194, 212, 1)' : 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2 * dpr, 0, Math.PI * 2);
        ctx.fill();

        // labels (only if zoom enough)
        if (showLabels && view.scale > 120) {
          const label = p.codigoPT || p.kind || p.id;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.font = `${11 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(label).slice(0, 18), 0, 0);
        }

        ctx.restore();
      }

      // selection rectangle
      if (dragSel?.a && dragSel?.b) {
        const r = rectNorm(dragSel.a, dragSel.b);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = 'rgba(56, 194, 212, 0.95)';
        ctx.fillStyle = 'rgba(56, 194, 212, 0.10)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.rect(r.x1 * dpr, r.y1 * dpr, r.w * dpr, r.h * dpr);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // HUD
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.font = `${12 * dpr}px sans-serif`;
      ctx.fillText(
        'Vista 2D (pan: arrastrar | zoom: rueda | selección: click / arrastrar)',
        12 * dpr,
        18 * dpr
      );
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [snapshot, selectedIds, view, dragSel, showLabels]);

  const pickAt = (mx, my) => {
    // return best hit id (top-most by closest to center)
    let best = null;
    let bestDist = Infinity;

    for (const p of snapshot) {
      const [px, py] = worldToScreen(p.x, p.z);
      const rw = p.w * view.scale;
      const rd = p.d * view.scale;

      const dx = mx - px;
      const dy = my - py;

      // inverse rotation (we drew ctx.rotate(-rotY))
      const c = Math.cos(p.rotY || 0);
      const s = Math.sin(p.rotY || 0);
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;

      let hit = false;
      if (p.poly && Array.isArray(p.poly) && p.poly.length >= 3) {
        const localX = lx / view.scale;
        const localZ = -ly / view.scale;
        hit = pointInPoly({ x: localX, z: localZ }, p.poly);
      } else {
        hit = Math.abs(lx) <= rw / 2 && Math.abs(ly) <= rd / 2;
      }

      if (hit) {
        const dist = lx * lx + ly * ly;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
    }
    return best?.id || null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoom = e.deltaY > 0 ? 0.92 : 1.08;
    const nextScale = clamp(view.scale * zoom, 10, 900);

    // zoom around cursor: keep world point under cursor fixed
    const [wx, wz] = screenToWorld(mx, my);
    const ox = mx - wx * nextScale;
    const oy = my - -wz * nextScale;

    setView({ scale: nextScale, ox, oy });
  };

  const handlePointerDown = (e) => {
    const el = wrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Right/middle button -> pan. Left -> select/drag-select.
    const button = e.button;
    setPointerDown({ x, y, button, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey });

    if (button === 1 || button === 2 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x, y, ox: view.ox, oy: view.oy });
      return;
    }

    // left: start potential box-select
    setDragSel({ a: { x, y }, b: { x, y } });
  };

  const handlePointerMove = (e) => {
    const el = wrapRef.current;
    if (!el || !pointerDown) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // pan if right/middle pressed
    if (isPanning && panStart) {
      const dx = x - panStart.x;
      const dy = y - panStart.y;
      setView((v) => ({ ...v, ox: panStart.ox + dx, oy: panStart.oy + dy }));
      return;
    }

    // update drag rectangle (left)
    if (pointerDown.button === 0 && dragSel?.a) {
      setDragSel((s) => ({ ...s, b: { x, y } }));
    }
  };

  const handlePointerUp = (e) => {
    const el = wrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      setPointerDown(null);
      return;
    }

    if (pointerDown?.button === 0) {
      // click vs box-select
      const moved = Math.hypot(x - pointerDown.x, y - pointerDown.y);

      if (moved < 4) {
        const id = pickAt(x, y);
        if (id) {
          const mode = pointerDown.shiftKey ? 'toggle' : 'replace';
          onSelectIds?.({ ids: [id], mode });
        }
      } else if (dragSel?.a && dragSel?.b) {
        const r = rectNorm(dragSel.a, dragSel.b);
        const ids = [];
        for (const p of snapshot) {
          let minPx = Infinity,
            maxPx = -Infinity,
            minPy = Infinity,
            maxPy = -Infinity;

          if (p.poly && Array.isArray(p.poly) && p.poly.length >= 3) {
            for (const v of p.poly) {
              const wp = worldPointFromLocal(p, v.x, v.z);
              const [sx, sy] = worldToScreen(wp.x, wp.z);
              minPx = Math.min(minPx, sx);
              maxPx = Math.max(maxPx, sx);
              minPy = Math.min(minPy, sy);
              maxPy = Math.max(maxPy, sy);
            }
          } else {
            const [px, py] = worldToScreen(p.x, p.z);
            const rw = p.w * view.scale;
            const rd = p.d * view.scale;
            // axis-aligned bounds in screen for rotated rect: use its 4 corners
            const corners = [
              { x: -p.w / 2, z: -p.d / 2 },
              { x: p.w / 2, z: -p.d / 2 },
              { x: p.w / 2, z: p.d / 2 },
              { x: -p.w / 2, z: p.d / 2 },
            ];
            for (const c0 of corners) {
              const wp = worldPointFromLocal(p, c0.x, c0.z);
              const [sx, sy] = worldToScreen(wp.x, wp.z);
              minPx = Math.min(minPx, sx);
              maxPx = Math.max(maxPx, sx);
              minPy = Math.min(minPy, sy);
              maxPy = Math.max(maxPy, sy);
            }
          }

          const overlaps = !(maxPx < r.x1 || minPx > r.x2 || maxPy < r.y1 || minPy > r.y2);
          if (overlaps) ids.push(p.id);
        }
        if (ids.length) {
          const mode = pointerDown.shiftKey ? 'add' : 'replace';
          onSelectIds?.({ ids, mode });
        }
      }
    }

    setDragSel(null);
    setPointerDown(null);
  };

  return (
    <div style={{ borderTop: '1px solid #e5e5e5', background: '#fff' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid #f0f0f0',
          userSelect: 'none',
        }}
      >
        <strong style={{ fontSize: 13 }}>Vista 2D</strong>
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
          Seleccionados: {selectedIds?.length || 0}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={fitToContent} title="Ajustar a contenido">
            Fit
          </button>
          <button
            className="btn"
            onClick={() => setView((v) => ({ ...v, scale: 120 }))}
            title="Zoom 100%"
          >
            100%
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        style={{
          height,
          position: 'relative',
          touchAction: 'none',
          cursor: isPanning ? 'grabbing' : 'crosshair',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
