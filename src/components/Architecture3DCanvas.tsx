import {
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ACCENT_OPTIONS, THEME_PRESETS } from "../data/presetsAndProviders";
import type { PipelineNodeId, ThemePreferences } from "../types/app";

interface Architecture3DCanvasProps {
  selectedNode: PipelineNodeId;
  onSelectNode: (nodeId: PipelineNodeId) => void;
  themePreferences: ThemePreferences;
}

const NODE_FOCUS_CAMERAS: Record<
  PipelineNodeId | "overview",
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [0, 4.3, 9.2], target: [0, 0.9, 0] },
  client: { pos: [-3.4, 2.7, 4.9], target: [-3.4, 0.95, 0] },
  server: { pos: [0, 2.8, 5.1], target: [0, 1.0, 0] },
  gemini: { pos: [3.4, 2.8, 5.0], target: [3.4, 1.05, 0] },
};

const _tmpVec = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement("canvas");
    const gl = probeCanvas.getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.48)");
    grad.addColorStop(0.55, "rgba(0, 0, 0, 0.18)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Architecture3DCanvas({
  selectedNode,
  onSelectNode,
  themePreferences,
}: Architecture3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [dockOpen, setDockOpen] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simPhaseLabel, setSimPhaseLabel] = useState("Siap simulasi alur data");
  const [webglError, setWebglError] = useState(false);

  const selectedNodeRef = useRef<PipelineNodeId>(selectedNode);
  const onSelectNodeRef = useRef(onSelectNode);
  const autoSpinRef = useRef(autoSpin);
  const cameraTransitionRef = useRef<{
    active: boolean;
    pos: [number, number, number];
    target: [number, number, number];
  }>({
    active: false,
    pos: NODE_FOCUS_CAMERAS.overview.pos,
    target: NODE_FOCUS_CAMERAS.overview.target,
  });

  const simulationRef = useRef<{
    active: boolean;
    progress: number;
  }>({ active: false, progress: 0 });

  const sceneThemeUpdaterRef = useRef<((prefs: ThemePreferences) => void) | null>(
    null,
  );

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    sceneThemeUpdaterRef.current?.(themePreferences);
  }, [themePreferences]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = roomEnvTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(...NODE_FOCUS_CAMERAS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...NODE_FOCUS_CAMERAS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.5;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.minPolarAngle = 0.25;
    controls.update();

    controls.addEventListener("start", () => {
      cameraTransitionRef.current.active = false;
    });

    // Warm/cool 3-point studio lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.85);
    keyLight.position.set(5.5, 8.5, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    rimLight.position.set(-6, 4.5, -5);
    scene.add(rimLight);

    // Stage floor & subtle architectural grid
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xdde6f0,
      roughness: 0.86,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16, 0.2, 48),
      floorMat,
    );
    floorMesh.position.y = -0.1;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const stageDeckMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.65,
      metalness: 0.15,
    });
    const stageDeck = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.08, 3.2),
      stageDeckMat,
    );
    stageDeck.position.y = 0.04;
    stageDeck.receiveShadow = !isSoftwareGl;
    scene.add(stageDeck);

    // Shared materials
    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.34,
      metalness: 0.78,
    });
    const brushedSilverMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.22,
      metalness: 0.88,
    });
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.58,
      metalness: 0.3,
    });
    const accentEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      emissive: 0x0f766e,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.4,
    });
    const highlightRingMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.5,
    });

    const shadowTex = createContactShadowTexture();
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    });

    const stationGroups: Record<PipelineNodeId, THREE.Group> = {
      client: new THREE.Group(),
      server: new THREE.Group(),
      gemini: new THREE.Group(),
    };
    const selectionRings: Record<PipelineNodeId, THREE.Mesh> = {} as Record<
      PipelineNodeId,
      THREE.Mesh
    >;

    const addStationBase = (
      group: THREE.Group,
      nodeId: PipelineNodeId,
      x: number,
    ) => {
      group.position.set(x, 0.08, 0);
      group.userData.nodeId = nodeId;

      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 2.3),
        contactShadowMat,
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = 0.005;
      group.add(shadowPlane);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 0.14, 32),
        slateMat,
      );
      plinth.position.y = 0.07;
      plinth.castShadow = !isSoftwareGl;
      plinth.receiveShadow = !isSoftwareGl;
      group.add(plinth);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.06, 0.032, 12, 48),
        highlightRingMat.clone(),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.035;
      group.add(ring);
      selectionRings[nodeId] = ring;
    };

    // 1. CLIENT STATION (React UI Workstation - composite 6 parts)
    const clientGroup = stationGroups.client;
    addStationBase(clientGroup, "client", -3.4);

    const clientStand = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.55, 0.24),
      brushedSilverMat,
    );
    clientStand.position.set(0, 0.41, -0.18);
    clientStand.castShadow = !isSoftwareGl;
    clientGroup.add(clientStand);

    const clientDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.06, 0.52),
      darkChassisMat,
    );
    clientDeck.position.set(0, 0.17, 0.26);
    clientDeck.castShadow = !isSoftwareGl;
    clientGroup.add(clientDeck);

    const monitorChassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.96, 0.09),
      darkChassisMat,
    );
    monitorChassis.position.set(0, 0.96, -0.08);
    monitorChassis.rotation.x = -0.08;
    monitorChassis.castShadow = !isSoftwareGl;
    clientGroup.add(monitorChassis);

    const monitorScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.82, 0.02),
      accentEmissiveMat,
    );
    monitorScreen.position.set(0, 0.96, -0.025);
    monitorScreen.rotation.x = -0.08;
    clientGroup.add(monitorScreen);

    const uiBar1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.14, 0.03),
      brushedSilverMat,
    );
    uiBar1.position.set(-0.14, 1.1, 0.01);
    uiBar1.rotation.x = -0.08;
    clientGroup.add(uiBar1);

    const uiBar2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.14, 0.03),
      brushedSilverMat,
    );
    uiBar2.position.set(0.18, 0.84, 0.03);
    uiBar2.rotation.x = -0.08;
    clientGroup.add(uiBar2);

    // 2. SERVER STATION (Express Proxy + API Key Vault - composite 7 parts)
    const serverGroup = stationGroups.server;
    addStationBase(serverGroup, "server", 0);

    const serverTower = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.48, 0.95),
      darkChassisMat,
    );
    serverTower.position.set(0, 0.88, 0);
    serverTower.castShadow = !isSoftwareGl;
    serverTower.receiveShadow = !isSoftwareGl;
    serverGroup.add(serverTower);

    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.12, 0.98),
        brushedSilverMat,
      );
      blade.position.set(0, 0.45 + i * 0.38, 0);
      blade.castShadow = !isSoftwareGl;
      serverGroup.add(blade);
    }

    const vaultRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.055, 16, 36),
      accentEmissiveMat,
    );
    vaultRing.position.set(0, 1.02, 0.49);
    serverGroup.add(vaultRing);

    const vaultCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.1, 20),
      brushedSilverMat,
    );
    vaultCore.rotation.x = Math.PI / 2;
    vaultCore.position.set(0, 1.02, 0.49);
    serverGroup.add(vaultCore);

    const serverCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.1, 0.72),
      slateMat,
    );
    serverCap.position.set(0, 1.67, 0);
    serverGroup.add(serverCap);

    // 3. GEMINI CORE STATION (Pro + Flash Dual Engine - composite 6 parts)
    const geminiGroup = stationGroups.gemini;
    addStationBase(geminiGroup, "gemini", 3.4);

    const emitterCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.72, 0.24, 24),
      darkChassisMat,
    );
    emitterCollar.position.y = 0.26;
    emitterCollar.castShadow = !isSoftwareGl;
    geminiGroup.add(emitterCollar);

    const proCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.52, 0),
      accentEmissiveMat,
    );
    proCore.position.y = 1.1;
    proCore.castShadow = !isSoftwareGl;
    geminiGroup.add(proCore);

    const orbitRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.032, 12, 48),
      brushedSilverMat,
    );
    orbitRing1.position.y = 1.1;
    orbitRing1.rotation.set(Math.PI / 3, 0.3, 0);
    geminiGroup.add(orbitRing1);

    const orbitRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.024, 12, 48),
      brushedSilverMat,
    );
    orbitRing2.position.y = 1.1;
    orbitRing2.rotation.set(-Math.PI / 4, -0.4, 0.5);
    geminiGroup.add(orbitRing2);

    const flashSatellite = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      highlightRingMat,
    );
    flashSatellite.position.set(0.78, 1.1, 0);
    geminiGroup.add(flashSatellite);

    // Tag all meshes inside each station with nodeId for raycasting
    (Object.keys(stationGroups) as PipelineNodeId[]).forEach((nodeId) => {
      const grp = stationGroups[nodeId];
      grp.traverse((child) => {
        child.userData.nodeId = nodeId;
      });
      scene.add(grp);
    });

    // Data conduits between Client -> Server -> Gemini
    const forwardCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.45, 0.85, 0.12),
      new THREE.Vector3(-1.7, 1.25, 0.22),
      new THREE.Vector3(-0.62, 0.95, 0.12),
      new THREE.Vector3(0.62, 0.95, 0.12),
      new THREE.Vector3(1.7, 1.32, 0.22),
      new THREE.Vector3(2.55, 1.08, 0.12),
    ]);

    const returnCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.55, 0.86, -0.18),
      new THREE.Vector3(1.7, 0.55, -0.25),
      new THREE.Vector3(0.62, 0.72, -0.18),
      new THREE.Vector3(-0.62, 0.72, -0.18),
      new THREE.Vector3(-1.7, 0.55, -0.25),
      new THREE.Vector3(-2.45, 0.72, -0.18),
    ]);

    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.4,
      metalness: 0.6,
      transparent: true,
      opacity: 0.55,
    });

    const forwardTube = new THREE.Mesh(
      new THREE.TubeGeometry(forwardCurve, 48, 0.035, 8, false),
      conduitMat,
    );
    const returnTube = new THREE.Mesh(
      new THREE.TubeGeometry(returnCurve, 48, 0.03, 8, false),
      conduitMat,
    );
    scene.add(forwardTube, returnTube);

    const pulsePacketMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x14b8a6,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.2,
    });
    const requestPacket = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 16),
      pulsePacketMat,
    );
    requestPacket.visible = false;
    scene.add(requestPacket);

    // Theme updater
    const applyThemeToScene = (prefs: ThemePreferences) => {
      const preset =
        THEME_PRESETS.find((p) => p.id === prefs.preset) || THEME_PRESETS[0];
      const accentOpt =
        ACCENT_OPTIONS.find((a) => a.id === prefs.accent) || ACCENT_OPTIONS[0];
      const accentHex = preset.isDark
        ? accentOpt.darkSwatchHex
        : accentOpt.swatchHex;

      scene.background = new THREE.Color(preset.sceneBgHex);
      scene.fog = new THREE.FogExp2(preset.sceneBgHex, 0.036);
      floorMat.color.setHex(preset.sceneFloorHex);
      stageDeckMat.color.setHex(preset.isDark ? 0x1e293b : 0xcbd5e1);

      accentEmissiveMat.color.set(accentHex);
      accentEmissiveMat.emissive.set(accentHex);
      highlightRingMat.color.set(accentHex);
      highlightRingMat.emissive.set(accentHex);
      pulsePacketMat.emissive.set(accentHex);

      (Object.keys(selectionRings) as PipelineNodeId[]).forEach((id) => {
        const mat = selectionRings[id].material as THREE.MeshStandardMaterial;
        mat.color.set(accentHex);
        mat.emissive.set(accentHex);
      });
    };

    sceneThemeUpdaterRef.current = applyThemeToScene;
    applyThemeToScene(themePreferences);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting with click-vs-drag protection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const targets = Object.values(stationGroups);
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        const hitNode = hits[0].object.userData.nodeId as
          | PipelineNodeId
          | undefined;
        if (hitNode) {
          onSelectNodeRef.current(hitNode);
          cameraTransitionRef.current = {
            active: true,
            pos: NODE_FOCUS_CAMERAS[hitNode].pos,
            target: NODE_FOCUS_CAMERAS[hitNode].target,
          };
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 200);
      const h = Math.max(entry.contentRect.height, 200);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation loop with software WebGL pacing
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Subtle core & satellite motion
      proCore.rotation.y += dt * 0.65;
      orbitRing1.rotation.z += dt * 0.42;
      orbitRing2.rotation.x += dt * 0.34;
      const satAngle = now * 0.0014;
      flashSatellite.position.set(
        Math.cos(satAngle) * 0.78,
        1.1 + Math.sin(satAngle * 1.5) * 0.12,
        Math.sin(satAngle) * 0.78,
      );

      if (autoSpinRef.current && !isSoftwareGl) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;
      } else {
        controls.autoRotate = false;
      }

      // Selection ring emphasis
      const activeId = selectedNodeRef.current;
      (Object.keys(selectionRings) as PipelineNodeId[]).forEach((id) => {
        const mat = selectionRings[id].material as THREE.MeshStandardMaterial;
        const targetIntensity = id === activeId ? 1.55 : 0.25;
        mat.emissiveIntensity = THREE.MathUtils.damp(
          mat.emissiveIntensity,
          targetIntensity,
          7,
          dt,
        );
      });

      // Camera smooth transition
      if (cameraTransitionRef.current.active) {
        _desiredPos.set(...cameraTransitionRef.current.pos);
        _desiredTarget.set(...cameraTransitionRef.current.target);
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _desiredPos.x,
          5.5,
          dt,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _desiredPos.y,
          5.5,
          dt,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _desiredPos.z,
          5.5,
          dt,
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _desiredTarget.x,
          5.5,
          dt,
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _desiredTarget.y,
          5.5,
          dt,
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _desiredTarget.z,
          5.5,
          dt,
        );
        if (
          camera.position.distanceTo(_desiredPos) < 0.04 &&
          controls.target.distanceTo(_desiredTarget) < 0.04
        ) {
          cameraTransitionRef.current.active = false;
        }
      }

      // Data flow simulation
      if (simulationRef.current.active) {
        simulationRef.current.progress += dt * 0.42;
        const p = simulationRef.current.progress;
        requestPacket.visible = true;

        if (p < 1) {
          forwardCurve.getPointAt(Math.min(p, 1), _tmpVec);
          requestPacket.position.copy(_tmpVec);
          if (p < 0.45) {
            setSimPhaseLabel("1/3 Mengirim prompt dari React ke Express");
          } else if (p < 0.58) {
            setSimPhaseLabel("2/3 Server menyisipkan GEMINI_API_KEY & System Prompt");
          } else {
            setSimPhaseLabel("3/3 Gemini memproses konteks & menghasilkan jawaban");
          }
        } else if (p < 2) {
          const backT = Math.min(p - 1, 1);
          returnCurve.getPointAt(backT, _tmpVec);
          requestPacket.position.copy(_tmpVec);
          setSimPhaseLabel("Streaming balasan SSE kembali ke layar React");
        } else {
          simulationRef.current.active = false;
          simulationRef.current.progress = 0;
          requestPacket.visible = false;
          setSimRunning(false);
          setSimPhaseLabel("Siklus request selesai");
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored,
      );
      controls.dispose();
      roomEnvTexture.dispose();
      shadowTex.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
      sceneThemeUpdaterRef.current = null;
    };
  }, []);

  const focusCamera = (target: PipelineNodeId | "overview") => {
    if (target !== "overview") {
      onSelectNode(target);
    }
    cameraTransitionRef.current = {
      active: true,
      pos: NODE_FOCUS_CAMERAS[target].pos,
      target: NODE_FOCUS_CAMERAS[target].target,
    };
  };

  const triggerSimulation = () => {
    simulationRef.current.active = true;
    simulationRef.current.progress = 0;
    setSimRunning(true);
    setSimPhaseLabel("Memulai siklus request...");
  };

  if (webglError) {
    return (
      <div
        className="flex h-[340px] flex-col items-center justify-center border p-6 text-center"
        style={{
          backgroundColor: "var(--bg-surface-muted)",
          borderColor: "var(--border-subtle)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <p className="font-display text-base font-semibold">
          Visualisasi 3D sedang dalam mode pratinjau ringkas
        </p>
        <p className="mt-2 max-w-md text-sm" style={{ color: "var(--text-muted)" }}>
          Alur arsitektur tetap sama: Browser React mengirim pesan ke Express Server
          (tempat GEMINI_API_KEY disimpan), lalu diteruskan ke Gemini Engine.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(["client", "server", "gemini"] as PipelineNodeId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectNode(id)}
              className="px-3.5 py-2 text-xs font-semibold"
              style={{
                borderRadius: "var(--radius-control)",
                backgroundColor:
                  selectedNode === id ? "var(--accent)" : "var(--bg-surface)",
                color:
                  selectedNode === id
                    ? "var(--accent-contrast)"
                    : "var(--text-primary)",
              }}
            >
              {id === "client"
                ? "01. React Client"
                : id === "server"
                  ? "02. Server Express"
                  : "03. Gemini Engine"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-[400px] sm:h-[440px] w-full overflow-hidden border"
      style={{
        borderColor: "var(--border-subtle)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        ref={mountRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-label="Visualisasi 3D arsitektur AI Assistant dengan Three.js"
      />

      {/* Minimal Top-Left Static Readout */}
      <div
        className="pointer-events-none absolute top-3 left-3 z-10 border px-3 py-1.5 text-xs font-medium"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)",
          borderRadius: "var(--radius-control)",
          opacity: 0.94,
        }}
      >
        <span>Stage 3D Three.js</span>
        <span aria-hidden="true" className="mx-2 opacity-40">
          ·
        </span>
        <span style={{ color: "var(--text-muted)" }}>{simPhaseLabel}</span>
      </div>

      {/* Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL, zero side occlusion) */}
      <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 border px-3 py-1 text-[11px] font-semibold"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
            borderRadius: "var(--radius-control)",
          }}
        >
          {dockOpen ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Sembunyikan Kontrol</span>
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Tampilkan Kontrol 3D</span>
            </>
          )}
        </button>

        {dockOpen ? (
          <div
            className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 border p-1.5 shadow-sm"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <button
              type="button"
              onClick={triggerSimulation}
              disabled={simRunning}
              className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <Play className="h-3.5 w-3.5" />
              <span>{simRunning ? "Mengalir..." : "Simulasi Request"}</span>
            </button>

            <div
              className="mx-0.5 hidden h-5 w-px sm:block"
              style={{ backgroundColor: "var(--border-subtle)" }}
              aria-hidden="true"
            />

            {(
              [
                { id: "client", label: "01. React" },
                { id: "server", label: "02. Express" },
                { id: "gemini", label: "03. Gemini" },
              ] as Array<{ id: PipelineNodeId; label: string }>
            ).map((btn) => {
              const active = selectedNode === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => focusCamera(btn.id)}
                  className="min-h-[36px] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    borderRadius: "var(--radius-control)",
                    backgroundColor: active
                      ? "var(--accent-soft)"
                      : "transparent",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {btn.label}
                </button>
              );
            })}

            <div
              className="mx-0.5 hidden h-5 w-px sm:block"
              style={{ backgroundColor: "var(--border-subtle)" }}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => setAutoSpin((v) => !v)}
              className="inline-flex min-h-[36px] items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
              style={{
                borderRadius: "var(--radius-control)",
                backgroundColor: autoSpin ? "var(--accent-soft)" : "transparent",
                color: autoSpin ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Putar</span>
            </button>

            <button
              type="button"
              onClick={() => focusCamera("overview")}
              className="inline-flex min-h-[36px] items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors hover:opacity-80"
              style={{
                borderRadius: "var(--radius-control)",
                color: "var(--text-secondary)",
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Kamera</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
