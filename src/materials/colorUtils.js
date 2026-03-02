// colorUtils.js
import * as THREE from 'three';

export function parseRgbValue(value) {
  if (!value) return null;

  // Si ya es un THREE.Color
  if (value instanceof THREE.Color) return value;

  // Si viene como objeto { r,g,b }
  if (typeof value === 'object' && value.r != null) {
    return new THREE.Color(Number(value.r) / 255, Number(value.g) / 255, Number(value.b) / 255);
  }

  if (typeof value !== 'string') return null;

  const clean = value.trim();

  // ✅ Caso HEX
  if (clean.startsWith('#')) {
    try {
      return new THREE.Color(clean);
    } catch {
      return null;
    }
  }

  // ✅ Caso 210_158_108
  if (clean.includes('_')) {
    const parts = clean.split('_').map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      return new THREE.Color(parts[0] / 255, parts[1] / 255, parts[2] / 255);
    }
  }

  // ✅ Caso 210,158,108
  if (clean.includes(',')) {
    const parts = clean.split(',').map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      return new THREE.Color(parts[0] / 255, parts[1] / 255, parts[2] / 255);
    }
  }

  return null;
}
