export async function loadCategoriasIntranet() {
  const res = await fetch('/assets/data/tipologias/categorias_intranet.json');
  const data = await res.json();
  return data;
}
