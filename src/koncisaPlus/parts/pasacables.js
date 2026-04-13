// src/koncisaPlus/parts/pasacables.js
import { resolveKoncisaCableAccessCodigoPT } from '../rules/koncisaCableAccessRules';

export function createPasacable({
  groupId = null,
  groupName = null,
  diameterMm = 50,
  x = 0,
  y = 735,
  z = 0,
  rotY = 0,
}) {
  const resolved = resolveKoncisaCableAccessCodigoPT({
    tipo: 'pasacable',
  });

  return {
    type: 'pasacable',
    subtype: 'redondo-pequeno',
    line: 'KONCISA.PLUS',
    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name: 'Pasacable',
    dimMm: {
      diameterMm,
      widthMm: diameterMm,
      depthMm: diameterMm,
      thickMm: 5,
    },
    position: { x, y, z },
    rotation: { x: 0, y: rotY, z: 0 },
    model: {
      kind: 'glb',
      src: '/assets/models/koncisaPlus/MPR050004.glb',
    },
    meta: {
      category: 'pasacables',
    },
  };
}
