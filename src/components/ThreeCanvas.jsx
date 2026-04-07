// ThreeCanvas.jsx (MEZCLA: mantiene tu 2D/zoom/controles tal como estaban + agrega muros bien implementados)
// ✅ Lo único “nuevo” es: wallsGroupRef + crear un group en la escena + useEffect EXTERNO que reconstruye muros.
// ✅ También corregí: applyFinishToActivePart (materialDef no estaba definido) y cleanup de listeners.

import { useEffect, useRef } from 'react';
import { useState } from 'react';
import * as THREE from 'three';
import { OrbitControls, GLTFLoader } from 'three-stdlib';
import { createSurfaceMesh, createSurfaceMeta } from '../factories/surfaceFactory';

import { MODEL_TYPES } from '../catalog/catalogData';

//import { resolveSurfaceCodigoPTCeil } from '../factories/surfaceSkuResolver';
import { resolveSurfaceCodigoPT } from '../rules/surfaceRules';
import { applyMaterialToObject3D, applyMaterialToMesh } from '../materials/applyMaterial';

import { exportSceneToGLTF } from '../utils/exportGLTF';

import { exportPlanToDXF } from '../utils/exportDXF';

import { getTipologiaDetalle } from '../services/tipologiasDetalle';
import { getChairDetail } from '../services/chairsLoader';

const MM_TO_M = 1 / 1000;

