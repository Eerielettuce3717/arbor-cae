import { useCallback, useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import {
  composeWorld,
  mat4ToFrame,
  transformPoint,
  type Mat4,
} from "../../assembly/mateMath";
import {
  useAssemblyStore,
  visualWorldTransform,
} from "../../store/assemblyStore";
import type { AssemblyInstance, ExplodedView, MateConnector } from "../../store/assemblyTypes";
import { MATE_CATALOG } from "../../store/assemblyTypes";
import {
  OnshapeControls,
  type ActiveCamera,
} from "../viewport/controls/OnshapeControls";
import {
  DEFAULT_DISPLAY_OVERRIDES,
  DEFAULT_RENDER_OPTIONS,
  type CameraMode,
  type DisplayOverride,
  type DisplayOverridesState,
  type RenderOptionsState,
} from "../viewport/types";
import { ViewCube, type ViewCubeFace } from "../viewport/ViewCube";
import { ViewportMenus } from "../viewport/ViewportMenus";
import { ReferenceGeometry } from "../viewport/ReferenceGeometry";
import { useTheme } from "../../providers/ThemeProvider";
import {
  applyViewportSceneTheme,
  createThemedGrid,
} from "../../theme/viewportTheme";
import {
  InferenceEngine,
  defaultReferenceTargets,
} from "../../utils/inferencing";

const AXONOMETRIC: Record<
  "isometric" | "dimetric" | "trimetric",
  { dir: Vector3; label: string }
> = {
  isometric: { dir: new Vector3(1, 1, 1).normalize(), label: "Isometric" },
  dimetric: { dir: new Vector3(1, 0.5, 1).normalize(), label: "Dimetric" },
  trimetric: { dir: new Vector3(1.2, 0.75, 0.55).normalize(), label: "Trimetric" },
};

const FACE_DIRS: Record<Exclude<ViewCubeFace, "iso">, Vector3> = {
  front: new Vector3(0, 0, 1),
  back: new Vector3(0, 0, -1),
  right: new Vector3(1, 0, 0),
  left: new Vector3(-1, 0, 0),
  top: new Vector3(0, 1, 0),
  bottom: new Vector3(0, -1, 0),
};

interface AssemblyViewportApi {
  perspective: PerspectiveCamera;
  orthographic: OrthographicCamera;
  active: ActiveCamera;
  controls: OnshapeControls;
  scene: Scene;
  instanceRoot: Group;
  connectorRoot: Group;
  mateLine: LineSegments;
  ambient: AmbientLight;
  key: DirectionalLight;
  fill: DirectionalLight;
  grid: GridHelper;
  setActiveCamera: (cam: ActiveCamera) => void;
  fit: () => void;
  aimDirection: (dir: Vector3, orthographic: boolean) => void;
  rebuild: () => void;
}

const MATE_TOOL_TYPES = new Set(MATE_CATALOG.map((m) => m.type));

/**
 * Assembly 3D viewport: instance solids, mate-connector snap points, mate lines.
 */
export function AssemblyViewport() {
  const { resolvedTheme } = useTheme();
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AssemblyViewportApi | null>(null);
  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;

  const instances = useAssemblyStore((s) => s.instances);
  const connectors = useAssemblyStore((s) => s.connectors);
  const mates = useAssemblyStore((s) => s.mates);
  const selectedInstanceIds = useAssemblyStore((s) => s.selectedInstanceIds);
  const selectedConnectorId = useAssemblyStore((s) => s.selectedConnectorId);
  const pendingConnectorId = useAssemblyStore((s) => s.pendingConnectorId);
  const snapMode = useAssemblyStore((s) => s.snapMode);
  const showMatesMode = useAssemblyStore((s) => s.showMatesMode);
  const activeTool = useAssemblyStore((s) => s.activeTool);
  const explodedViews = useAssemblyStore((s) => s.explodedViews);
  const activeExplodedViewId = useAssemblyStore((s) => s.activeExplodedViewId);
  const explodeAmount = useAssemblyStore((s) => s.explodeAmount);
  const statusMessage = useAssemblyStore((s) => s.statusMessage);
  const pickConnector = useAssemblyStore((s) => s.pickConnector);
  const selectInstances = useAssemblyStore((s) => s.selectInstances);

  const exploded = explodedViews.find((v) => v.id === activeExplodedViewId) ?? null;
  const mateToolActive = MATE_TOOL_TYPES.has(activeTool as (typeof MATE_CATALOG)[number]["type"]);
  const showConnectors = snapMode || mateToolActive || showMatesMode;

  const instancesRef = useRef(instances);
  instancesRef.current = instances;
  const connectorsRef = useRef(connectors);
  connectorsRef.current = connectors;
  const matesRef = useRef(mates);
  matesRef.current = mates;
  const explodedRef = useRef(exploded);
  explodedRef.current = exploded;
  const explodeAmountRef = useRef(explodeAmount);
  explodeAmountRef.current = explodeAmount;
  const showConnectorsRef = useRef(showConnectors);
  showConnectorsRef.current = showConnectors;
  const showMatesRef = useRef(showMatesMode);
  showMatesRef.current = showMatesMode;
  const selectedInstRef = useRef(selectedInstanceIds);
  selectedInstRef.current = selectedInstanceIds;
  const selectedConnRef = useRef(selectedConnectorId);
  selectedConnRef.current = selectedConnectorId;
  const pendingConnRef = useRef(pendingConnectorId);
  pendingConnRef.current = pendingConnectorId;

  const [cameraMode, setCameraMode] = useState<CameraMode>("isometric");
  const [renderOptions, setRenderOptions] = useState<RenderOptionsState>(
    DEFAULT_RENDER_OPTIONS,
  );
  const [displayOverrides, setDisplayOverrides] =
    useState<DisplayOverridesState>(DEFAULT_DISPLAY_OVERRIDES);
  const [viewDirection, setViewDirection] = useState(
    () => new Vector3(1, 1, 1).normalize(),
  );
  const [fps, setFps] = useState(0);
  const [hoverConnector, setHoverConnector] = useState<string | null>(null);
  const [inferenceLabel, setInferenceLabel] = useState<string | null>(null);

  const renderOptionsRef = useRef(renderOptions);
  renderOptionsRef.current = renderOptions;
  const displayRef = useRef(displayOverrides);
  displayRef.current = displayOverrides;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;
  const hoverRef = useRef(hoverConnector);
  hoverRef.current = hoverConnector;
  const mateToolRef = useRef(mateToolActive);
  mateToolRef.current = mateToolActive;
  const snapModeRef = useRef(snapMode);
  snapModeRef.current = snapMode;

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new Scene();

    const perspective = new PerspectiveCamera(45, 1, 0.01, 5000);
    perspective.position.set(4, 3.5, 4);
    const orthographic = new OrthographicCamera(-2, 2, 2, -2, 0.01, 5000);
    orthographic.position.copy(perspective.position);

    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      display: "block",
      width: "100%",
      height: "100%",
      outline: "none",
    });
    renderer.domElement.tabIndex = 0;

    let active: ActiveCamera = orthographic;
    const controls = new OnshapeControls(orthographic, renderer.domElement);
    controls.target.set(0, 0.4, 0);

    const ambient = new AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const key = new DirectionalLight(0xffffff, 1.05);
    key.position.set(5, 8, 4);
    scene.add(key);
    const fill = new DirectionalLight(0xb0c4de, 0.35);
    fill.position.set(-4, 2, -3);
    scene.add(fill);
    const grid = createThemedGrid(resolvedThemeRef.current);
    scene.add(grid);
    const references = new ReferenceGeometry();
    scene.add(references.root);
    const inference = new InferenceEngine();
    scene.add(inference.overlay);
    applyViewportSceneTheme(
      scene,
      resolvedThemeRef.current,
      { ambient, key, fill },
      grid,
    );

    const instanceRoot = new Group();
    instanceRoot.name = "instanceRoot";
    scene.add(instanceRoot);

    const connectorRoot = new Group();
    connectorRoot.name = "connectorRoot";
    scene.add(connectorRoot);

    const mateGeo = new BufferGeometry();
    mateGeo.setAttribute("position", new Float32BufferAttribute(new Float32Array(6), 3));
    const mateLine = new LineSegments(
      mateGeo,
      new LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 }),
    );
    mateLine.frustumCulled = false;
    scene.add(mateLine);

    const raycaster = new Raycaster();
    raycaster.params.Points = { threshold: 0.08 };
    const ndc = new Vector2();

    const setActiveCamera = (cam: ActiveCamera) => {
      cam.position.copy(active.position);
      cam.quaternion.copy(active.quaternion);
      cam.up.copy(active.up);
      active = cam;
      controls.setCamera(cam);
      controls.syncSphericalFromCamera();
      controls.update();
      if (apiRef.current) apiRef.current.active = cam;
    };

    const fit = () => {
      controls.fitToSphere(new Vector3(0, 0.4, 0), 2.4, 1.45);
    };

    const aimDirection = (dir: Vector3, useOrtho: boolean) => {
      const radius = Math.max(controls.target.distanceTo(active.position), 2);
      const next = useOrtho ? orthographic : perspective;
      if (next !== active) setActiveCamera(next);
      active.position.copy(controls.target).addScaledVector(dir, radius);
      active.up.set(0, 1, 0);
      if (Math.abs(dir.dot(active.up)) > 0.99) {
        active.up.set(0, 0, dir.y > 0 ? -1 : 1);
      }
      active.lookAt(controls.target);
      controls.syncSphericalFromCamera();
      controls.update();
    };

    const rebuild = () => {
      while (instanceRoot.children.length > 0) {
        const child = instanceRoot.children[0];
        instanceRoot.remove(child);
        disposeObject(child);
      }
      while (connectorRoot.children.length > 0) {
        const child = connectorRoot.children[0];
        connectorRoot.remove(child);
        disposeObject(child);
      }

      for (const inst of instancesRef.current) {
        const group = buildInstanceGroup(inst);
        instanceRoot.add(group);
      }
      for (const conn of connectorsRef.current) {
        connectorRoot.add(buildConnectorGizmo(conn));
      }
    };

    rebuild();
    aimDirection(AXONOMETRIC.isometric.dir.clone(), true);
    fit();

    apiRef.current = {
      perspective,
      orthographic,
      active,
      controls,
      scene,
      instanceRoot,
      connectorRoot,
      mateLine,
      ambient,
      key,
      fill,
      grid,
      setActiveCamera,
      fit,
      aimDirection,
      rebuild,
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      const aspect = w / h;
      perspective.aspect = aspect;
      perspective.updateProjectionMatrix();
      const frustum = 2.6;
      orthographic.left = -frustum * aspect;
      orthographic.right = frustum * aspect;
      orthographic.top = frustum;
      orthographic.bottom = -frustum;
      orthographic.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const hitTest = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, active);
      const connHits = raycaster.intersectObjects(connectorRoot.children, true);
      const conn = connHits.find((h) => h.object.userData.connectorId);
      if (conn && showConnectorsRef.current) {
        return { kind: "connector" as const, id: String(conn.object.userData.connectorId) };
      }
      const instHits = raycaster.intersectObjects(instanceRoot.children, true);
      const inst = instHits.find((h) => h.object.userData.instanceId);
      if (inst) {
        return { kind: "instance" as const, id: String(inst.object.userData.instanceId) };
      }
      return null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      const next = hit?.kind === "connector" ? hit.id : null;
      if (next !== hoverRef.current) setHoverConnector(next);

      const toolOn = mateToolRef.current || snapModeRef.current;
      if (hit?.kind === "connector") {
        inference.clear();
        references.setHoveredPlane(null);
        setInferenceLabel(null);
        renderer.domElement.style.cursor = "pointer";
        return;
      }

      const inf = inference.query({
        clientX: event.clientX,
        clientY: event.clientY,
        canvas: renderer.domElement,
        camera: active,
        targets: defaultReferenceTargets(references.planeWorldSize() / 2),
        planeHalfExtent: references.planeWorldSize() / 2,
      });
      const planeId =
        inf?.target.kind === "plane" ? inf.target.plane?.id ?? null : null;
      references.setHoveredPlane(planeId);
      if (!toolOn) inference.clear();
      const label =
        inf &&
        (toolOn || inf.target.kind === "plane" || inf.target.kind === "origin")
          ? inf.target.label
          : null;
      setInferenceLabel((prev) => (prev === label ? prev : label));
      renderer.domElement.style.cursor = hit || (toolOn && inf) ? "pointer" : "default";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const hit = hitTest(event.clientX, event.clientY);
      if (hit?.kind === "connector") {
        pickConnector(hit.id);
        return;
      }
      if (hit?.kind === "instance") {
        selectInstances([hit.id]);
        return;
      }
      selectInstances([]);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    const onPointerLeave = () => {
      inference.clear();
      references.setHoveredPlane(null);
      setInferenceLabel(null);
    };
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    let raf = 0;
    let frames = 0;
    let lastFps = performance.now();
    let lastPixelRatio = renderer.getPixelRatio();
    const viewDir = new Vector3();
    const matePositions: number[] = [];

    const tick = () => {
      raf = requestAnimationFrame(tick);
      references.updateScale(active, controls.target);
      applyInstanceState(
        instanceRoot,
        connectorRoot,
        instancesRef.current,
        connectorsRef.current,
        explodedRef.current,
        explodeAmountRef.current,
        selectedInstRef.current,
        selectedConnRef.current,
        pendingConnRef.current,
        hoverRef.current,
        showConnectorsRef.current,
        renderOptionsRef.current,
        displayRef.current,
      );

      matePositions.length = 0;
      if (showMatesRef.current) {
        for (const mate of matesRef.current) {
          if (mate.suppressed) continue;
          const a = worldConnectorOrigin(
            mate.instanceAId,
            mate.connectorAId,
            instancesRef.current,
            connectorsRef.current,
            explodedRef.current,
            explodeAmountRef.current,
          );
          const b = worldConnectorOrigin(
            mate.instanceBId,
            mate.connectorBId,
            instancesRef.current,
            connectorsRef.current,
            explodedRef.current,
            explodeAmountRef.current,
          );
          if (a && b) matePositions.push(...a, ...b);
        }
      }
      if (matePositions.length === 0) {
        mateLine.visible = false;
      } else {
        mateLine.visible = true;
        const needed = matePositions.length;
        let attr = mateLine.geometry.getAttribute("position") as
          | Float32BufferAttribute
          | undefined;
        if (!attr || attr.count * 3 < needed) {
          attr = new Float32BufferAttribute(new Float32Array(Math.max(needed, 6)), 3);
          mateLine.geometry.setAttribute("position", attr);
        }
        const arr = attr.array as Float32Array;
        for (let i = 0; i < needed; i++) arr[i] = matePositions[i];
        // Zero unused slots so stale segments do not linger if drawRange shrinks.
        for (let i = needed; i < arr.length; i++) arr[i] = 0;
        attr.needsUpdate = true;
        mateLine.geometry.setDrawRange(0, needed / 3);
        mateLine.geometry.computeBoundingSphere();
      }

      const nextPr = renderOptionsRef.current.highQuality
        ? Math.min(window.devicePixelRatio, 2)
        : 1;
      if (nextPr !== lastPixelRatio) {
        lastPixelRatio = nextPr;
        renderer.setPixelRatio(nextPr);
      }
      renderer.render(scene, active);

      viewDir.copy(active.position).sub(controls.target).normalize();
      frames += 1;
      const now = performance.now();
      if (frames % 8 === 0) {
        setViewDirection((prev) => {
          if (prev.distanceToSquared(viewDir) < 1e-6) return prev;
          return viewDir.clone();
        });
      }
      if (now - lastFps >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastFps)));
        frames = 0;
        lastFps = now;
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      inference.dispose();
      references.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
    // pickConnector / selectInstances are stable zustand actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    applyViewportSceneTheme(
      api.scene,
      resolvedTheme,
      { ambient: api.ambient, key: api.key, fill: api.fill },
      api.grid,
    );
  }, [resolvedTheme]);

  const instanceKey = instances.map((i) => i.id).join("|");
  const connectorKey = connectors.map((c) => c.id).join("|");
  useEffect(() => {
    apiRef.current?.rebuild();
  }, [instanceKey, connectorKey]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    if (cameraMode === "perspective") {
      api.setActiveCamera(api.perspective);
      return;
    }
    const preset = AXONOMETRIC[cameraMode as keyof typeof AXONOMETRIC];
    if (preset) api.aimDirection(preset.dir.clone(), true);
  }, [cameraMode]);

  const onFaceClick = useCallback((face: ViewCubeFace) => {
    const api = apiRef.current;
    if (!api) return;
    if (face === "iso") {
      setCameraMode("isometric");
      return;
    }
    const dir = FACE_DIRS[face].clone();
    const useOrtho = cameraModeRef.current !== "perspective";
    api.aimDirection(dir, useOrtho);
  }, []);

  const onFitView = useCallback(() => {
    apiRef.current?.fit();
  }, []);

  const onDisplayOverride = useCallback((action: DisplayOverride) => {
    setDisplayOverrides((prev) => {
      switch (action) {
        case "section-view":
          return { ...prev, sectionViewEnabled: !prev.sectionViewEnabled };
        default:
          return prev;
      }
    });
  }, []);

  const modeLabel =
    cameraMode === "orient-sketch-plane"
      ? "Sketch Normal"
      : cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      <div ref={canvasHostRef} className="absolute inset-0" />

      <ViewportMenus
        cameraMode={cameraMode}
        renderOptions={renderOptions}
        displayOverrides={displayOverrides}
        onCameraMode={setCameraMode}
        onRenderOptions={setRenderOptions}
        onDisplayOverride={onDisplayOverride}
        onFitView={onFitView}
      />

      <ViewCube viewDirection={viewDirection} onFaceClick={onFaceClick} />

      {hoverConnector && (
        <div className="pointer-events-none absolute left-1/2 top-12 z-20 -translate-x-1/2 border border-accent bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
          Mate connector · {connectors.find((c) => c.id === hoverConnector)?.name ?? hoverConnector}
        </div>
      )}
      {!hoverConnector && inferenceLabel && (
        <div className="pointer-events-none absolute left-1/2 top-12 z-20 -translate-x-1/2 border border-accent bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
          {inferenceLabel}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-border/60 bg-card/90 px-3 py-1 text-[10px] text-muted-foreground">
        <span className="truncate pr-3">{statusMessage}</span>
        <span className="font-mono">
          LMB pick connector · RMB orbit · MMB pan
        </span>
        <span className="font-mono">
          {modeLabel} · {snapMode ? "snap" : "no-snap"}
          {showMatesMode ? " · mates" : ""} · {fps} fps
        </span>
      </div>
    </div>
  );
}

