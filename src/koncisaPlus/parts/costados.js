// src/koncisaPlus/parts/costados.js

function buildCostadoCode({ tipo, variante, depthMm, heightMm }) {
  const varTxt = variante ? `-${String(variante).toUpperCase()}` : '';
  return `KPL-COST-${String(tipo).toUpperCase()}${varTxt}-${depthMm}x${heightMm}`;
}

export function createCostado({
  tipo = 'terminal', // terminal | intermedio
  variante = 'base', // luego aquí podrás manejar tus 5 tipos terminales
  widthMm = 30,
  depthMm = 600,
  heightMm = 720,
  x = 0,
  y = 0,
  z = 0,
  code,
}) {
  return {
    type: 'costado',
    subtype: tipo,
    line: 'KONCISA.PLUS',
    code: code || buildCostadoCode({ tipo, variante, depthMm, heightMm }),
    name: `Costado ${tipo} ${variante}`,
    dimMm: {
      widthMm,
      depthMm,
      heightMm,
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
      variante,
      category: 'costados',
    },
  };
}
