export async function loadPtsInBom() {
  const res = await fetch('/src/data/xml/ptsinbom_4.xml');
  const text = await res.text();

  const xml = new DOMParser().parseFromString(text, 'text/xml');

  const records = [...xml.querySelectorAll('Records')];

  const map = new Map();

  for (const r of records) {
    const codigo = r.querySelector('CODIGO_PT')?.textContent?.trim();
    if (!codigo) continue;

    map.set(codigo, {
      descripcion: r.querySelector('DESCRIPCION_LARGA')?.textContent || '',
      tipo: r.querySelector('TIPO')?.textContent || '',
      subtipo: r.querySelector('SUBTIPO')?.textContent || '',
      plano: r.querySelector('NUMERO_PLANO')?.textContent || '',
    });
  }

  return map;
}