function worldConnectorOrigin(
  instanceId: string,
  connectorId: string,
  instances: AssemblyInstance[],
  connectors: MateConnector[],
  exploded: ExplodedView | null,
  amount: number,
): [number, number, number] | null {
  const inst = instances.find((i) => i.id === instanceId);
  const conn = connectors.find((c) => c.id === connectorId);
  if (!inst || !conn) return null;
  const world = visualWorldTransform(inst, exploded, amount);
  const p = transformPoint(world, mat4ToFrame(conn.local).origin);
  return p;
}

function applyMat4(obj: Object3D, m: Mat4) {
  obj.matrix.fromArray(m);
  obj.matrixAutoUpdate = false;
  obj.matrixWorldNeedsUpdate = true;
}

function applyInstanceState(
  instanceRoot: Group,
  connectorRoot: Group,
  instances: AssemblyInstance[],
  connectors: MateConnector[],
  exploded: Parameters<typeof visualWorldTransform>[1],
  amount: number,
  selectedIds: string[],
  selectedConnectorId: string | null,
  pendingConnectorId: string | null,
  hoverConnectorId: string | null,
  showConnectors: boolean,
  render: RenderOptionsState,
  _display: DisplayOverridesState,
) {
  const byId = new Map(instances.map((i) => [i.id, i]));
  for (const child of instanceRoot.children) {
    const id = String(child.userData.instanceId ?? "");
    const inst = byId.get(id);
    if (!inst) {
      child.visible = false;
      continue;
    }
    child.visible = inst.visible && !inst.suppressed;
    applyMat4(child, visualWorldTransform(inst, exploded, amount));
    const selected = selectedIds.includes(id);
    child.traverse((obj) => {
      const mesh = obj as Mesh;
      const mat = mesh.material as MeshStandardMaterial | undefined;
      if (!mat || !mat.color) return;
      if (mat.userData?.isEdge) return;
      mat.color.set(inst.color);
      mat.opacity = inst.opacity;
      mat.transparent = inst.opacity < 0.99;
      mat.emissive.set(selected ? "#1d4ed8" : "#000000");
      mat.emissiveIntensity = selected ? 0.35 : 0;
      if (render.shading === "unshaded") {
        mat.metalness = 0;
        mat.roughness = 1;
      }
    });
  }

  for (const child of connectorRoot.children) {
    const cid = String(child.userData.connectorId ?? "");
    const conn = connectors.find((c) => c.id === cid);
    const inst = conn ? byId.get(conn.instanceId) : undefined;
    if (!conn || !inst || !inst.visible || inst.suppressed) {
      child.visible = false;
      continue;
    }
    child.visible = showConnectors;
    const world = composeWorld(visualWorldTransform(inst, exploded, amount), conn.local);
    applyMat4(child, world);
    const hot =
      cid === selectedConnectorId || cid === pendingConnectorId || cid === hoverConnectorId;
    child.scale.setScalar(hot ? 1.45 : 1);
    const body = child.getObjectByName("mc-body") as Mesh | undefined;
    if (body) {
      const mat = body.material as MeshStandardMaterial;
      if (cid === pendingConnectorId) mat.color.set("#fbbf24");
      else if (cid === selectedConnectorId) mat.color.set("#e85d04");
      else if (cid === hoverConnectorId) mat.color.set("#e2e8f0");
      else mat.color.set("#f8fafc");
      mat.emissive.set(hot ? "#e85d04" : "#0f172a");
      mat.emissiveIntensity = hot ? 0.6 : 0.15;
    }
  }
}

