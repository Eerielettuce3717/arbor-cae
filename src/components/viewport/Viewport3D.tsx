import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Scene,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import {
  ArViewportPlaceholder,
  createArViewportBridge,
} from "./ar/ArViewportScaffold";
import {
  OnshapeControls,
  type ActiveCamera,
} from "./controls/OnshapeControls";
import {
  DEFAULT_DISPLAY_OVERRIDES,
  DEFAULT_RENDER_OPTIONS,
  DEFAULT_SKETCH_PLANE,
  type CameraMode,
  type DisplayOverride,
  type DisplayOverridesState,
  type RenderOptionsState,
} from "./types";
import { ViewCube, type ViewCubeFace } from "./ViewCube";
import { ViewportMenus } from "./ViewportMenus";

const AXONOMETRIC: Record<
  "isometric" | "dimetric" | "trimetric",
  { dir: Vector3; label: string }
> = {
  isometric: { dir: new Vector3(1, 1, 1).normalize(), label: "Isometric" },
  dimetric: { dir: new Vector3(1, 0.5, 1).normalize(), label: "Dimetric" },
  trimetric: {
    dir: new Vector3(1.2, 0.75, 0.55).normalize(),
    label: "Trimetric",
  },
};

const FACE_DIRS: Record<Exclude<ViewCubeFace, "iso">, Vector3> = {
  front: new Vector3(0, 0, 1),
  back: new Vector3(0, 0, -1),
  right: new Vector3(1, 0, 0),
  left: new Vector3(-1, 0, 0),
  top: new Vector3(0, 1, 0),
  bottom: new Vector3(0, -1, 0),
};

interface ViewportApi {
  perspective: PerspectiveCamera;
  orthographic: OrthographicCamera;
  active: ActiveCamera;
  controls: OnshapeControls;
  solidMeshes: Mesh[];
  edgeLines: LineSegments[];
  phantomEdges: LineSegments[];
  sectionPlane: Plane;
  setActiveCamera: (cam: ActiveCamera) => void;
  fit: () => void;
  aimDirection: (dir: Vector3, orthographic: boolean) => void;
}

export interface Viewport3DProps {
  className?: string;
  style?: CSSProperties;
  /** Open the AR / Vision Pro scaffold panel on mount. */
  showArPanel?: boolean;
}

/**
 * Enterprise CAD WebGL viewport: Three.js scene, dual cameras,
 * Onshape-style navigation, View Cube, and render/display menus.
 */
