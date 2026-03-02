// src/parts/surfaceFactory.js

//crear el mesh procedural
//setear userData (codigoPT, kind, dims, line)
//conectores / metadata
//devolver el mesh

import * as THREE from 'three';

/**
 * Superficie procedural (MVP):
 * - Caja simple (BoxGeometry)
 * - Unidades en METROS (m)
 * - Conectores generados en METROS (m)
 *
 * Params:
 *  widthM: ancho (X) en metros
 *  depthM: fondo (Z) en metros
 *  thicknessM: espesor (Y) en metros (ej 0.025 = 25mm)
 */
export function createSurfaceMesh({
  widthM = 1.2,
  depthM = 0.6,
  thicknessM = 0.025,
  color = 0xdedede,
} = {}) {
  const geo = new THREE.BoxGeometry(widthM, thicknessM, depthM);

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Posicionar para que "apoye" sobre el piso Y=0 (base en 0)
  mesh.position.set(0, thicknessM / 2, 0);

  // Guarda dimensiones por si luego las necesitas (BOM/Precio/Export)
  mesh.userData.dim = { widthM, depthM, thicknessM };

  return mesh;
}

/**
 * Meta/conectores para snap.
 * Los conectores también están en METROS.
 *
 * Convención:
 * - "surface_edge" es el conector compatible con "top_edge" del costado.
 * - Se define como una línea corta cerca de una esquina o borde.
 *
 * Aquí lo ponemos en el borde superior (Y = thickness/2)
 * y en el borde "frontal" (Z = -depth/2).
 */
export function createSurfaceMeta({ widthM = 1.2, depthM = 0.6, thicknessM = 0.025 } = {}) {
  const y = thicknessM / 2;

  return {
    units: 'm',
    connectors: [
      {
        id: 'surface_edge',
        type: 'edge',
        role: 'guest',
        compatibleWith: ['top_edge'],
        line: {
          from: [-widthM / 2, y, -depthM / 2],
          to: [-widthM / 2 + 0.03, y, -depthM / 2],
        },
      },
    ],
  };
}

/**
 * Genera un "partCode" único según dimensiones (opcional, recomendado para export/BOM)
 */
/*
export function buildSurfaceCode({ widthM, depthM, thicknessM }) {
  const mm = (m) => Math.round(m * 1000); // a mm para nombre
  return '22000008989';
  //`SURF_${mm(widthM)}x${mm(depthM)}_T${mm(thicknessM)}`;
}
*/