function buildInstanceGroup(inst: AssemblyInstance): Group {
  const group = new Group();
  group.name = inst.id;
  group.userData.instanceId = inst.id;

  const mat = new MeshStandardMaterial({
    color: new Color(inst.color),
    metalness: 0.28,
    roughness: 0.42,
    side: DoubleSide,
    transparent: inst.opacity < 0.99,
    opacity: inst.opacity,
  });

  let mesh: Mesh;
  if (inst.primitive.kind === "box") {
    const [sx, sy, sz] = inst.primitive.size;
    mesh = new Mesh(new BoxGeometry(sx, sy, sz), mat);
  } else {
    const { radius, height, axis } = inst.primitive;
    mesh = new Mesh(new CylinderGeometry(radius, radius, height, 48), mat);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
  }
  mesh.userData.instanceId = inst.id;
  mesh.castShadow = false;
  group.add(mesh);

  if (inst.primitive.kind === "cylinder") {
    const { radius, height, axis } = inst.primitive;
    const key = new Mesh(
      new BoxGeometry(radius * 0.45, height * 0.28, radius * 0.22),
      mat,
    );
    if (axis === "y") key.position.set(radius, 0, 0);
    else if (axis === "x") key.position.set(0, radius, 0);
    else key.position.set(radius, 0, 0);
    key.userData.instanceId = inst.id;
    group.add(key);
  }

  const edgeMat = new LineBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.85,
  });
  edgeMat.userData.isEdge = true;
  const edges = new LineSegments(new EdgesGeometry(mesh.geometry, 20), edgeMat);
  edges.rotation.copy(mesh.rotation);
  edges.userData.instanceId = inst.id;
  group.add(edges);

  applyMat4(group, inst.worldTransform);
  return group;
}