export function Viewport3D({
  className,
  style,
  showArPanel: showArPanelProp,
}: Viewport3DProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewportApi | null>(null);

  const [cameraMode, setCameraMode] = useState<CameraMode>("isometric");
  const [renderOptions, setRenderOptions] = useState<RenderOptionsState>(
    DEFAULT_RENDER_OPTIONS,
  );
  const [displayOverrides, setDisplayOverrides] =
    useState<DisplayOverridesState>(DEFAULT_DISPLAY_OVERRIDES);
  const [viewDirection, setViewDirection] = useState(
    () => new Vector3(1, 1, 1).normalize(),
  );
  const [statusLine, setStatusLine] = useState("Ready");
  const [fps, setFps] = useState(0);
  const [arPanelOpen, setArPanelOpen] = useState(showArPanelProp ?? false);

  const arBridge = useMemo(() => createArViewportBridge(), []);

  const renderOptionsRef = useRef(renderOptions);
  renderOptionsRef.current = renderOptions;
  const displayRef = useRef(displayOverrides);
  displayRef.current = displayOverrides;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new Scene();
    scene.background = new Color("#0b1220");

    const perspective = new PerspectiveCamera(45, 1, 0.01, 5000);
    perspective.position.set(4, 3.5, 4);

    const orthographic = new OrthographicCamera(-2, 2, 2, -2, 0.01, 5000);
    orthographic.position.copy(perspective.position);

    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
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
    controls.target.set(0, 0.25, 0);

    scene.add(new AmbientLight(0xffffff, 0.55));
    const key = new DirectionalLight(0xffffff, 1.05);
    key.position.set(5, 8, 4);
    scene.add(key);
    const fill = new DirectionalLight(0xb0c4de, 0.35);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    scene.add(createGroundGrid());

    const modelRoot = new Group();
    modelRoot.name = "modelRoot";
    scene.add(modelRoot);

    const { solids, edges, phantom } = createDemoPart();
    const solidMeshes: Mesh[] = [];
    const edgeLines: LineSegments[] = [];
    const phantomEdges: LineSegments[] = [];
    for (const mesh of solids) {
      modelRoot.add(mesh);
      solidMeshes.push(mesh);
    }
    for (const line of edges) {
      modelRoot.add(line);
      edgeLines.push(line);
    }
    for (const line of phantom) {
      modelRoot.add(line);
      phantomEdges.push(line);
    }

    const sectionPlane = new Plane(new Vector3(0, 0, -1), 0);

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
      controls.fitToSphere(new Vector3(0, 0.25, 0), 1.6, 1.4);
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

    aimDirection(AXONOMETRIC.isometric.dir.clone(), true);
    fit();

    apiRef.current = {
      perspective,
      orthographic,
      active,
      controls,
      solidMeshes,
      edgeLines,
      phantomEdges,
      sectionPlane,
      setActiveCamera,
      fit,
      aimDirection,
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      const aspect = w / h;
      perspective.aspect = aspect;
      perspective.updateProjectionMatrix();
      const frustum = 2.2;
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

    let raf = 0;
    let frames = 0;
    let lastFps = performance.now();
    const viewDir = new Vector3();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      applyMaterials(
        solidMeshes,
        edgeLines,
        phantomEdges,
        renderOptionsRef.current,
        displayRef.current,
        sectionPlane,
      );
      renderer.setPixelRatio(
        renderOptionsRef.current.highQuality
          ? Math.min(window.devicePixelRatio, 2)
          : 1,
      );
      renderer.render(scene, active);

      viewDir.copy(active.position).sub(controls.target).normalize();
      setViewDirection((prev) => {
        if (prev.distanceToSquared(viewDir) < 1e-6) return prev;
        return viewDir.clone();
      });

      frames += 1;
      const now = performance.now();
      if (now - lastFps >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastFps)));
        frames = 0;
        lastFps = now;
      }
    };
    tick();

    setStatusLine("WebGL ready · Onshape navigation");

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      arBridge.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
  }, [arBridge]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    if (cameraMode === "perspective") {
      api.setActiveCamera(api.perspective);
      setStatusLine("Perspective");
      return;
    }

    if (cameraMode === "orient-sketch-plane") {
      const origin = new Vector3(
        DEFAULT_SKETCH_PLANE.origin.x,
        DEFAULT_SKETCH_PLANE.origin.y,
        DEFAULT_SKETCH_PLANE.origin.z,
      );
      const normal = new Vector3(
        DEFAULT_SKETCH_PLANE.normal.x,
        DEFAULT_SKETCH_PLANE.normal.y,
        DEFAULT_SKETCH_PLANE.normal.z,
      );
      const up = new Vector3(
        DEFAULT_SKETCH_PLANE.up.x,
        DEFAULT_SKETCH_PLANE.up.y,
        DEFAULT_SKETCH_PLANE.up.z,
      );
      api.setActiveCamera(api.orthographic);
      api.controls.orientToPlane(origin, normal, up);
      setStatusLine("Orient Normal to Sketch Plane");
      return;
    }

    const preset = AXONOMETRIC[cameraMode];
    if (preset) {
      api.aimDirection(preset.dir.clone(), true);
      setStatusLine(preset.label);
    }
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
    setStatusLine(`View · ${face}`);
  }, []);

  const onFitView = useCallback(() => {
    apiRef.current?.fit();
    setStatusLine("Fit to model");
  }, []);

  const onDisplayOverride = useCallback((action: DisplayOverride) => {
    setDisplayOverrides((prev) => {
      switch (action) {
        case "hide-show": {
          const id = "demo-part";
          const hidden = prev.hiddenIds.includes(id);
          return {
            ...prev,
            hiddenIds: hidden
              ? prev.hiddenIds.filter((x) => x !== id)
              : [...prev.hiddenIds, id],
            isolatedIds: null,
          };
        }
        case "isolate": {
          if (prev.isolatedIds) return { ...prev, isolatedIds: null };
          return { ...prev, isolatedIds: ["demo-part"], hiddenIds: [] };
        }
        case "make-transparent": {
          const id = "demo-part";
          const on = prev.transparentIds.includes(id);
          return {
            ...prev,
            transparentIds: on
              ? prev.transparentIds.filter((x) => x !== id)
              : [...prev.transparentIds, id],
          };
        }
        case "section-view":
          return {
            ...prev,
            sectionViewEnabled: !prev.sectionViewEnabled,
          };
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
    <div
      className={`relative h-full min-h-0 w-full overflow-hidden bg-[#0b1220] ${className ?? ""}`}
      style={style}
    >
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

      <div className="pointer-events-auto absolute right-3 top-3 z-20">
        <button
          type="button"
          onClick={() => setArPanelOpen((v) => !v)}
          className={`rounded border px-2.5 py-1 text-[11px] font-medium ${
            arPanelOpen
              ? "border-sky-600 bg-eng-active text-sky-300"
              : "border-eng-border bg-eng-panel/90 text-eng-muted hover:text-eng-text"
          }`}
          title="Augmented Reality / Apple Vision Pro"
        >
          AR / Vision Pro
        </button>
      </div>

      {arPanelOpen && (
        <ArViewportPlaceholder
          bridge={arBridge}
          onClose={() => setArPanelOpen(false)}
        />
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-eng-border/60 bg-eng-panel/90 px-3 py-1 text-[10px] text-eng-muted">
        <span>{statusLine}</span>
        <span className="font-mono">
          RMB orbit · MMB pan · wheel zoom-to-cursor · pinch
        </span>
        <span className="font-mono">
          {modeLabel} · {renderOptions.shading}
          {displayOverrides.sectionViewEnabled ? " · section" : ""} · {fps} fps
        </span>
      </div>
    </div>
  );
}

function createDemoPart(): {
  solids: Mesh[];
  edges: LineSegments[];
  phantom: LineSegments[];
} {
  const bodyMat = new MeshStandardMaterial({
    color: new Color("#5b8def"),
    metalness: 0.25,
    roughness: 0.45,
    side: DoubleSide,
  });

  const body = new Mesh(new BoxGeometry(2, 0.35, 1.2), bodyMat);
  body.position.set(0, 0.175, 0);
  body.name = "demo-part";
  body.userData.partId = "demo-part";

  const boss = new Mesh(new CylinderGeometry(0.28, 0.28, 0.55, 48), bodyMat);
  boss.position.set(-0.55, 0.45, 0);
  boss.name = "demo-boss";
  boss.userData.partId = "demo-part";

  const solids = [body, boss];

  const edgeMat = new LineBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.9,
  });
  const phantomMat = new LineBasicMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.45,
  });

  const edges: LineSegments[] = [];
  const phantom: LineSegments[] = [];

  for (const mesh of solids) {
    const e = new LineSegments(new EdgesGeometry(mesh.geometry, 20), edgeMat);
    e.position.copy(mesh.position);
    e.rotation.copy(mesh.rotation);
    e.scale.copy(mesh.scale);
    e.userData.partId = "demo-part";
    e.userData.edgeKind = "boundary";
    edges.push(e);

    const p = new LineSegments(new EdgesGeometry(mesh.geometry, 1), phantomMat);
    p.position.copy(mesh.position);
    p.rotation.copy(mesh.rotation);
    p.scale.copy(mesh.scale);
    p.userData.partId = "demo-part";
    p.userData.edgeKind = "tangent";
    phantom.push(p);
  }

  return { solids, edges, phantom };
}

function createGroundGrid(): LineSegments {
  const positions: number[] = [];
  const size = 8;
  const step = 0.5;
  for (let i = -size; i <= size; i += step) {
    positions.push(-size, 0, i, size, 0, i);
    positions.push(i, 0, -size, i, 0, size);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const mat = new LineBasicMaterial({
    color: 0x1e293b,
    transparent: true,
    opacity: 0.7,
  });
  const lines = new LineSegments(geo, mat);
  lines.name = "groundGrid";
  return lines;
}

function applyMaterials(
  solids: Mesh[],
  edges: LineSegments[],
  phantom: LineSegments[],
  render: RenderOptionsState,
  display: DisplayOverridesState,
  sectionPlane: Plane,
) {
  sectionPlane.set(
    new Vector3(
      display.sectionPlane.a || 0,
      display.sectionPlane.b || 0,
      display.sectionPlane.c || 1,
    ).normalize(),
    display.sectionPlane.d,
  );
  const planes = display.sectionViewEnabled ? [sectionPlane] : [];

  for (const mesh of solids) {
    const id = String(mesh.userData.partId ?? mesh.name);
    const hidden =
      display.hiddenIds.includes(id) ||
      (display.isolatedIds !== null && !display.isolatedIds.includes(id));
    mesh.visible = !hidden;

    const mat = mesh.material as MeshStandardMaterial;
    const forceTransparent =
      display.transparentIds.includes(id) || render.shading === "translucent";

    if (render.shading === "unshaded") {
      mat.color.set("#94a3b8");
      mat.metalness = 0;
      mat.roughness = 1;
      mat.emissive.set("#334155");
      mat.emissiveIntensity = 0.15;
    } else {
      mat.color.set("#5b8def");
      mat.metalness = 0.25;
      mat.roughness = 0.45;
      mat.emissive.set("#000000");
      mat.emissiveIntensity = 0;
    }

    mat.transparent = forceTransparent;
    mat.opacity = forceTransparent ? 0.35 : 1;
    mat.depthWrite = !forceTransparent;
    mat.clippingPlanes = planes;
    mat.clipShadows = display.sectionViewEnabled;
    mat.needsUpdate = true;
  }

  const showBoundary = render.hiddenEdges === "visible";
  for (const line of edges) {
    const id = String(line.userData.partId ?? "");
    const hidden =
      display.hiddenIds.includes(id) ||
      (display.isolatedIds !== null && !display.isolatedIds.includes(id));
    line.visible =
      !hidden &&
      (showBoundary || render.highlightBoundaryEdges) &&
      render.hiddenEdges !== "removed";
    const mat = line.material as LineBasicMaterial;
    mat.color.set(render.highlightBoundaryEdges ? 0x0ea5e9 : 0x0f172a);
    mat.clippingPlanes = planes;
  }

  for (const line of phantom) {
    const id = String(line.userData.partId ?? "");
    const hidden =
      display.hiddenIds.includes(id) ||
      (display.isolatedIds !== null && !display.isolatedIds.includes(id));
    const mode = render.tangentEdges;
    line.visible = !hidden && mode !== "removed";
    const mat = line.material as LineBasicMaterial;
    if (mode === "phantom") {
      mat.opacity = 0.35;
      mat.color.set(0x64748b);
    } else {
      mat.opacity = 0.85;
      mat.color.set(0x334155);
    }
    mat.clippingPlanes = planes;
  }
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

export default Viewport3D;
