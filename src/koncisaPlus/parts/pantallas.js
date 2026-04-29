// src/koncisaPlus/parts/pantallas.js
import * as THREE from 'three';

const MM_TO_M = 1 / 1000;

export const KONCISA_PRIVACY_PANEL = {
  defaultHeightMm: 300,

  defaultThicknessMm: {
    formica: 18,
    melamina: 18,
    tela: 24,
    'tela-backer': 24,
    vidrio: 8,
  },

  cantoThicknessMm: 8,

  // Según el plano: soporte a 93.5 mm desde los extremos
  supportInsetMm: 93.5,

  // Ajuste vertical del soporte respecto al borde inferior de la pantalla
  supportYOffsetMm: -20,
};

/**
 * IMPORTANTE:
 * Cambia estas rutas por los nombres reales de tus GLB.
 *
 * - Lateral: soporte para pantallas laterales.
 * - Frontal: soporte para faldas/pantallas frontales en melamina/formica.
 * - Vidrio: soporte específico para vidrio.
 */
export const KONCISA_PRIVACY_PANEL_SUPPORTS = {
  lateral: {
    modelSrc: '/assets/models/2KAC272000-30x60.glb',
    code: '2KAC272000',
    name: 'Soporte pantalla lateral Koncisa Plus',
  },

  frontal: {
    modelSrc: '/assets/models/soporte_pantalla_frontal.glb',
    code: 'SOPORTE-PANTALLA-FRONTAL',
    name: 'Soporte pantalla frontal Koncisa Plus',
  },

  vidrio: {
    modelSrc: '/assets/models/soporte_pantalla_vidrio.glb',
    code: 'SOPORTE-PANTALLA-VIDRIO',
    name: 'Soporte pantalla vidrio Koncisa Plus',
  },
};

export function getPrivacyPanelSupportConfig({ tipo = 'lateral', material = 'formica' }) {
  const mat = String(material || '').toLowerCase();

  if (mat === 'vidrio') {
    return KONCISA_PRIVACY_PANEL_SUPPORTS.vidrio;
  }

  if (tipo === 'frontal') {
    return KONCISA_PRIVACY_PANEL_SUPPORTS.frontal;
  }

  return KONCISA_PRIVACY_PANEL_SUPPORTS.lateral;
}

export const KONCISA_PRIVACY_PANEL_SKUS = {
  // =========================
  // PANTALLA LATERAL - FORMICA
  // =========================
  'lateral|formica|300|1000|22008689': '22000132934',
  'lateral|formica|300|1200|22008689': '22000132935',
  'lateral|formica|300|1500|22008689': '22000132936',

  // =========================
  // PANTALLA LATERAL - TELA BACKER LAFAYETE
  // =========================
  'lateral|tela-backer|300|1000|22010282': '22000132961',
  'lateral|tela-backer|300|1200|22010282': '22000132962',
  'lateral|tela-backer|300|1500|22010282': '22000132963',

  // =========================
  // PANTALLA LATERAL - TELA SIN BACKER LAFAYETE
  // =========================
  'lateral|tela|300|1000|22010282': '22000133977',
  'lateral|tela|300|1200|22010282': '22000133978',
  'lateral|tela|300|1500|22010282': '22000133979',

  // =========================
  // PANTALLA LATERAL - TELA BACKER GAMA 2
  // =========================
  'lateral|tela-backer|300|1000|22021827': '22000132961',
  'lateral|tela-backer|300|1200|22021827': '22000132962',
  'lateral|tela-backer|300|1500|22021827': '22000132963',

  // =========================
  // PANTALLA LATERAL - TELA SIN BACKER GAMA 2
  // =========================
  'lateral|tela|300|1000|22021827': '22000133977',
  'lateral|tela|300|1200|22021827': '22000133978',
  'lateral|tela|300|1500|22021827': '22000133979',

  // =========================
  // PANTALLA LATERAL - NUVANT
  // =========================
  'lateral|tela-backer|300|1000|22222222': '22000132961',
  'lateral|tela-backer|300|1200|22222222': '22000132962',
  'lateral|tela-backer|300|1500|22222222': '22000132963',

  'lateral|tela|300|1000|22222222': '22000133977',
  'lateral|tela|300|1200|22222222': '22000133978',
  'lateral|tela|300|1500|22222222': '22000133979',

  // =========================
  // PANTALLA LATERAL - PROQUINAL
  // =========================
  'lateral|tela-backer|300|1000|22021826': '22000132961',
  'lateral|tela-backer|300|1200|22021826': '22000132962',
  'lateral|tela-backer|300|1500|22021826': '22000132963',

  'lateral|tela|300|1000|22021826': '22000133977',
  'lateral|tela|300|1200|22021826': '22000133978',
  'lateral|tela|300|1500|22021826': '22000133979',

  // =========================
  // FALDA / PANTALLA FRONTAL - MELAMINA
  // =========================
  'frontal|melamina|300|1000|22008556': '22000132931',
  'frontal|melamina|300|1200|22008556': '22000132932',
  'frontal|melamina|300|1500|22008556': '22000132933',

  // =========================
  // FALDA / PANTALLA FRONTAL - VIDRIO
  // =========================
  'frontal|vidrio|300|1000|22006318': '22000132928',
  'frontal|vidrio|300|1200|22006318': '22000132929',
  'frontal|vidrio|300|1500|22006318': '22000132930',
};