export default function ThreeCanvas({
  onApiReady,
  onSelectionChange,
  onBOMChange,
  walls = [],
  readOnly = false,
  materialsByCode,
  catalogByCode,
  country = 'CO',
}) {
  const mountRef = useRef(null);

  // ✅ NUEVO: referencia al group de muros (para reconstruir sin romper hooks/zoom/2D)
  const wallsGroupRef = useRef(null);

  // ✅ (opcional) guardar refs de scene para debug
  // const sceneRef = useRef(null);

  const [pendingProject, setPendingProject] = useState(null);
  const materialsByCodeRef = useRef(new Map());
  const catalogByCodeRef = useRef(catalogByCode || new Map());
  const loadProjectRef = useRef(null);

  const countryRef = useRef(country);
  const emitBOMRef = useRef(null);

  //mover todos los objetos del padre
  const [moveAsGroup, setMoveAsGroup] = useState(true);
  const moveAsGroupRef = useRef(true);

  const dragGroupStartRef = useRef(null);
  const dragRootStartRef = useRef(null);

  useEffect(() => {
    moveAsGroupRef.current = moveAsGroup;
  }, [moveAsGroup]);

  const [deleteAsGroup, setDeleteAsGroup] = useState(true);
  const deleteAsGroupRef = useRef(true);

  useEffect(() => {
    deleteAsGroupRef.current = deleteAsGroup;
  }, [deleteAsGroup]);

  useEffect(() => {
    countryRef.current = country;
    emitBOMRef.current?.();
  }, [country]);

  useEffect(() => {
    materialsByCodeRef.current = materialsByCode || new Map();
    console.log('[ThreeCanvas] materialsByCodeRef size:', materialsByCodeRef.current.size);
  }, [materialsByCode]);

  useEffect(() => {
    catalogByCodeRef.current = catalogByCode || new Map();
  }, [catalogByCode]);

  useEffect(() => {
    if (!pendingProject) return;

    const size = materialsByCodeRef.current?.size || 0;
    if (size === 0) {
      console.log('⏳ Esperando materialsByCodeRef...');
      return;
    }

    if (typeof loadProjectRef.current !== 'function') {
      console.log('⏳ Esperando loadProjectRef...');
      return;
    }

    console.log('✅ materialsByCodeRef listo, cargando proyecto...');
    loadProjectRef.current(pendingProject);
    setPendingProject(null);
  }, [pendingProject]);

  useEffect(() => {
    console.log('[ThreeCanvas] materialsByCode size:', materialsByCode?.size, materialsByCode);
    const container = mountRef.current;
    if (!container) return;

    // ====== Scene ======
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    // sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      2000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 2);
    scene.add(dir);

    // Grid + axes
    scene.add(new THREE.GridHelper(8, 80));
    scene.add(new THREE.AxesHelper(0.6));

    // ✅ NUEVO: group de muros (una sola vez)
    const wallsGroup = new THREE.Group();
    wallsGroup.name = 'WALLS_GROUP';
    scene.add(wallsGroup);
    wallsGroupRef.current = wallsGroup;

    // ====== State / Cache ======
    const loader = new GLTFLoader();
    const catalogCache = new Map(); // code -> { base, meta }
    let lastSnapTime = 0;
    const SNAP_COOLDOWN_MS = 120;

    // Piezas en escena
    const parts = []; // { code, obj }
    let activePart = null;
    let activeSubMesh = null; // ✅ NUEVO: parte exacta del GLB clickeada (Mesh)

    // IMPORTANT: solo objetos del catálogo (para click/drag)
    const pickables = [];

    // Snap
    let snapActive = true;
    const SNAP_THRESHOLD = 0.05; // 5 cm
    const SNAP_INTERVAL = 120; // ms (100–150 ideal)
    const MOVE_STEP = 0.02; // 2 cm
    const GRID_STEP = 0.01; // 1 cm (10 mm)

    // ====== Mouse / Drag ======
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 (piso)
    const dragPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let isDragging = false;

    let selectionHelper = null;

    function computeBounds2D(root) {
      // Calcula bounds en el espacio LOCAL del root (robusto para GLTF con hijos y pivotes raros)
      root.updateMatrixWorld(true);

      const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const localBox = new THREE.Box3();
      let hasAny = false;

      const v = new THREE.Vector3();
      const corners = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ];

      root.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;

        const g = child.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        const bb = g.boundingBox;
        if (!bb) return;

        // 8 corners del bbox local de la geometría del mesh
        corners[0].set(bb.min.x, bb.min.y, bb.min.z);
        corners[1].set(bb.min.x, bb.min.y, bb.max.z);
        corners[2].set(bb.min.x, bb.max.y, bb.min.z);
        corners[3].set(bb.min.x, bb.max.y, bb.max.z);
        corners[4].set(bb.max.x, bb.min.y, bb.min.z);
        corners[5].set(bb.max.x, bb.min.y, bb.max.z);
        corners[6].set(bb.max.x, bb.max.y, bb.min.z);
        corners[7].set(bb.max.x, bb.max.y, bb.max.z);

        for (let i = 0; i < 8; i++) {
          v.copy(corners[i]);

          // corner -> world (mesh)
          v.applyMatrix4(child.matrixWorld);

          // world -> rootLocal
          v.applyMatrix4(invRoot);

          if (!hasAny) {
            localBox.min.copy(v);
            localBox.max.copy(v);
            hasAny = true;
          } else {
            localBox.expandByPoint(v);
          }
        }
      });

      if (!hasAny) return null;

      const localCenter = new THREE.Vector3();
      const sizeLocal = new THREE.Vector3();
      localBox.getCenter(localCenter);
      localBox.getSize(sizeLocal);

      return { localCenter, sizeLocal };
    }

    function setActivePart(obj) {
      activePart = obj;
      activeSubMesh = null; // ✅ cada vez que cambia selección, reset submesh

      // limpia helper anterior
      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper = null;
      }

      if (activePart) {
        selectionHelper = new THREE.BoxHelper(activePart, 0xffcc00);
        scene.add(selectionHelper);
        selectionHelper.update();
      }

      const subKey = obj?.userData?.activeSubKey || null;
      const finishes = obj?.userData?.finishes || {};
      const subMaterialCode = subKey ? finishes[subKey]?.materialCode || null : null;
      const subName = obj?.userData?.activeSubName || null;

      onSelectionChange?.({
        code: obj.userData.codigoPT || obj.userData.code,
        dimMm: obj.userData?.dim || null,
        dimM: obj.userData?.dimM || obj.userData?.procedural || obj.userData?.dimMeters || null,

        // ✅ NUEVO (Fase D)
        materialCode: obj.userData?.materialCode || null,
        materialBase: obj.userData?.materialBase || null,

        // ✅ CLAVE para filtrar gen-esp_3 por COD_GENERICO
        generico: obj.userData?.generico || null,
        genericos: obj.userData?.genericos || null,

        line: obj.userData?.line || null,

        subKey,
        subName,
        subMaterialCode,
      });
    }

    function getPartsSnapshot2D() {
      return parts
        .map(({ obj, code }) => {
          if (!obj) return null;

          obj.updateMatrixWorld(true);

          // ✅ Preferir bounds2d robustos (si los calculas al cargar GLB / crear procedural)
          const b = obj.userData?.bounds2d;

          if (b?.localCenter && b?.sizeLocal) {
            const localCenter = new THREE.Vector3().fromArray(b.localCenter);
            const sizeLocal = new THREE.Vector3().fromArray(b.sizeLocal);

            // Centro real en WORLD (no obj.position)
            const centerWorld = localCenter.clone().applyMatrix4(obj.matrixWorld);

            // Tamaño real en WORLD (aplica escala world)
            const ws = new THREE.Vector3();
            obj.getWorldScale(ws);

            const w = Math.max(0.001, sizeLocal.x * ws.x);
            const d = Math.max(0.001, sizeLocal.z * ws.z);

            return {
              id: obj.userData?.instanceId || obj.uuid,
              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,
              x: centerWorld.x,
              z: centerWorld.z,
              w,
              d,
              rotY: obj.rotation.y || 0,
              kind: obj.userData?.kind || 'PART',
            };
          }

          // 🔁 Fallback: Box3 world (menos estable si el GLB tiene pivote raro)
          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          return {
            id: obj.userData?.instanceId || obj.uuid,
            codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,
            x: center.x,
            z: center.z,
            w: Math.max(0.001, size.x),
            d: Math.max(0.001, size.z),
            rotY: obj.rotation.y || 0,
            kind: obj.userData?.kind || 'PART',
          };
        })
        .filter(Boolean);
    }

    function selectPartById(instanceId) {
      const found = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      );
      if (found?.obj) {
        setActivePart(found.obj);
        frameObject?.(found.obj); // opcional: enfocar al seleccionar desde 2D
      }
    }

    function emitBOM() {
      const rows = new Map();

      function toFiniteNumber(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }

      function normalizePrices(prices = {}) {
        return {
          CO: toFiniteNumber(prices?.CO),
          EUC: toFiniteNumber(prices?.EUC),
          USD: toFiniteNumber(prices?.USD),
        };
      }

      function normalizeText(value) {
        return String(value ?? '').trim();
      }

      function addRow(
        code,
        qtyToAdd,
        forcedDescription,
        forcedUnitPrice,
        groupId,
        groupName,
        forcedPrices,
        groupCount,
        groupInstanceId
      ) {
        if (!code) return;

        const normalizedCode = normalizeText(code);
        const normalizedGroupId = normalizeText(groupId);
        const rowKey = normalizedGroupId
          ? `T:${normalizedGroupId}::${normalizedCode}`
          : `S::${normalizedCode}`;

        const item = catalogByCodeRef.current?.get?.(normalizedCode);

        const description =
          forcedDescription || item?.ui?.title || item?.ui?.subtitle || normalizedCode;

        const itemPrices = normalizePrices(item?.prices || {});
        const incomingPrices = normalizePrices(forcedPrices || {});
        const mergedIncomingPrices = {
          CO: incomingPrices.CO || itemPrices.CO,
          EUC: incomingPrices.EUC || itemPrices.EUC,
          USD: incomingPrices.USD || itemPrices.USD,
        };

        const rawPrice =
          forcedUnitPrice ??
          mergedIncomingPrices[countryRef.current] ??
          item?.prices?.[countryRef.current] ??
          0;
        const unit = Number(rawPrice || 0);

        const prev = rows.get(rowKey) || {
          code: normalizedCode,
          description,
          qty: 0,
          unitPrice: unit,
          price: unit,
          total: 0,
          prices: mergedIncomingPrices,
          groupId: normalizedGroupId || null,
          groupName: groupName || null,
          groupCount: groupCount || null,
          _groupInstanceIds: new Set(),
        };

        const groupInstanceIds = prev._groupInstanceIds || new Set();
        if (groupInstanceId) groupInstanceIds.add(String(groupInstanceId));

        const finalPrices = {
          CO: toFiniteNumber(prev?.prices?.CO) || mergedIncomingPrices.CO,
          EUC: toFiniteNumber(prev?.prices?.EUC) || mergedIncomingPrices.EUC,
          USD: toFiniteNumber(prev?.prices?.USD) || mergedIncomingPrices.USD,
        };

        const prevUnit = Number(prev.unitPrice || prev.price || 0);
        const unitBySelectedCountry = Number(finalPrices[countryRef.current] || 0);
        const finalUnit = prevUnit || unitBySelectedCountry || unit;
        const qty = Number(prev.qty || 0) + Number(qtyToAdd || 0);
        const total = finalUnit * qty;

        rows.set(rowKey, {
          ...prev,
          description,
          qty,
          unitPrice: finalUnit,
          price: finalUnit,
          total,
          prices: finalPrices,
          groupId: normalizedGroupId || prev.groupId || null,
          groupName: groupName || prev.groupName || null,
          groupCount:
            Math.max(
              Number(groupCount || 0),
              Number(prev.groupCount || 0),
              groupInstanceIds.size
            ) || null,
          _groupInstanceIds: groupInstanceIds,
        });
      }

      for (const p of parts) {
        const obj = p.obj;
        if (!obj) continue;

        if (obj.userData?.kind === 'TYPOLOGY') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name ||
            obj.userData?.tipologiaMeta?.descripcion ||
            `Tipología ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.typologyParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'CHAIR') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name ||
            obj.userData?.chairMeta?.descripcion ||
            `Silla ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.chairParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        const code = obj.userData?.codigoPT || obj.userData?.code || p.code;
        addRow(String(code), 1);
      }

      const bomRows = Array.from(rows.values()).map(({ _groupInstanceIds, ...row }) => ({
        ...row,
        groupCount: Number(row.groupCount || _groupInstanceIds?.size || 0) || null,
      }));

      onBOMChange?.(bomRows);
    }

    emitBOMRef.current = emitBOM;

    // Subir por padres hasta encontrar el objeto que tiene userData.code
    function getRootPartObject(intersectObj) {
      let cur = intersectObj;
      while (cur) {
        if (cur.userData && cur.userData.code) return cur;
        cur = cur.parent;
      }
      return null;
    }

    function updateMouseFromEvent(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }

    // ====== Helpers ======
    async function loadConnectors(code) {
      const res = await fetch(`/assets/meta/${code}.connectors.json`);
      if (!res.ok) throw new Error(`No se pudo cargar conectores para ${code}`);
      return res.json();
    }

    function getLineCenterWorld(obj, from, to) {
      obj.updateMatrixWorld(true);

      // PRIORIDAD: meta por instancia (procedural)
      const units =
        obj.userData?.meta?.units ||
        obj.userData?.units ||
        catalogCache.get(obj.userData?.code)?.meta?.units ||
        'mm';

      const v1 = new THREE.Vector3(from[0], from[1], from[2]);
      const v2 = new THREE.Vector3(to[0], to[1], to[2]);

      if (units === 'mm') {
        v1.multiplyScalar(MM_TO_M);
        v2.multiplyScalar(MM_TO_M);
      }

      const p1 = v1.applyMatrix4(obj.matrixWorld);
      const p2 = v2.applyMatrix4(obj.matrixWorld);

      return p1.add(p2).multiplyScalar(0.5);
    }

    function isCompatible(cm, ct) {
      const cmList = Array.isArray(cm?.compatibleWith) ? cm.compatibleWith : [];
      const ctList = Array.isArray(ct?.compatibleWith) ? ct.compatibleWith : [];

      // match por id (lo más confiable con tu JSON actual)
      const a = cmList.includes(ct?.id);
      const b = ctList.includes(cm?.id);

      return a || b;
    }

    function snapActivePart() {
      if (!snapActive || !activePart) return;

      const activeCode = activePart.userData.code;
      const activeMeta = catalogCache.get(activeCode)?.meta;
      const activeConnectors = activeMeta?.connectors || [];

      const now = performance.now();
      if (now - lastSnapTime < SNAP_COOLDOWN_MS) return;
      lastSnapTime = now;

      if (!activeConnectors.length) return;

      let best = {
        dist: Infinity,
        delta: null,
      };

      // Recorre todas las demás piezas
      for (const p of parts) {
        if (p.obj === activePart) continue;

        const targetMeta = catalogCache.get(p.code)?.meta;
        const targetConnectors = targetMeta?.connectors || [];
        if (!targetConnectors.length) continue;

        // Compara TODOS los conectores (activo vs target)
        for (const cm of activeConnectors) {
          if (!cm?.line?.from || !cm?.line?.to) continue;

          for (const ct of targetConnectors) {
            if (!ct?.line?.from || !ct?.line?.to) continue;

            // ✅ Compatibilidad por JSON
            if (!isCompatible(cm, ct)) continue;

            const cMove = getLineCenterWorld(activePart, cm.line.from, cm.line.to);
            const cTarget = getLineCenterWorld(p.obj, ct.line.from, ct.line.to);
            const dist = cMove.distanceTo(cTarget);

            if (dist < best.dist) {
              best.dist = dist;
              best.delta = cTarget.clone().sub(cMove);
            }
          }
        }
      }

      // Aplica el mejor snap si está dentro del umbral
      if (best.delta && best.dist <= SNAP_THRESHOLD) {
        activePart.position.add(best.delta);
        activePart.updateMatrixWorld(true);
        if (selectionHelper) selectionHelper.update();
      }
    }

    function frameObject(obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera.fov * Math.PI) / 180;

      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 2.8;

      camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ);
      camera.near = Math.max(0.01, cameraZ / 100);
      camera.far = cameraZ * 800;
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    }

    async function addPartFromGlb(item) {
      const codigoPT = item?.codigoPT;
      const src = item?.model?.src; // 👈 AQUÍ

      if (!codigoPT) {
        console.error('addPartFromGlb: item sin codigoPT', item);
        return;
      }
      if (!src) {
        console.error('addPartFromGlb: item sin model.src', item);
        return;
      }

      // cache por codigoPT
      if (!catalogCache.has(codigoPT)) {
        const gltf = await new Promise((resolve, reject) => {
          loader.load(src, resolve, undefined, reject);
        });

        const base = gltf.scene;

        let scale = 1;
        if (item.model?.units === 'mm') scale = 0.001;
        if (item.model?.units === 'm') scale = 1;

        base.scale.setScalar(scale);

        // conecta metadata (conectores) si existe
        let meta = null;
        if (item.connectorsMeta?.src) {
          const res = await fetch(item.connectorsMeta.src);
          if (res.ok) meta = await res.json();
        }

        catalogCache.set(codigoPT, { base, meta });
      }

      const { base } = catalogCache.get(codigoPT);
      const obj = base.clone(true);

      // ✅ bounds 2D robustos (local center + size)
      const b2d = computeBounds2D(obj);
      if (b2d) {
        obj.userData.bounds2d = {
          localCenter: b2d.localCenter.toArray(),
          sizeLocal: b2d.sizeLocal.toArray(),
        };
      }

      obj.userData = {
        codigoPT, // negocio
        code: codigoPT, // compat
        name: item.ui?.title || '',

        // 🔑 AQUÍ SE GUARDA EL GENÉRICO
        generico: item.generico || item.raw?.generico || null,

        // Fase D
        materialBase: item.materialBase || item.raw?.material || null,
        materialCode: null,

        kind: 'PART',
      };
      obj.name = obj.userData.name || codigoPT;

      const spawnX = 0.5 + parts.length * 0.9;
      const spawnZ = 0.5; // fijo positivo (o 0.5 + (parts.length%3)*0.9)
      obj.position.set(spawnX, 0, spawnZ);

      scene.add(obj);
      parts.push({ code: codigoPT, obj }); // BOM por codigoPT
      pickables.push(obj);

      setActivePart(obj);
      emitBOM?.();

      if (parts.length === 1) frameObject(obj);
    }

    async function loadExistingGlb(possibleSrcs) {
      for (const src of possibleSrcs) {
        try {
          const res = await fetch(src, { method: 'GET' });

          if (!res.ok) {
            console.warn('No existe:', src, res.status);
            continue;
          }

          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            console.warn('La ruta devolvió HTML y no GLB:', src);
            continue;
          }

          const arrayBuffer = await res.arrayBuffer();

          const gltf = await new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.parse(arrayBuffer, '', resolve, reject);
          });

          console.log('Modelo válido encontrado en:', src);
          return gltf;
        } catch (err) {
          console.warn('Falló carga de:', src, err);
        }
      }

      return null;
    }

    async function addTypology(codigoTipologia) {
      if (readOnly) return;
      const codigo = String(codigoTipologia);

      function getChildUnitPrice(hijo) {
        const precio = Number(hijo?.precio);
        if (Number.isFinite(precio) && precio > 0) return precio;
        return 0;
      }

      // 1) trae detalle por lista para construir precios por país
      const [detCO, detEUC, detUSD] = await Promise.all([
        getTipologiaDetalle(codigo, 'CO'),
        getTipologiaDetalle(codigo, 'EUC'),
        getTipologiaDetalle(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.error('Tipología no encontrada en tipologias-detalle.json:', codigo);
        return;
      }

      // 2) cargar tipologias GLB del bloque padre
      //const src = `/assets/models/koncisapluss_${codigo}.glb`;

      const possibleSrcs = [
        `/assets/models/koncisapluss_${codigo}.glb`,
        `/assets/models/${codigo}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) (opcional) escala si aplica
      // obj.scale.setScalar(0.001);

      const indexByCode = (detalle) => {
        const map = new Map();
        for (const h of detalle?.hijos || []) {
          const childCode = String(h?.producto?.codigo || '').trim();
          if (childCode) map.set(childCode, h);
        }
        return map;
      };

      const hijosCO = indexByCode(detCO);
      const hijosEUC = indexByCode(detEUC);
      const hijosUSD = indexByCode(detUSD);

      // 4) construir hijos con precios por país (precio unitario real de cada lista)
      const typologyParts = (det.hijos || [])
        .map((h) => {
          const code = String(h?.producto?.codigo || '');
          const description = h?.producto?.descripcion || '';
          const qty = Number(h?.cantidad || 0);

          const prices = {
            CO: getChildUnitPrice(hijosCO.get(code) || h),
            EUC: getChildUnitPrice(hijosEUC.get(code) || h),
            USD: getChildUnitPrice(hijosUSD.get(code) || h),
          };

          const unitPrice = Number(prices[countryRef.current] || 0);

          return { code, description, qty, unitPrice, prices };
        })
        .filter((x) => x.code && x.qty > 0);

      // 5) userData: OJO con el kind y el nombre de la lista
      obj.userData = {
        ...(obj.userData || {}),
        kind: 'TYPOLOGY', // ✅ ESTE ES EL QUE VA A LEER emitBOM
        codigoPT: codigo,
        code: codigo,
        name: det.descripcion || codigo,

        // ✅ ESTA ES LA LISTA QUE VA A EXPANDIR EL BOM
        typologyParts,

        tipologiaMeta: {
          categoria_costos: det.categoria_costos,
          descripcion: det.descripcion,
        },
      };

      obj.name = `TYPOLOGY_${codigo}`;

      // 6) posición inicial (ajusta a tu lógica)
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      scene.add(obj);
      parts.push({ code: codigo, obj });
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
    }

    async function addChair(codigoSilla) {
      if (readOnly) return;
      const codigo = String(codigoSilla);

      // 1) trae detalle de la silla desde el XML (precio e información)
      const [detCO, detEUC, detUSD] = await Promise.all([
        getChairDetail(codigo, 'CO'),
        getChairDetail(codigo, 'EUC'),
        getChairDetail(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.error('Silla no encontrada en PriceList:', codigo);
        return;
      }

      // 2) cargar GLB de silla desde carpeta Sillas
      const possibleSrcs = [
        `/assets/models/Sillas/${codigo}.glb`,
        `/assets/models/${codigo}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para silla ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData: similar al de tipologías pero para CHAIR
      // Para sillas, creamos "chairParts" array con un solo items (la silla misma)
      const chairParts = [
        {
          code: codigo,
          description: det.descripcion,
          qty: 1,
          unitPrice: Number(det.precio || 0),
          prices: {
            CO: detCO?.precio || 0,
            EUC: detEUC?.precio || 0,
            USD: detUSD?.precio || 0,
          },
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'CHAIR', // ✅ Tipo CHAIR para que el BOM lo reconozca
        codigoPT: codigo,
        code: codigo,
        name: det.descripcion || codigo,

        // ✅ Array de partes (solo la silla en este caso)
        chairParts,

        chairMeta: {
          descripcion: det.descripcion,
          precio: det.precio,
          udm: det.udm,
        },
      };

      obj.name = `CHAIR_${codigo}`;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      scene.add(obj);
      parts.push({ code: codigo, obj });
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
    }

    async function addCatalogItem(codigoPT) {
      if (readOnly) return;
      const codigo = String(codigoPT);

      // ✅ 0) si el código es una tipología (existe en tipologias-detalle.json), úsala como tipología
      // (esto evita mezclarla con catalogData normal)
      try {
        const det = await getTipologiaDetalle(codigo, countryRef.current);
        if (det) {
          await addTypology(codigo);
          return;
        }
      } catch (e) {
        // si falla el fetch no bloqueamos agregar catálogo normal
        console.warn('addCatalogItem: no se pudo consultar tipologías:', e);
      }

      // ✅ 1) flujo normal de catálogo
      const item = catalogByCodeRef.current?.get?.(codigo);

      if (!item) {
        console.error('addCatalogItem: codigoPT no existe en catalogData:', codigo);
        return;
      }

      if (item.model?.kind === MODEL_TYPES.GLB) {
        await addPartFromGlb(item); // 👈 le pasas el ITEM, no el codigo
        return;
      }

      if (item.model?.kind === MODEL_TYPES.PROCEDURAL) {
        const d = item.model.defaults || { widthM: 1.2, depthM: 0.6, thicknessM: 0.025 };
        addSurface(d, item); // 👈 le pasas item para guardar codigoPT en userData
        return;
      }

      console.error('addCatalogItem: item.model.kind inválido:', item);
    }

    function frameToObject(obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera.fov * Math.PI) / 180;
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 2.2;

      camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ);
      camera.near = Math.max(0.01, cameraZ / 100);
      camera.far = cameraZ * 1000;
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    }

    function addSurfaceFromRules({ line, widthMm, depthMm, thickMm }) {
      if (readOnly) return;
      // 1) resolver codigoPT real (del XML) usando reglas
      const codigoPT = resolveSurfaceCodigoPT({ line, widthMm, depthMm, thickMm });
      console.log('w:', widthMm, 'd:', depthMm, 't:', thickMm, 'line:', line);

      if (!codigoPT) {
        console.warn('No se encontró codigoPT para superficie con reglas:', {
          line,
          widthMm,
          depthMm,
          thickMm,
        });
        return;
      }

      // 2) crear mesh procedural EN METROS
      const widthM = widthMm / 1000;
      const depthM = depthMm / 1000;
      const thicknessM = thickMm / 1000;

      const mesh = createSurfaceMesh({ widthM, depthM, thicknessM });

      // 3) meta (para snap) por instancia (metros)
      const partCode = codigoPT;
      const meta = createSurfaceMeta({ partCode, widthM, depthM, thicknessM });

      // 4) userData IMPORTANTES
      mesh.userData = {
        // negocio
        codigoPT,
        code: codigoPT, // <- BOM/props se basan en esto (para cruzar XML)
        line,
        dim: { widthMm, depthMm, thickMm },

        // snap/meta por instancia
        meta,
        units: 'm',

        // id interno si quieres diferenciar instancias
        instanceId: `${codigoPT}__${Date.now()}__${Math.random().toString(16).slice(2)}`,
      };

      mesh.name = `SURFACE_${codigoPT}`;

      // 5) posición default
      mesh.position.set(parts.length * 0.9, 0, 0);

      scene.add(mesh);
      parts.push({ code: codigoPT, obj: mesh });
      pickables.push(mesh);

      // 6) seleccionar + BOM
      setActivePart(mesh);
      emitBOM();

      // 7) anti-freeze
      isDragging = false;
      controls.enabled = true;

      // opcional: encuadrar cámara en la superficie cuando se crea
      frameToObject(mesh);
    }

    function applyTransform(obj, t) {
      if (!t) return;
      if (Array.isArray(t.position)) obj.position.fromArray(t.position);
      if (Array.isArray(t.rotation)) obj.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
      if (Array.isArray(t.scale)) obj.scale.fromArray(t.scale);
      obj.updateMatrixWorld(true);
    }

    function clearProject() {
      // remover objetos de escena
      for (const p of parts) {
        scene.remove(p.obj);
      }
      parts.length = 0;

      // pickables
      pickables.length = 0;

      // selección
      activePart = null;
      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper = null;
      }

      // notifica UI
      onSelectionChange?.(null);
      emitBOM();
    }

    // ====== Eliminar piezas ======
    function disposeObject3D(root) {
      if (!root) return;
      root.traverse?.((n) => {
        // geometría
        if (n.geometry?.dispose) n.geometry.dispose();

        // materiales (single o array)
        const m = n.material;
        if (Array.isArray(m)) {
          m.forEach((mm) => mm?.dispose?.());
        } else if (m?.dispose) {
          m.dispose();
        }
      });
    }

    function removePartObject(obj) {
      if (!obj) return false;

      // quitar de escena
      try {
        scene.remove(obj);
      } catch (err) {
        void err;
      }

      // quitar de arrays internos
      const idx = parts.findIndex((p) => p.obj === obj);
      if (idx >= 0) parts.splice(idx, 1);

      const pIdx = pickables.indexOf(obj);
      if (pIdx >= 0) pickables.splice(pIdx, 1);

      // selección
      if (activePart === obj) {
        activePart = null;
        if (selectionHelper) {
          try {
            scene.remove(selectionHelper);
          } catch (err) {
            void err;
          }
          selectionHelper = null;
        }
        onSelectionChange?.(null);
      }

      // liberar recursos
      disposeObject3D(obj);

      emitBOM();
      return true;
    }

    function removeActivePart() {
      if (readOnly) return false;
      if (!activePart) return false;
      return removePartObject(activePart);
    }

    function removePartById(instanceId) {
      if (readOnly) return false;
      const found = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      );
      if (!found?.obj) return false;
      return removePartObject(found.obj);
    }

    async function loadProject(project) {
      console.log('[loadProject] materialsByCodeRef size:', materialsByCodeRef.current?.size || 0);

      if (!project?.parts?.length) return;

      clearProject();

      // cámara (opcional)
      if (project.camera?.position) camera.position.fromArray(project.camera.position);
      if (project.camera?.target) controls.target.fromArray(project.camera.target);
      controls.update();

      // ✅ Reaplica acabados por sub-mesh (solo para GLB/tipologías)
      function reapplyFinishesToRoot(root, finishesMap) {
        if (!root || !finishesMap || typeof finishesMap !== 'object') return;

        let applied = 0;
        let missingDefs = 0;

        root.traverse((n) => {
          if (!n?.isMesh) return;

          const key = getMeshPathKey(root, n);
          const fin = finishesMap[key];
          if (!fin?.materialCode) return;

          const codeStr = String(fin.materialCode).trim();
          const def = materialsByCodeRef.current?.get?.(codeStr) || null;

          // Persistencia en el mesh
          n.userData.materialCode = codeStr;

          if (!def) {
            missingDefs++;
            console.warn('[LOAD finishes] def NO encontrado', { key, codeStr });
            return;
          }

          // ✅ aplicar SOLO al mesh
          applyMaterialToMesh(n, codeStr, def);
          applied++;

          // (opcional) log detallado por mesh
          // console.log('[LOAD finishes] OK', { key, codeStr, mesh: n.name });
        });

        // persistencia en el root
        root.userData.finishes = finishesMap;

        console.log('[LOAD finishes] resumen:', {
          applied,
          missingDefs,
          totalFinishesKeys: Object.keys(finishesMap).length,
        });
      }

      // reconstruir piezas
      for (const part of project.parts) {
        // ✅ try/catch por pieza: si una falla, no tumba el resto
        try {
          const codigoPT = part.codigoPT;

          // ===========================
          // 1) SURFACE (procedural nuevo)
          // ===========================
          if (part.kind === 'SURFACE' && part.surface?.dimMm) {
            const { line, dimMm } = part.surface;

            const widthM = dimMm.widthMm / 1000;
            const depthM = dimMm.depthMm / 1000;
            const thicknessM = dimMm.thickMm / 1000;

            const mesh = createSurfaceMesh({ widthM, depthM, thicknessM });
            const meta = createSurfaceMeta({ partCode: codigoPT, widthM, depthM, thicknessM });

            const item = catalogByCodeRef.current?.get?.(codigoPT);

            mesh.userData = {
              code: codigoPT,
              codigoPT,
              kind: 'SURFACE',
              line,
              dim: dimMm,
              meta,
              units: 'm',
              internalCode: codigoPT,
              instanceId: `${codigoPT}__${Date.now()}__${Math.random().toString(16).slice(2)}`,

              generico: item?.generico || item?.raw?.generico || null,

              materialBase:
                part.materialBase || item?.materialBase || item?.raw?.material || 'LAMINA',
              materialCode: part.materialCode || null,

              // ✅ IMPORTANTÍSIMO: surfaces no tienen finishes
              finishes: null,
              activeSubKey: null,
              activeSubName: null,
            };

            mesh.name = `SURFACE_${codigoPT}`;
            applyTransform(mesh, part.transform);

            // ✅ aplicar material global (surface)
            if (mesh.userData.materialCode) {
              const codeStr = String(mesh.userData.materialCode);
              const def = materialsByCodeRef.current?.get?.(codeStr) || null;

              console.log('[LOAD surface]', { codigoPT, codeStr, defFound: !!def });

              applyMaterialToObject3D(mesh, codeStr, def);
            }

            scene.add(mesh);
            parts.push({ code: codigoPT, obj: mesh });
            pickables.push(mesh);
            catalogCache.set(codigoPT, { base: mesh, meta });
            continue;
          }

          // ===========================
          // 2) procedural viejo (compat)
          // ===========================
          if (part.procedural) {
            const mesh = createSurfaceMesh(part.procedural);
            const partCode = codigoPT;
            const meta = createSurfaceMeta({ partCode, ...part.procedural });

            mesh.userData.code = partCode;
            mesh.userData.procedural = part.procedural;
            mesh.name = partCode;

            mesh.userData.materialBase = part.materialBase ?? mesh.userData.materialBase ?? null;
            mesh.userData.materialCode = part.materialCode ?? mesh.userData.materialCode ?? null;

            // ✅ evitar finishes acá también
            mesh.userData.finishes = null;
            mesh.userData.activeSubKey = null;
            mesh.userData.activeSubName = null;

            applyTransform(mesh, part.transform);

            if (mesh.userData.materialCode) {
              const codeStr = String(mesh.userData.materialCode);
              const def = materialsByCodeRef.current?.get?.(codeStr) || null;

              console.log('[LOAD procedural]', { partCode, codeStr, defFound: !!def });

              applyMaterialToObject3D(mesh, codeStr, def);
            }

            scene.add(mesh);
            parts.push({ code: partCode, obj: mesh });
            pickables.push(mesh);
            catalogCache.set(partCode, { base: mesh, meta });
            continue;
          }

          // ===========================
          // 3) GLB (incluye tipologías)
          // ===========================
          await addCatalogItem(codigoPT);
          const last = parts[parts.length - 1]?.obj;
          if (!last) continue;

          applyTransform(last, part.transform);

          // ✅ material global
          last.userData.materialBase = part.materialBase || last.userData.materialBase || null;
          last.userData.materialCode = part.materialCode || last.userData.materialCode || null;

          if (last.userData.materialCode) {
            const codeStr = String(last.userData.materialCode);
            const def = materialsByCodeRef.current?.get?.(codeStr) || null;

            console.log('[LOAD glb-global]', { codigoPT, codeStr, defFound: !!def });

            applyMaterialToObject3D(last, codeStr, def);
          }

          // ✅ finishes por sub-parte (solo GLB)
          if (part.finishes && typeof part.finishes === 'object') {
            last.userData.activeSubKey = part.activeSubKey || null;
            last.userData.activeSubName = part.activeSubName || null;

            reapplyFinishesToRoot(last, part.finishes);
          }
        } catch (err) {
          console.error('[loadProject] Error cargando part:', part?.codigoPT, err);
          // sigue con la siguiente pieza
        }
      }

      emitBOM();
    }

    loadProjectRef.current = loadProject;

    // ====== API para el catálogo ======
    async function ensureLoaded(code) {
      if (catalogCache.has(code)) return;

      const gltf = await new Promise((resolve, reject) => {
        loader.load(`/assets/models/${code}.glb`, resolve, undefined, reject);
      });

      const base = gltf.scene;

      // Heurística escala
      const box0 = new THREE.Box3().setFromObject(base);
      const size0 = new THREE.Vector3();
      box0.getSize(size0);
      const maxDim0 = Math.max(size0.x, size0.y, size0.z);

      let scale = 1;
      if (maxDim0 > 10) scale = 0.001;
      else if (maxDim0 < 0.01) scale = 1000;
      base.scale.setScalar(scale);

      const meta = await loadConnectors(code);
      catalogCache.set(code, { base, meta });
    }

    async function addPart(code) {
      await ensureLoaded(code);

      const { base } = catalogCache.get(code);

      const obj = base.clone(true);
      obj.userData.code = code;
      obj.name = code; // ayuda para debug

      const spawnX = 0.5 + parts.length * 0.9;
      const spawnZ = 0.5; // fijo positivo (o 0.5 + (parts.length%3)*0.9)
      obj.position.set(spawnX, 0, spawnZ);

      scene.add(obj);
      parts.push({ code, obj });

      // MUY IMPORTANTE: para click/drag
      pickables.push(obj);

      setActivePart(obj);

      if (parts.length === 1) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = (camera.fov * Math.PI) / 180;
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.8;

        camera.position.set(cameraZ, cameraZ * 0.6, cameraZ);
        camera.near = Math.max(0.01, cameraZ / 100);
        camera.far = cameraZ * 500;
        camera.updateProjectionMatrix();

        controls.target.copy(center);
        controls.update();
      }
    }

    function toggleSnap() {
      snapActive = !snapActive;
      console.log('Snap:', snapActive ? 'ON' : 'OFF');
    }

    function endDrag(pointerId) {
      isDragging = false;
      controls.enabled = true;

      if (pointerId != null) {
        try {
          renderer.domElement.releasePointerCapture(pointerId);
        } catch (err) {
          void err;
        }
      }
    }

    emitBOM();

    onApiReady?.({
      addCatalogItem,
      addPart,
      // superficies
      addSurface,
      addSurfaceFromRules,
      addExternalGlbPart,
      // utilidades
      toggleSnap,
      exportProject,
      loadProject,
      clearProject,
      // eliminar
      removeActivePart,
      removePartById,
      applyFinishToActivePart,
      //2d dibujo
      getPartsSnapshot2D,
      selectPartById,
      addTypology,
      addChair,
      exportGLTF: () => exportSceneToGLTF(scene, { filename: 'proyecto.glb' }),
      exportDXF: () => {
        const snap = getPartsSnapshot2D();
        exportPlanToDXF({
          walls,
          partsSnapshot: snap,
          filename: 'planta.dxf',
        });
      },
      setMoveAsGroup: (value) => {
        moveAsGroupRef.current = value;
        setMoveAsGroup(value);
      },
      toggleMoveAsGroup: () => {
        const next = !moveAsGroupRef.current;
        moveAsGroupRef.current = next;
        setMoveAsGroup(next);
      },
      getMoveAsGroup: () => moveAsGroupRef.current,
      //eliminar por grupo
      setDeleteAsGroup: (value) => {
        deleteAsGroupRef.current = value;
        setDeleteAsGroup(value);
      },
      toggleDeleteAsGroup: () => {
        const next = !deleteAsGroupRef.current;
        deleteAsGroupRef.current = next;
        setDeleteAsGroup(next);
      },
      getDeleteAsGroup: () => deleteAsGroupRef.current,
      removeTargetOrGroup: (target) => removeTargetOrGroup(target),
      removeActiveOrGroup: () => removeTargetOrGroup(activePart),
    });

    function getGroupedObjects(target) {
      const groupId = target?.userData?.groupId;
      if (!groupId) return [target].filter(Boolean);

      return parts.map((p) => p?.obj).filter((obj) => obj?.userData?.groupId === groupId);
    }

    function moveTargetOrGroup(target, dx = 0, dy = 0, dz = 0) {
      if (!target) return;

      //const targets =     moveAsGroup && target?.userData?.groupId ? getGroupedObjects(target) : [target];

      const targets =
        moveAsGroupRef.current && target?.userData?.groupId ? getGroupedObjects(target) : [target];

      targets.forEach((obj) => {
        obj.position.x += dx;
        obj.position.y += dy;
        obj.position.z += dz;
        obj.updateMatrixWorld(true);
      });

      if (selectionHelper) selectionHelper.update();
    }

    //eliminar por grupo
    function removeTargetOrGroup(target) {
      if (!target) return false;

      const targets =
        deleteAsGroupRef.current && target?.userData?.groupId
          ? getGroupedObjects(target)
          : [target];

      let removedAny = false;

      targets.forEach((obj) => {
        const ok = removePartObject(obj);
        if (ok) removedAny = true;
      });

      return removedAny;
    }

    // ====== Keyboard ======
    function onKeyDown(e) {
      if (readOnly) return;

      // si estás escribiendo en un input, no interceptar teclas
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      // ✅ Supr / Backspace para eliminar pieza seleccionada
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activePart) {
          e.preventDefault();
          //removeActivePart();
          removeTargetOrGroup(activePart);
        }
        return;
      }

      if (!activePart) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          moveTargetOrGroup(activePart, 0, 0, -MOVE_STEP);
          break;
        case 'ArrowDown':
        case 's':
          moveTargetOrGroup(activePart, 0, 0, MOVE_STEP);
          break;
        case 'ArrowLeft':
        case 'a':
          moveTargetOrGroup(activePart, -MOVE_STEP, 0, 0);
          break;
        case 'ArrowRight':
        case 'd':
          moveTargetOrGroup(activePart, MOVE_STEP, 0, 0);
          break;
        case 'q':
          moveTargetOrGroup(activePart, 0, MOVE_STEP, 0);
          break;
        case 'e':
          moveTargetOrGroup(activePart, 0, -MOVE_STEP, 0);
          break;
        case 'r': {
          if (!activePart) break;
          const step = e.altKey ? THREE.MathUtils.degToRad(15) : THREE.MathUtils.degToRad(90);
          activePart.rotation.y += e.shiftKey ? -step : step;
          activePart.updateMatrixWorld(true);
          if (selectionHelper) selectionHelper.update();
          break;
        }
        case ' ':
          toggleSnap();
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // ====== Pointer (Select + Drag) ======
    function onPointerDown(e) {
      if (readOnly) return;
      if (!pickables.length) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(pickables, true);
      if (!hits.length) return;

      const hitObj = hits[0].object; // Mesh real clickeado
      const root = getRootPartObject(hitObj);
      if (!root) return;

      setActivePart(root);

      //if (moveAsGroup && root?.userData?.groupId) {
      if (moveAsGroupRef.current && root?.userData?.groupId) {
        const grouped = getGroupedObjects(root);
        dragGroupStartRef.current = grouped.map((obj) => ({
          obj,
          position: obj.position.clone(),
        }));
      } else {
        dragGroupStartRef.current = null;
      }

      dragRootStartRef.current = root.position.clone();

      // ✅ Guardar submesh clickeado
      activeSubMesh = hitObj?.isMesh ? hitObj : null;

      // ✅ Guardar key estable en el root (para persistencia y UI)
      if (activeSubMesh) {
        const subKey = getMeshPathKey(root, activeSubMesh);

        root.userData.activeSubKey = subKey;
        root.userData.activeSubName =
          activeSubMesh.name && activeSubMesh.name.trim() ? activeSubMesh.name.trim() : subKey;
      } else {
        root.userData.activeSubKey = null;
        root.userData.activeSubName = null;
      }

      // ---- DRAG ----
      isDragging = true;

      dragPlane.set(new THREE.Vector3(0, 1, 0), -root.position.y);
      raycaster.ray.intersectPlane(dragPlane, dragPoint);
      dragOffset.copy(dragPoint).sub(root.position);

      controls.enabled = false;
      renderer.domElement.setPointerCapture?.(e.pointerId);

      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerMove(e) {
      if (readOnly) return;
      if (!isDragging || !activePart) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);

      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const nextPos = dragPoint.clone().sub(dragOffset);

        if (
          moveAsGroupRef.current &&
          activePart?.userData?.groupId &&
          dragGroupStartRef.current &&
          dragRootStartRef.current
        ) {
          const delta = nextPos.clone().sub(dragRootStartRef.current);

          dragGroupStartRef.current.forEach(({ obj, position }) => {
            obj.position.copy(position.clone().add(delta));
            obj.updateMatrixWorld(true);
          });
        } else {
          activePart.position.copy(nextPos);
          activePart.updateMatrixWorld(true);
        }

        if (selectionHelper) selectionHelper.update();
      }
    }

    function onPointerUp(e) {
      if (readOnly) {
        // en solo-lectura igual liberamos el capture si existiera
        try {
          renderer.domElement.releasePointerCapture?.(e.pointerId);
        } catch (err) {
          void err;
        }
        isDragging = false;
        controls.enabled = true;
        return;
      }
      if (!isDragging) return;
      isDragging = false;
      controls.enabled = true;
      try {
        renderer.domElement.releasePointerCapture?.(e.pointerId);
      } catch (err) {
        void err;
      }

      dragGroupStartRef.current = null;
      dragRootStartRef.current = null;
      snapActivePart();
    }

    function onPointerCancel(e) {
      dragGroupStartRef.current = null;
      dragRootStartRef.current = null;
      endDrag(e.pointerId);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('lostpointercapture', onPointerCancel);

    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', () => {
      isDragging = false;
      controls.enabled = true;
    });
    window.addEventListener('blur', () => {
      isDragging = false;
      controls.enabled = true;
    });

    // ====== Resize ======
    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      //console.log('ThreeCanvas size:', container.clientWidth, container.clientHeight);

      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
    }
    window.addEventListener('resize', onResize);

    // ====== Loop ======
    let rafId;
    function animate() {
      if (!isDragging && controls.enabled === false) controls.enabled = true;

      controls.update();
      if (selectionHelper) selectionHelper.update();

      if (!isDragging) snapActivePart();

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    function addSurface(
      { widthM, depthM, thicknessM, line, codigoPT, dim, position, groupId, logicalCode } = {},
      item
    ) {
      if (readOnly) return;
      if (!codigoPT) {
        console.warn('No se crea superficie: no hay codigoPT real (regla faltante).');
        alert(
          'No tenemos esa superficie disponible para la medida, espesor y acabado seleccionados.'
        );

        return;
      }

      const widthMm = dim?.widthMm ?? Math.round(widthM * 1000);
      const depthMm = dim?.depthMm ?? Math.round(depthM * 1000);
      const thickMm = dim?.thickMm ?? Math.round(thicknessM * 1000);

      const mesh = createSurfaceMesh({ widthM, depthM, thicknessM });
      const meta = createSurfaceMeta({ widthM, depthM, thicknessM });

      const code = String(codigoPT);

      const description =
        item?.ui?.title ||
        item?.ui?.subtitle ||
        item?.raw?.descripcion ||
        item?.raw?.description ||
        code;

      const rawPrice =
        item?.prices?.CO ?? item?.prices?.co ?? item?.raw?.prices?.CO ?? item?.raw?.price ?? 0;
      const unitPrice = Number(rawPrice || 0);

      mesh.userData = {
        codigoPT: code,
        code,
        kind: 'SURFACE',
        line,
        dim: { widthMm, depthMm, thickMm },
        meta,
        units: 'm',
        instanceId: `${code}__${Date.now()}__${Math.random().toString(16).slice(2)}`,
        generico: item?.generico || item?.raw?.generico || null,
        materialBase: item?.materialBase || item?.raw?.material || 'LAMINA',
        materialCode: item?.materialCode || null,
        description,
        unitPrice,
        groupId: groupId || null,
        logicalCode: logicalCode || null,
      };

      mesh.name = code;

      if (position) {
        mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
      } else {
        mesh.position.set(parts.length * 0.9, 0, 0);
      }

      scene.add(mesh);
      parts.push({ code, obj: mesh });
      pickables.push(mesh);

      catalogCache.set(code, { base: mesh, meta });

      setActivePart(mesh);
      emitBOM();
    }

    async function addExternalGlbPart(part) {
      if (readOnly) return;
      if (!part?.model?.src) {
        console.warn('No se puede cargar el GLB: falta model.src');
        return;
      }

      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(part.model.src);

        const obj = gltf.scene.clone(true);

        obj.position.set(
          (part.position?.x || 0) / 1000,
          (part.position?.y || 0) / 1000,
          (part.position?.z || 0) / 1000
        );

        obj.rotation.set(part.rotation?.x || 0, part.rotation?.y || 0, part.rotation?.z || 0);

        obj.userData = {
          code: part.code || null,
          codigoPT: part.code || null,
          kind: part.type || 'GLB_PART',
          line: part.line || null,
          dim: part.dimMm || null,
          description: part.name || part.code || 'Pieza GLB',
          unitPrice: 0,
          meta: part.meta || {},
          instanceId: `${part.code || 'glb'}__${Date.now()}__${Math.random().toString(16).slice(2)}`,
          groupId: part?.groupId || null,
          logicalCode: part?.logicalCode || null,
        };

        obj.name = part.code || part.name || 'GLB_PART';

        scene.add(obj);
        parts.push({ code: part.code || obj.name, obj });
        pickables.push(obj);

        setActivePart(obj);
        emitBOM();
      } catch (error) {
        console.error('Error cargando GLB externo:', part.model.src, error);
        alert(`No se pudo cargar el modelo 3D: ${part.model.src}`);
      }
    }

    function looksLikeGuid(s) {
      return (
        typeof s === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
      );
    }

    function getMeshPathKey(root, mesh) {
      const path = [];
      let cur = mesh;

      while (cur && cur !== root) {
        const rawName = cur.name && cur.name.trim() ? cur.name.trim() : '';
        const useName = rawName && !looksLikeGuid(rawName);

        const idx =
          cur.parent && Array.isArray(cur.parent.children) ? cur.parent.children.indexOf(cur) : -1;

        path.push(useName ? `n:${rawName}` : `i:${idx}`);
        cur = cur.parent;
      }

      return path.reverse().join('/');
    }

    function applyFinishToActivePart(materialCode, materialDef = null, scope = 'PART') {
      console.log('[applyFinishToActivePart]', {
        kind: activePart?.userData?.kind,
        scope,
        activeSubMesh: !!activeSubMesh,
      });
      if (readOnly) return;
      if (!activePart) return;

      // ✅ normaliza
      const code = materialCode || null;
      const def = materialDef || null;

      const isSurface = activePart.userData?.kind === 'SURFACE';
      const wantAll = scope === 'ALL';

      // ✅ CASO ESPECIAL: SURFACE siempre es material global (no subpartes)
      if (isSurface) {
        activePart.userData.materialCode = code;
        activePart.userData.materialDef = def;

        // ✅ aplicar al objeto completo
        applyMaterialToObject3D(activePart, code, def);

        // ✅ NO guardar finishes en surfaces (evita key "")
        activePart.userData.finishes = null;
        activePart.userData.activeSubKey = null;
        activePart.userData.activeSubName = null;

        onSelectionChange?.({
          code: activePart.userData.codigoPT || activePart.userData.code,
          dimMm: activePart.userData?.dim || null,
          dimM: activePart.userData?.dimM || null,

          materialCode: activePart.userData?.materialCode ?? null,
          materialBase: activePart.userData?.materialBase ?? null,
          line: activePart.userData?.line ?? null,

          // sin subparte
          subKey: null,
          subName: null,
          subMaterialCode: null,
        });

        emitBOM?.();
        return;
      }

      // --- APLICAR A SUBPARTE (solo si NO es ALL) ---
      if (!wantAll && activeSubMesh?.isMesh) {
        const subKey =
          activePart.userData?.activeSubKey || getMeshPathKey(activePart, activeSubMesh);

        // ✅ persistir en el mesh (clave para cargar/export)
        activeSubMesh.userData.materialCode = code;

        // ✅ aplicar SOLO al mesh
        applyMaterialToMesh(activeSubMesh, code, def);

        // ✅ persistir en el root (para UI/BOM/export)
        activePart.userData.finishes = activePart.userData.finishes || {};
        activePart.userData.finishes[subKey] = {
          materialCode: code,
          materialBase: activePart.userData?.materialBase || null,
          subName: activePart.userData?.activeSubName || activeSubMesh.name || subKey,
        };
      }

      // --- APLICAR A TODO EL OBJETO (ALL) ---
      else {
        activePart.userData.materialCode = code;
        activePart.userData.materialDef = def;

        applyMaterialToObject3D(activePart, code, def);

        // ✅ opcional recomendado: si aplicas ALL, borra finishes para evitar mezcla
        // (si quieres conservarlos, comenta estas líneas)
        activePart.userData.finishes = null;
        activePart.userData.activeSubKey = null;
        activePart.userData.activeSubName = null;
      }

      // ✅ refrescar panel (para que no quede en blanco)
      const activeSubKey = activePart.userData?.activeSubKey || null;
      const finishes = activePart.userData?.finishes || {};
      const subMaterialCode = activeSubKey ? (finishes[activeSubKey]?.materialCode ?? null) : null;

      onSelectionChange?.({
        code: activePart.userData.codigoPT || activePart.userData.code,
        dimMm: activePart.userData?.dim || null,
        dimM: activePart.userData?.dimM || null,

        // material global
        materialCode: activePart.userData?.materialCode ?? null,
        materialBase: activePart.userData?.materialBase ?? null,
        line: activePart.userData?.line ?? null,

        // subparte
        subKey: activeSubKey,
        subName: activePart.userData?.activeSubName ?? null,
        subMaterialCode,
      });

      emitBOM?.();
    }

    function exportProject() {
      // Helper: recolectar acabados por sub-mesh desde la escena
      function collectFinishesFromObject(root) {
        if (root?.userData?.kind === 'SURFACE') return null;
        const out = {};

        // 1) si ya existe root.userData.finishes, úsalo (pero clónalo limpio)
        const raw = root?.userData?.finishes;
        if (raw && typeof raw === 'object') {
          for (const [k, v] of Object.entries(raw)) {
            if (!k || !v || typeof v !== 'object') continue;
            out[k] = {
              materialCode: v.materialCode ?? null,
              materialBase: v.materialBase ?? root.userData?.materialBase ?? null,
              subName: v.subName ?? null,
            };
          }
        }

        // 2) además, escanea meshes (por si se guardó en mesh.userData.materialCode)
        root.traverse?.((n) => {
          if (!n?.isMesh) return;

          const mc = n.userData?.materialCode ?? null;
          if (!mc) return;

          const key = getMeshPathKey(root, n);
          out[key] = {
            materialCode: mc,
            materialBase: root.userData?.materialBase ?? null,
            subName: n.name || key,
          };
        });

        return Object.keys(out).length ? out : null;
      }

      const data = {
        version: '1.1',
        units: 'm',
        camera: {
          position: camera.position.toArray(),
          target: controls.target.toArray(),
        },
        parts: parts.map(({ code, obj }) => {
          const codigoPT = obj.userData?.codigoPT || code;

          const entry = {
            codigoPT,
            transform: {
              position: obj.position.toArray(),
              rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
              scale: obj.scale.toArray(),
            },
          };

          // ✅ Superficie paramétrica
          if (obj.userData?.kind === 'SURFACE' && obj.userData?.dim) {
            entry.kind = 'SURFACE';
            entry.surface = {
              line: obj.userData?.line || null,
              dimMm: obj.userData?.dim,
            };
          }

          // ✅ Compat: procedural viejo
          if (obj.userData?.procedural) {
            entry.procedural = obj.userData.procedural;
          }

          // ✅ Material global (si se aplicó al objeto completo)
          entry.materialBase = obj.userData?.materialBase ?? null;
          entry.materialCode = obj.userData?.materialCode ?? null;

          const isSurface = obj.userData?.kind === 'SURFACE';

          if (isSurface) {
            // SURFACE = material global únicamente
            entry.finishes = null;
            entry.activeSubKey = null;
            entry.activeSubName = null;
          } else {
            // Tipologías/GLB = sub-acabados
            entry.finishes = collectFinishesFromObject(obj);
            entry.activeSubKey = obj.userData?.activeSubKey ?? null;
            entry.activeSubName = obj.userData?.activeSubName ?? null;
          }

          return entry;
        }),
      };

      return data;
    }

    // ====== Cleanup ======
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);

      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('lostpointercapture', onPointerCancel);

      window.removeEventListener('pointerup', onPointerUp);

      // limpiar muros (si existen)
      if (wallsGroupRef.current) {
        while (wallsGroupRef.current.children.length) {
          const ch = wallsGroupRef.current.children[wallsGroupRef.current.children.length - 1];
          wallsGroupRef.current.remove(ch);
          ch.geometry?.dispose?.();
          if (Array.isArray(ch.material)) ch.material.forEach((m) => m?.dispose?.());
          else ch.material?.dispose?.();
        }
        wallsGroupRef.current = null;
      }

      controls.dispose();
      renderer.dispose();
      if (renderer.domElement?.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      loadProjectRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ AQUi está la mezcla correcta:
  // - NO toca OrbitControls/zoom/2D snapshot
  // - Solo reconstruye el group de muros cuando cambie `walls`
  useEffect(() => {
    const group = wallsGroupRef.current;
    if (!group) return;

    // limpiar
    while (group.children.length) {
      const ch = group.children[group.children.length - 1];
      group.remove(ch);
      ch.geometry?.dispose?.();
      if (Array.isArray(ch.material)) ch.material.forEach((m) => m?.dispose?.());
      else ch.material?.dispose?.();
    }

    const matBase = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const hDefault = 2.4;
    const tDefault = 0.1;

    for (const w of walls || []) {
      const pts = w?.points || [];
      if (pts.length < 2) continue;

      const height = w.height ?? hDefault;
      const thickness = w.thickness ?? tDefault;

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.001) continue;

        const geom = new THREE.BoxGeometry(len, height, thickness);
        const mesh = new THREE.Mesh(geom, matBase.clone());

        mesh.name = `WALL_SEG_${w.id}_${i}`;
        // centro del segmento, apoyado en el piso
        mesh.position.set((a.x + b.x) / 2, height / 2, (a.z + b.z) / 2);
        mesh.rotation.y = Math.atan2(dz, dx);
        mesh.userData.kind = 'WALL';
        mesh.userData.wallId = w.id;

        group.add(mesh);
      }
    }
  }, [walls]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
