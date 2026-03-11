// src/materials/textureRegistry.js
import * as THREE from 'three';

const textureCache = new Map();
const loader = new THREE.TextureLoader();

// Tu estructura actual:
// public/assets/materiales/<archivo>
const BASE_PATH = '/assets/materiales/';

export function getTexture(textureFile) {
  const file = String(textureFile || '').trim();
  if (!file) return null;

  // Cache
  const cached = textureCache.get(file);
  if (cached) return cached;

  const url = `${BASE_PATH}${file}`;

  // Creamos y cacheamos de una vez para evitar cargas duplicadas
  const tex = loader.load(
    url,
    () => {
      // ✅ Cuando ya cargó la imagen:
      // En r152+ se usa colorSpace (SRGB para texturas "color/albedo")
      tex.colorSpace = THREE.SRGBColorSpace;

      // ✅ NO es necesario tex.needsUpdate = true
      // (TextureLoader lo gestiona al asignar la imagen)
    },
    undefined,
    (err) => {
      console.warn('[textureRegistry] No se pudo cargar textura:', url, err);
    }
  );

  // Ajustes recomendados
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  // Opcional (ayuda a calidad si hay mipmaps)
  tex.anisotropy = 4;

  // Cachea y devuelve
  textureCache.set(file, tex);
  return tex;
}
