// applyMaterial.js
import * as THREE from 'three';
import { getThreeMaterialFromDef } from './materialRegistry';

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

export function applyMaterialToObject3D(root, materialCode, materialDef) {
  if (!root) return;

  const code = materialCode ? String(materialCode) : null;
  root.userData.materialCode = code;

  // ✅ Sin acabado: restaurar TODOS los meshes del root
  if (!code) {
    root.traverse((obj) => {
      if (!obj?.isMesh) return;
      restoreMeshMaterial(obj);
    });
    return;
  }

  // ✅ Construir material base (puede venir null si def no está listo)
  let baseMat = getThreeMaterialFromDef(materialDef);

  // ✅ FALLBACK visible
  if (!baseMat) {
    console.warn(
      '[applyMaterialToObject3D] materialDef inválido o sin soporte:',
      materialDef,
      'code:',
      code
    );
    baseMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.75, metalness: 0.0 });
  }

  root.traverse((obj) => {
    if (!obj?.isMesh) return;

    // Guardar material original una sola vez
    if (!obj.userData.__origMaterial) obj.userData.__origMaterial = obj.material;

    // ✅ Si el mesh era multi-material, mantenemos la estructura (array)
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(() => (baseMat.clone ? baseMat.clone() : baseMat));
    } else {
      obj.material = baseMat.clone ? baseMat.clone() : baseMat;
    }

    markNeedsUpdate(obj.material);
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

export function applyMaterialToMesh(mesh, materialCode, materialDef) {
  if (!mesh?.isMesh) return;

  const code = materialCode ? String(materialCode) : null;
  mesh.userData.materialCode = code;

  // ✅ Sin acabado: restaurar SOLO este mesh
  if (!code) {
    restoreMeshMaterial(mesh);
    return;
  }

  let baseMat = getThreeMaterialFromDef(materialDef);

  // ✅ FALLBACK visible
  if (!baseMat) {
    console.warn(
      '[applyMaterialToMesh] materialDef inválido o sin soporte:',
      materialDef,
      'code:',
      code
    );
    baseMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.75, metalness: 0.0 });
  }

  // Guardar material original una sola vez
  if (!mesh.userData.__origMaterial) mesh.userData.__origMaterial = mesh.material;

  // ✅ Soportar mesh con material único o multi-material (array)
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(() => (baseMat.clone ? baseMat.clone() : baseMat));
  } else {
    mesh.material = baseMat.clone ? baseMat.clone() : baseMat;
  }

  markNeedsUpdate(mesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}
