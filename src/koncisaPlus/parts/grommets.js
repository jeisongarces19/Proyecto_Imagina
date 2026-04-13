// src/koncisaPlus/parts/grommets.js
import { resolveKoncisaCableAccessCodigoPT } from '../rules/koncisaCableAccessRules';

export function createGrommet({
  groupId = null,
  groupName = null,
  finish = 'ALUMINIUM',
  diameterMm = 80,
  x = 0,
  y = 735,
  z = 0,
  rotY = 0,
}) {
  const resolved = resolveKoncisaCableAccessCodigoPT({
    tipo: 'grommet',
    finish,
  });

  return {
    type: 'grommet',
    subtype: '4-tomas',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name: `Grommet ${finish}`,
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
      src: '/assets/models/koncisaPlus/LKAC250000.glb',
    },
    meta: {
      category: 'grommets',
      finish,
    },
  };
}
