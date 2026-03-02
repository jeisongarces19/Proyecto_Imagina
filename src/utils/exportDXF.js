// src/utils/export/exportDXF.js
import Drawing from 'dxf-writer';

/**
 * Exporta planta 2D a DXF:
 * - walls[]: [{id, points:[{x,z}], thickness}]
 * - partsSnapshot[]: [{id, codigoPT, x, z, w, d, rotY}]
 */
export function exportPlanToDXF({
  walls = [],
  partsSnapshot = [],
  filename = 'planta.dxf',
  layers = {
    walls: 'WALLS',
    parts: 'PARTS',
    text: 'TEXT',
  },
} = {}) {
  const d = new Drawing();

  // Capas
  d.addLayer(layers.walls, Drawing.ACI.BLUE, 'CONTINUOUS');
  d.addLayer(layers.parts, Drawing.ACI.GREEN, 'CONTINUOUS');
  d.addLayer(layers.text, Drawing.ACI.WHITE, 'CONTINUOUS');

  // Helpers
  const addPolyline = (pts, layer) => {
    if (!pts || pts.length < 2) return;
    d.setActiveLayer(layer);
    // dxf-writer trabaja en XY, nosotros mapeamos: X = x, Y = z
    const xy = pts.map((p) => [p.x, p.z]);
    d.drawPolyline(xy, false); // false = no cerrada
  };

  const addRect = (cx, cz, w, dDepth, rotY, layer) => {
    // rect en XZ, rotación alrededor de Y
    const hw = w / 2;
    const hd = dDepth / 2;

    const corners = [
      { x: -hw, z: -hd },
      { x: hw, z: -hd },
      { x: hw, z: hd },
      { x: -hw, z: hd },
    ];

    const c = Math.cos(rotY || 0);
    const s = Math.sin(rotY || 0);

    const pts = corners.map((p) => {
      const xr = p.x * c - p.z * s;
      const zr = p.x * s + p.z * c;
      return { x: cx + xr, z: cz + zr };
    });

    // cerrar
    pts.push(pts[0]);

    d.setActiveLayer(layer);
    d.drawPolyline(
      pts.map((p) => [p.x, p.z]),
      false
    );
  };

  const addText = (text, x, z, height = 0.12, layer = layers.text) => {
    d.setActiveLayer(layer);
    // drawText(text, x, y, height, rotation)
    d.drawText(String(text), x, z, height, 0);
  };

  // 1) Muros
  for (const w of walls || []) {
    const pts = w?.points || [];
    if (pts.length < 2) continue;
    addPolyline(pts, layers.walls);
  }

  // 2) Piezas
  for (const p of partsSnapshot || []) {
    const cx = p.x;
    const cz = p.z;
    const ww = Math.max(0.001, p.w);
    const dd = Math.max(0.001, p.d);
    addRect(cx, cz, ww, dd, p.rotY || 0, layers.parts);

    // texto (código)
    if (p.codigoPT) addText(p.codigoPT, cx, cz, 0.12, layers.text);
  }

  // Descargar
  const blob = new Blob([d.toDxfString()], { type: 'application/dxf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
