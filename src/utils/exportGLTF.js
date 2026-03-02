// src/utils/export/exportGLTF.js
import { GLTFExporter } from 'three-stdlib';

export function exportSceneToGLTF(scene, options = {}) {
  const exporter = new GLTFExporter();

  const defaultOptions = {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
  };

  exporter.parse(
    scene,
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
    { ...defaultOptions, ...options }
  );
}
