// src/data/xmlLoader.js
export async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar: ${url}`);
  return res.text();
}

export function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('XML inválido o malformado.');

  return doc;
}

export async function fetchXml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar XML: ${url}`);
  const txt = await res.text();
  return new DOMParser().parseFromString(txt, 'application/xml');
}

export function text(node, tag) {
  const el = node.querySelector(tag);
  return (el?.textContent || '').trim();
}
