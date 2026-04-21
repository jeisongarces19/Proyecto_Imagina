import * as THREE from 'three';
import { getThreeMaterialFromDef } from './materialRegistry';

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function loadTextureCached(url) {
  if (!url) return null;
  if (textureCache.has(url)) return textureCache.get(url);

  const tex = textureLoader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  textureCache.set(url, tex);
  return tex;
}

function buildThreeMaterialFromDef(def = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: def.rgbValue
      ? `rgb(${String(def.rgbValue).replaceAll('_', ',')})`
      : def.color || '#cccccc',
    roughness: Number.isFinite(def.roughness) ? def.roughness : 0.9,
    metalness: Number.isFinite(def.metalness) ? def.metalness : 0.0,
    side: THREE.DoubleSide,
  });

  if (def.mapUrl) {
    const map = loadTextureCached(def.mapUrl);
    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.repeat.set(def.repeatX || 1, def.repeatY || 1);
      material.map = map;
    }
  }

  if (def.normalMapUrl) {
    const normalMap = loadTextureCached(def.normalMapUrl);
    if (normalMap) {
      normalMap.repeat.set(def.repeatX || 1, def.repeatY || 1);
      material.normalMap = normalMap;
    }
  }

  if (def.roughnessMapUrl) {
    const roughnessMap = loadTextureCached(def.roughnessMapUrl);
    if (roughnessMap) {
      roughnessMap.repeat.set(def.repeatX || 1, def.repeatY || 1);
      material.roughnessMap = roughnessMap;
    }
  }

  material.needsUpdate = true;
  return material;
}

// Helpers internos
function markNeedsUpdate(material) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach((m) => m && (m.needsUpdate = true));
  else material.needsUpdate = true;
}

function restoreMeshMaterial(mesh) {
  const orig = mesh?.userData?.__origMaterial;
  if (!orig) return;

  mesh.material = orig;
  markNeedsUpdate(mesh.material);
}

function resolveMaterial(materialDef) {
  const isTextured =
    !!materialDef?.mapUrl ||
    !!materialDef?.normalMapUrl ||
    !!materialDef?.roughnessMapUrl ||
    materialDef?.materialType === 'floor' ||
    materialDef?.useTexture === true;

  if (isTextured) {
    return buildThreeMaterialFromDef(materialDef);
  }

  return (
    getThreeMaterialFromDef(materialDef) ||
    buildThreeMaterialFromDef(materialDef) ||
    new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.75,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );
}

export function applyMaterialToObject3D(root, materialCode, materialDef) {
  if (!root) return;

  const code = materialCode ? String(materialCode) : null;
  root.userData.materialCode = code;

  // Sin acabado: restaurar originales
  if (!code) {
    root.traverse((obj) => {
      if (!obj?.isMesh) return;
      restoreMeshMaterial(obj);
    });
    return;
  }

  const baseMat = resolveMaterial(materialDef);

  root.traverse((obj) => {
    if (!obj?.isMesh) return;

    // guardar original una sola vez
    if (!obj.userData.__origMaterial) obj.userData.__origMaterial = obj.material;

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(() => (baseMat.clone ? baseMat.clone() : baseMat));
    } else {
      obj.material = baseMat.clone ? baseMat.clone() : baseMat;
    }

    obj.userData.materialCode = code;
    markNeedsUpdate(obj.material);
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

export function applyMaterialToMesh(mesh, materialCode, materialDef) {
  if (!mesh?.isMesh) return;

  const code = materialCode ? String(materialCode) : null;
  mesh.userData.materialCode = code;

  // Sin acabado: restaurar solo este mesh
  if (!code) {
    restoreMeshMaterial(mesh);
    return;
  }

  const baseMat = resolveMaterial(materialDef);

  // guardar original una sola vez
  if (!mesh.userData.__origMaterial) mesh.userData.__origMaterial = mesh.material;

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(() => (baseMat.clone ? baseMat.clone() : baseMat));
  } else {
    mesh.material = baseMat.clone ? baseMat.clone() : baseMat;
  }

  markNeedsUpdate(mesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}
