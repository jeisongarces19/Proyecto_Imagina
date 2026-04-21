export const floorMaterials = [
  {
    code: 'PISO_BALDOSA_GRIS_01',
    name: 'Baldosa gris clara',
    shortName: 'Baldosa gris',
    groupCode: 'PISO',
    groupName: 'Acabados piso',
    rgbValue: '210_210_210',

    materialType: 'floor',
    useTexture: true,

    mapUrl: '/assets/textures/floors/baldosa_gris/basecolor.jpg',
    normalMapUrl: '/assets/textures/floors/baldosa_gris/normal.jpg',
    roughnessMapUrl: '/assets/textures/floors/baldosa_gris/roughness.jpg',

    repeatX: 8,
    repeatY: 8,
    //cantidad de veces repetidas de la textura
    //repeatX: 40,
    //repeatY: 40,
    roughness: 0.9,
    metalness: 0.0,
  },

  {
    code: 'PISO_ALFOMBRA_AZUL_01',
    name: 'Alfombra azul',
    shortName: 'Alfombra azul',
    groupCode: 'PISO',
    groupName: 'Acabados piso',
    rgbValue: '74_99_145',

    materialType: 'floor',
    useTexture: true,

    mapUrl: '/assets/textures/floors/alfombra_azul/basecolor.jpg',
    normalMapUrl: '/assets/textures/floors/alfombra_azul/normal.jpg',

    repeatX: 6,
    repeatY: 6,
    roughness: 1.0,
    metalness: 0.0,
  },

  {
    code: 'PISO_MADERA_ROBLE_01',
    name: 'Madera roble clara',
    shortName: 'Madera roble',
    groupCode: 'PISO',
    groupName: 'Acabados piso',
    rgbValue: '181_155_120',

    materialType: 'floor',
    useTexture: true,

    mapUrl: '/assets/textures/floors/madera_roble/basecolor.jpg',
    normalMapUrl: '/assets/textures/floors/madera_roble/normal.jpg',
    roughnessMapUrl: '/assets/textures/floors/madera_roble/roughness.jpg',

    repeatX: 10,
    repeatY: 10,
    roughness: 0.85,
    metalness: 0.0,
  },
];
