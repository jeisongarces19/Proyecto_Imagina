export const KONCISA_PRIVACY_PANEL_FINISH_OPTIONS = [
  // =========================
  // LATERAL - FORMICA
  // =========================
  {
    id: 'PANEL_LATERAL_FORMICA_22008689',
    label: 'Pantalla lateral Formica',
    tipo: 'lateral',
    material: 'formica',
    finishCode: '22008689',
    heightMm: 300,
    hasCanto: true,
    hasBacker: false,
  },

  // =========================
  // LATERAL - TELA BACKER
  // =========================
  {
    id: 'PANEL_LATERAL_TELA_BACKER_LAFAYETE_22010282',
    label: 'Pantalla lateral tela Backer Lafayette',
    tipo: 'lateral',
    material: 'tela-backer',
    finishCode: '22010282',
    heightMm: 300,
    hasCanto: false,
    hasBacker: true,
  },
  {
    id: 'PANEL_LATERAL_TELA_BACKER_GAMA2_22021827',
    label: 'Pantalla lateral tela Backer Gama 2',
    tipo: 'lateral',
    material: 'tela-backer',
    finishCode: '22021827',
    heightMm: 300,
    hasCanto: false,
    hasBacker: true,
  },
  {
    id: 'PANEL_LATERAL_TELA_BACKER_NUVANT_22222222',
    label: 'Pantalla lateral tela Backer Nuvant',
    tipo: 'lateral',
    material: 'tela-backer',
    finishCode: '22222222',
    heightMm: 300,
    hasCanto: false,
    hasBacker: true,
  },
  {
    id: 'PANEL_LATERAL_TELA_BACKER_PROQUINAL_22021826',
    label: 'Pantalla lateral tela Backer Proquinal',
    tipo: 'lateral',
    material: 'tela-backer',
    finishCode: '22021826',
    heightMm: 300,
    hasCanto: false,
    hasBacker: true,
  },

  // =========================
  // LATERAL - TELA SIN BACKER
  // =========================
  {
    id: 'PANEL_LATERAL_TELA_LAFAYETE_22010282',
    label: 'Pantalla lateral tela sin Backer Lafayette',
    tipo: 'lateral',
    material: 'tela',
    finishCode: '22010282',
    heightMm: 300,
    hasCanto: false,
    hasBacker: false,
  },
  {
    id: 'PANEL_LATERAL_TELA_GAMA2_22021827',
    label: 'Pantalla lateral tela sin Backer Gama 2',
    tipo: 'lateral',
    material: 'tela',
    finishCode: '22021827',
    heightMm: 300,
    hasCanto: false,
    hasBacker: false,
  },
  {
    id: 'PANEL_LATERAL_TELA_NUVANT_22222222',
    label: 'Pantalla lateral tela sin Backer Nuvant',
    tipo: 'lateral',
    material: 'tela',
    finishCode: '22222222',
    heightMm: 300,
    hasCanto: false,
    hasBacker: false,
  },
  {
    id: 'PANEL_LATERAL_TELA_PROQUINAL_22021826',
    label: 'Pantalla lateral tela sin Backer Proquinal',
    tipo: 'lateral',
    material: 'tela',
    finishCode: '22021826',
    heightMm: 300,
    hasCanto: false,
    hasBacker: false,
  },

  // =========================
  // FRONTAL / FALDA - MELAMINA
  // =========================
  {
    id: 'PANEL_FRONTAL_MELAMINA_22008556',
    label: 'Falda / pantalla frontal Melamina',
    tipo: 'frontal',
    material: 'melamina',
    finishCode: '22008556',
    heightMm: 300,
    hasCanto: true,
    hasBacker: false,
  },

  // =========================
  // FRONTAL / FALDA - VIDRIO
  // =========================
  {
    id: 'PANEL_FRONTAL_VIDRIO_22006318',
    label: 'Falda / pantalla frontal Vidrio',
    tipo: 'frontal',
    material: 'vidrio',
    finishCode: '22006318',
    heightMm: 300,
    hasCanto: false,
    hasBacker: false,
  },
];

export function getKoncisaPrivacyPanelFinishById(id) {
  return (
    KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.find((option) => option.id === id) ||
    KONCISA_PRIVACY_PANEL_FINISH_OPTIONS[0]
  );
}
