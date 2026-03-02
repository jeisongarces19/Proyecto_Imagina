// materialRegistry.js
import * as THREE from 'three';
import { getTexture } from './textureRegistry.js'; // asumo que ya lo tienes
import { parseRgbValue } from './colorUtils'; // asumo que ya lo tienes

const materialCache = new Map();

export function getThreeMaterialFromDef(materialDef) {
  // ✅ tolera: null/undefined
  if (!materialDef) return null;

  // ✅ tolera: si te llega un string (código)
  // (no recomendado, pero evita romper)
  if (typeof materialDef === 'string' || typeof materialDef === 'number') {
    const codeStr = String(materialDef).trim();
    if (!codeStr) return null;

    if (materialCache.has(codeStr)) return materialCache.get(codeStr);

    const matFallback = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d9d9d9'),
      roughness: 0.65,
      metalness: 0.05,
    });

    materialCache.set(codeStr, matFallback);
    return matFallback;
  }

  // ✅ código del material
  const code = String(materialDef?.code || materialDef?.CODE || '').trim();
  if (!code) return null;

  if (materialCache.has(code)) return materialCache.get(code);

  // ✅ color (soporta varias llaves)
  const color = parseRgbValue(
    materialDef?.rgbValue || materialDef?.valorRgb || materialDef?.VALOR_RGB
  );

  // ✅ textura (soporta varias llaves)
  const textureFile =
    materialDef?.textureFile || materialDef?.archivoTextura || materialDef?.ARCHIVO_TEXTURA;

  const mat = new THREE.MeshStandardMaterial({
    color: color || new THREE.Color('#d9d9d9'),
    roughness: 0.65,
    metalness: 0.05,
  });

  const tex = getTexture(textureFile);
  if (tex) {
    // ✅ ajustes típicos para texturas en three
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);

    // Si tu renderer usa color management moderno
    // (si te da error, lo comentas)
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

    tex.needsUpdate = true;
    mat.map = tex;
  }

  materialCache.set(code, mat);
  return mat;
}
