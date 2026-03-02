// src/data/ptsLoader.js
import { fetchXml, text } from './xmlLoader';

export async function loadPts(url = '/data/xml/ptsinbom_4.xml') {
  const doc = await fetchXml(url);
  const records = Array.from(doc.querySelectorAll('Records'));
  const map = new Map();

  for (const r of records) {
    const codigoPT = text(r, 'CODIGO_PT');
    if (!codigoPT) continue;

    const activo = text(r, 'ACTIVO')?.toUpperCase();
    if (activo && activo !== 'VERDADERO') continue;

    // ✅ AQUÍ ESTABA EL PROBLEMA
    const generico =
      r.querySelector('RecordsGenericos > Genericos > Generico')?.textContent?.trim() || null;

    map.set(codigoPT, {
      codigoPT,
      generico, // 🔑 FUNDAMENTAL
      descLarga: text(r, 'DESCRIPCION_LARGA'),
      tipo: text(r, 'TIPO'),
      subTipo: text(r, 'SUBTIPO'),
      linea: text(r, 'LINEA_PRODUCTO'),
      material: text(r, 'MATERIAL'),
      proveedor: text(r, 'PROVEEDOR'),
      numeroPlano: text(r, 'NUMERO_PLANO'),
      activo: activo || 'VERDADERO',
    });
  }

  return map;
}
