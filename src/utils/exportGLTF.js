// src/utils/exportGLTF.js
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';

function sanitizeUserData(data = {}) {
  const clean = { ...data };

  delete clean.materialDef;
  delete clean.__origMaterial;
  delete clean.activeSubKey;
  delete clean.activeSubName;
  delete clean.bounds2d;

  return clean;
}

function cloneMaterial(mat) {
  if (!mat) return mat;
  if (Array.isArray(mat)) return mat.map((m) => (m?.clone ? m.clone() : m));
  return mat.clone ? mat.clone() : mat;
}

function isExportable(obj) {
  if (!obj) return false;

  if (obj.type === 'AmbientLight') return false;
  if (obj.type === 'AxesHelper') return false;
  if (obj.type === 'GridHelper') return false;
  if (obj.type === 'BoxHelper') return false;

  return true;
}

function buildExportScene(scene) {
  const exportScene = new THREE.Scene();

  scene.children.forEach((child) => {
    if (!isExportable(child)) return;

    const clone = child.clone(true);

    clone.userData = sanitizeUserData(child.userData || {});

    clone.traverse((node) => {
      node.userData = sanitizeUserData(node.userData || {});

      if (node.isMesh) {
        node.material = cloneMaterial(node.material);
      }
    });

    exportScene.add(clone);
  });

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(2, 5, 2);
  exportScene.add(light);

  return exportScene;
}

export function exportSceneToGLTF(scene, options = {}) {
  const exporter = new GLTFExporter();

  const defaultOptions = {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
  };

  const exportScene = buildExportScene(scene);

  exporter.parse(
    exportScene,
    (result) => {
      const blob = new Blob(
        [result instanceof ArrayBuffer ? result : JSON.stringify(result, null, 2)],
        { type: 'application/octet-stream' }
      );

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = options.filename || 'project.glb';
      link.click();

      URL.revokeObjectURL(link.href);
    },
    (error) => {
      console.error('Error exportando GLB:', error);
    },
    { ...defaultOptions, ...options }
  );
}