export function normalizePanelLengthMm(lengthMm) {
  const n = Number(lengthMm);

  if (n <= 100) return 1000;
  if (n <= 120) return 1200;
  if (n <= 150) return 1500;

  return n;
}

export function resolveKoncisaPrivacyPanelCode({
  tipo = 'lateral',
  material = 'formica',
  heightMm = 300,
  lengthMm = 1200,
  finishCode,
}) {
  const normalizedLength = normalizePanelLengthMm(lengthMm);
  const key = `${tipo}|${material}|${heightMm}|${normalizedLength}|${finishCode}`;

  return KONCISA_PRIVACY_PANEL_SKUS[key] || null;
}

export function panelHasCanto(material) {
  return ['formica', 'melamina'].includes(String(material || '').toLowerCase());
}

function getPanelColor(material) {
  const mat = String(material || '').toLowerCase();

  if (mat === 'vidrio') return 0xbfdff2;
  if (mat === 'melamina') return 0xd8c7a3;
  if (mat === 'tela' || mat === 'tela-backer') return 0x9b9b9b;

  return 0xd9d9d9;
}

function createPanelMaterial(material, color) {
  const mat = String(material || '').toLowerCase();

  if (mat === 'vidrio') {
    return new THREE.MeshStandardMaterial({
      color: color ?? getPanelColor(material),
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.38,
    });
  }

  if (mat === 'tela' || mat === 'tela-backer') {
    return new THREE.MeshStandardMaterial({
      color: color ?? getPanelColor(material),
      roughness: 0.95,
      metalness: 0,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: color ?? getPanelColor(material),
    roughness: 0.75,
    metalness: 0,
  });
}

function createCantoMaterial(cantoColor) {
  return new THREE.MeshStandardMaterial({
    color: cantoColor ?? 0x2f2f2f,
    roughness: 0.65,
    metalness: 0,
  });
}

function createBox({
  name,
  widthM,
  heightM,
  depthM,
  material,
  position = [0, 0, 0],
  userData = {},
}) {
  const geometry = new THREE.BoxGeometry(widthM, heightM, depthM);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = {
    isSubPart: true,
    parentType: 'pantalla',
    ...userData,
  };

  return mesh;
}

/**
 * Crea la pantalla completa como UN SOLO GROUP.
 *
 * Estructura:
 * KONCISA_PRIVACY_PANEL_GROUP
 * ├── PANTALLA
 * ├── CANTO_SUPERIOR / INFERIOR / LATERALES, si aplica
 * └── soportes GLB, estos se agregan después desde ThreeCanvas
 */
export function createKoncisaPrivacyPanelProcedural({
  tipo = 'lateral',
  material = 'formica',
  lengthMm = 1200,
  heightMm = 300,
  thickMm,
  finishCode,
  x = 0,
  y = 750,
  z = 0,
  color,
  cantoColor = 0x2f2f2f,
  code,
  privacyPanelFinishId = null,
}) {
  const normalizedLengthMm = normalizePanelLengthMm(lengthMm);

  const finalThickMm =
    thickMm || KONCISA_PRIVACY_PANEL.defaultThicknessMm[String(material || '').toLowerCase()] || 18;

  const resolvedCode =
    code ||
    resolveKoncisaPrivacyPanelCode({
      tipo,
      material,
      heightMm,
      lengthMm: normalizedLengthMm,
      finishCode,
    }) ||
    `KPL-PANT-${tipo}-${material}-${heightMm}x${normalizedLengthMm}-${finishCode || 'SINACABADO'}`;

  const hasCanto = panelHasCanto(material);

  const supportConfig = getPrivacyPanelSupportConfig({
    tipo,
    material,
  });

  const group = new THREE.Group();

  group.name = `KONCISA_PRIVACY_PANEL_${resolvedCode}`;

  // Esta posición SÍ debe ir en el grupo padre.
  group.position.set(x * MM_TO_M, y * MM_TO_M, z * MM_TO_M);

  const lengthM = normalizedLengthMm * MM_TO_M;
  const heightM = heightMm * MM_TO_M;
  const thickM = finalThickMm * MM_TO_M;
  const cantoM = KONCISA_PRIVACY_PANEL.cantoThicknessMm * MM_TO_M;

  const isFrontal = tipo === 'frontal';

  const panelWidthM = isFrontal ? lengthM : thickM;
  const panelDepthM = isFrontal ? thickM : lengthM;

  const panelMat = createPanelMaterial(material, color);
  const cantoMat = createCantoMaterial(cantoColor);

  const mainPanel = createBox({
    name: 'PANTALLA',
    widthM: panelWidthM,
    heightM,
    depthM: panelDepthM,
    material: panelMat,
    userData: {
      subKey: 'pantalla',
      category: 'pantallas',
      code: resolvedCode,
      material,
      finishCode,
      materialCode: finishCode,
    },
  });

  group.add(mainPanel);

  if (hasCanto) {
    if (isFrontal) {
      group.add(
        createBox({
          name: 'CANTO_SUPERIOR',
          widthM: lengthM + cantoM * 2,
          heightM: cantoM,
          depthM: thickM + cantoM,
          material: cantoMat,
          position: [0, heightM / 2 + cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_INFERIOR',
          widthM: lengthM + cantoM * 2,
          heightM: cantoM,
          depthM: thickM + cantoM,
          material: cantoMat,
          position: [0, -heightM / 2 - cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_IZQUIERDO',
          widthM: cantoM,
          heightM,
          depthM: thickM + cantoM,
          material: cantoMat,
          position: [-lengthM / 2 - cantoM / 2, 0, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_DERECHO',
          widthM: cantoM,
          heightM,
          depthM: thickM + cantoM,
          material: cantoMat,
          position: [lengthM / 2 + cantoM / 2, 0, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );
    } else {
      // Pantalla lateral: el largo va sobre Z
      group.add(
        createBox({
          name: 'CANTO_SUPERIOR',
          widthM: thickM + cantoM,
          heightM: cantoM,
          depthM: lengthM + cantoM * 2,
          material: cantoMat,
          position: [0, heightM / 2 + cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_INFERIOR',
          widthM: thickM + cantoM,
          heightM: cantoM,
          depthM: lengthM + cantoM * 2,
          material: cantoMat,
          position: [0, -heightM / 2 - cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_FRONTAL',
          widthM: thickM + cantoM,
          heightM,
          depthM: cantoM,
          material: cantoMat,
          position: [0, 0, -lengthM / 2 - cantoM / 2],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_POSTERIOR',
          widthM: thickM + cantoM,
          heightM,
          depthM: cantoM,
          material: cantoMat,
          position: [0, 0, lengthM / 2 + cantoM / 2],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );
    }
  }

  const typologyParts = [
    {
      code: resolvedCode,
      description: `Pantalla ${tipo} ${material} ${normalizedLengthMm}x${heightMm}`,
      qty: 1,
      unitPrice: 0,
    },
    {
      code: supportConfig.code,
      description: supportConfig.name,
      qty: 2,
      unitPrice: 0,
    },
  ];

  if (hasCanto) {
    typologyParts.push({
      code: `CANTO-${material}-${finishCode || 'SIN-CODIGO'}`,
      description: `Canto para pantalla ${material}`,
      qty: 1,
      unitPrice: 0,
    });
  }

  group.userData = {
    isPartRoot: true,

    // Para que getRootPartObject siempre encuentre este grupo
    kind: 'PRIVACY_PANEL',

    type: 'pantalla',
    subtype: tipo,

    line: 'KONCISA.PLUS',

    codigoPT: resolvedCode,
    code: resolvedCode,

    name: `Pantalla ${tipo} ${material} ${normalizedLengthMm}x${heightMm}`,

    material,
    materialCode: finishCode || null,
    finishCode: finishCode || null,
    finishLabel: null,
    privacyPanelFinishId,

    hasCanto,
    hasBacker: material === 'tela-backer',

    dim: {
      lengthMm: normalizedLengthMm,
      heightMm,
      thickMm: finalThickMm,
    },

    dimMm: {
      widthMm: isFrontal ? normalizedLengthMm : finalThickMm,
      heightMm,
      depthMm: isFrontal ? finalThickMm : normalizedLengthMm,
      lengthMm: normalizedLengthMm,
      thickMm: finalThickMm,
    },

    typologyParts,

    supportConfig,

    supportAnchors: getPrivacyPanelSupportAnchors({
      tipo,
      lengthMm: normalizedLengthMm,
      heightMm,
    }),

    meta: {
      category: 'pantallas',
      material,
      finishCode,
      hasCanto,
      supportType: supportConfig.code,
    },
  };

  return group;
}

export function getPrivacyPanelSupportAnchors({
  tipo = 'lateral',
  lengthMm = 1200,
  heightMm = 300,
}) {
  const normalizedLengthMm = normalizePanelLengthMm(lengthMm);

  const lengthM = normalizedLengthMm * MM_TO_M;
  const insetM = KONCISA_PRIVACY_PANEL.supportInsetMm * MM_TO_M;
  const supportYOffsetM = KONCISA_PRIVACY_PANEL.supportYOffsetMm * MM_TO_M;

  const bottomY = -(heightMm * MM_TO_M) / 2 + supportYOffsetM;

  if (tipo === 'frontal') {
    return [
      {
        position: [-lengthM / 2 + insetM, bottomY, 0],
        rotation: [0, 0, 0],
      },
      {
        position: [lengthM / 2 - insetM, bottomY, 0],
        rotation: [0, Math.PI, 0],
      },
    ];
  }

  return [
    {
      position: [0, bottomY, -lengthM / 2 + insetM],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      position: [0, bottomY, lengthM / 2 - insetM],
      rotation: [0, -Math.PI / 2, 0],
    },
  ];
}

/**
 * Esta función se conserva porque KoncisaPlusBuilder.js todavía importa createPantalla.
 * Ese builder actualmente usa createPantalla como objeto de datos, no como malla 3D.
 * No la elimines, porque si no vuelve el error de import.
 */
export function createPantalla({
  tipo = 'frontal',
  widthMm = 1200,
  heightMm = 350,
  thickMm = 18,
  x = 0,
  y = 750,
  z = 0,
  code,
  material = 'formica',
  finishCode = '22008689',
}) {
  const resolvedCode =
    code ||
    resolveKoncisaPrivacyPanelCode({
      tipo,
      material,
      heightMm,
      lengthMm: widthMm,
      finishCode,
    }) ||
    `KPL-PANT-${String(tipo).toUpperCase()}-${widthMm}x${heightMm}`;

  return {
    type: 'pantalla',
    subtype: tipo,
    line: 'KONCISA.PLUS',
    code: resolvedCode,
    name: `Pantalla ${tipo} ${widthMm}x${heightMm}`,
    dimMm: {
      widthMm,
      heightMm,
      thickMm,
    },
    position: {
      x,
      y,
      z,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    meta: {
      category: 'pantallas',
      material,
      finishCode,
      hasCanto: panelHasCanto(material),
    },
  };
}
