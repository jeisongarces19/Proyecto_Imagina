// materialRegistry.js
import * as THREE from 'three';
import { getTexture } from './textureRegistry.js';
import { parseRgbValue } from './colorUtils';

const materialCache = new Map();

export function getThreeMaterialFromDef(materialDef) {
  if (!materialDef) return null;

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

  const code = String(materialDef?.code || materialDef?.CODE || '').trim();
  if (!code) return null;

  if (materialCache.has(code)) return materialCache.get(code);

  const color = parseRgbValue(
    materialDef?.rgbValue || materialDef?.valorRgb || materialDef?.VALOR_RGB
  );

  const category =
    materialDef?.category || materialDef?.categoria || materialDef?.CATEGORIA || 'Materiales';

  const subCategory =
    materialDef?.subCategory || materialDef?.subCategoria || materialDef?.SUB_CATEGORIA || '';

  const family = materialDef?.family || materialDef?.familia || materialDef?.FAMILIA || '';

  const subfamily =
    materialDef?.subfamily || materialDef?.subFamilia || materialDef?.SUBFAMILIA || '';

  const vigencia = materialDef?.vigenciaRaw || materialDef?.vigencia || materialDef?.VIGENCIA || '';

  const textureFile =
    materialDef?.textureFile || materialDef?.archivoTextura || materialDef?.ARCHIVO_TEXTURA || '';

  const texturePath = [category, subCategory, family, subfamily, vigencia, textureFile]
    .filter(Boolean)
    .join('/');

  const mat = new THREE.MeshStandardMaterial({
    color: color || new THREE.Color('#d9d9d9'),
    roughness: 0.65,
    metalness: 0.05,
  });

  const tex = texturePath ? getTexture(texturePath) : null;

  if (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);

    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

    mat.map = tex;
  }

  materialCache.set(code, mat);
  return mat;
}