function buildConnectorGizmo(conn: MateConnector): Group {
  const gizmo = new Group();
  gizmo.name = conn.id;
  gizmo.userData.connectorId = conn.id;

  const body = new Mesh(
    new OctahedronGeometry(0.045, 0),
    new MeshStandardMaterial({
      color: "#f8fafc",
      metalness: 0.1,
      roughness: 0.35,
      emissive: "#0f172a",
      emissiveIntensity: 0.15,
    }),
  );
  body.name = "mc-body";
  body.userData.connectorId = conn.id;
  gizmo.add(body);

  const hit = new Mesh(
    new SphereGeometry(0.09, 12, 8),
    new MeshStandardMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  hit.userData.connectorId = conn.id;
  gizmo.add(hit);

  gizmo.add(axisArrow([1, 0, 0], 0xef4444, conn.id));
  gizmo.add(axisArrow([0, 1, 0], 0x22c55e, conn.id));
  gizmo.add(axisArrow([0, 0, 1], 0x3b82f6, conn.id));

  applyMat4(gizmo, conn.local);
  return gizmo;
}

function axisArrow(dir: [number, number, number], color: number, connectorId: string): Group {
  const group = new Group();
  const len = 0.22;
  const shaft = new Mesh(
    new CylinderGeometry(0.008, 0.008, len, 6),
    new MeshStandardMaterial({ color, roughness: 0.4 }),
  );
  shaft.position.set((dir[0] * len) / 2, (dir[1] * len) / 2, (dir[2] * len) / 2);
  if (dir[0] !== 0) shaft.rotation.z = Math.PI / 2;
  if (dir[2] !== 0) shaft.rotation.x = Math.PI / 2;
  shaft.userData.connectorId = connectorId;
  const head = new Mesh(
    new ConeGeometry(0.02, 0.05, 8),
    new MeshStandardMaterial({ color }),
  );
  head.position.set(dir[0] * len, dir[1] * len, dir[2] * len);
  if (dir[0] !== 0) head.rotation.z = dir[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
  if (dir[2] !== 0) head.rotation.x = dir[2] > 0 ? Math.PI / 2 : -Math.PI / 2;
  head.userData.connectorId = connectorId;
  group.add(shaft, head);
  return group;
}

function disposeObject(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

export default AssemblyViewport;
