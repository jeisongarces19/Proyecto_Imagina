// src/materials/textureRegistry.js
import * as THREE from 'three';

const textureCache = new Map();
const loader = new THREE.TextureLoader();

// Ajusta según tu carpeta real:
const BASE_PATH = '/assets/materiales/';

export function getTexture(textureFile) {
  const file = String(textureFile || '').trim();
  if (!file) return null;

  if (textureCache.has(file)) return textureCache.get(file);

  const tex = loader.load(
    `${BASE_PATH}${file}`,
    (t) => {
      // ✅ cuando ya cargó imagen, ahora sí
      t.colorSpace = THREE.SRGBColorSpace; // si usas r152+
      t.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn('[getTexture] No se pudo cargar textura:', `${BASE_PATH}${file}`, err);
    }
  );

  // ✅ NO hagas tex.needsUpdate=true aquí afuera
  textureCache.set(file, tex);
  return tex;
}
