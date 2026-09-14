import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AmbientLight,
  DirectionalLight,
  EdgesGeometry,
  GridHelper,
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
import { meshFromBuffers } from "../../cad/meshFromBuffers";
import type { MeshBuffers } from "../../cad/types";
import { useTheme } from "../../providers/ThemeProvider";
import {
  applyViewportSceneTheme,
  createThemedGrid,
} from "../../theme/viewportTheme";
import {
  FormWorkspace,
  type GizmoMode,
} from "../../sculpt/FormWorkspace";
import {
  ArViewportPlaceholder,
  createArViewportBridge,
  type ArViewportBridge,
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
import { ReferenceGeometry } from "./ReferenceGeometry";
import { SketchTool } from "../partstudio/types";
import { useSketchStore } from "../../store/sketchStore";
import {
  InferenceEngine,
  defaultReferenceTargets,
  sketchEntitiesToTargets,
} from "../../utils/inferencing";

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
  scene: Scene;
  modelRoot: Group;
  solidMeshes: Mesh[];
  edgeLines: LineSegments[];
  phantomEdges: LineSegments[];
  sectionPlane: Plane;
  formWorkspace: FormWorkspace | null;
  ambient: AmbientLight;
  key: DirectionalLight;
  fill: DirectionalLight;
  grid: GridHelper;
  setActiveCamera: (cam: ActiveCamera) => void;
  fit: () => void;
  aimDirection: (dir: Vector3, orthographic: boolean) => void;
  applyOcctMesh: (buffers: MeshBuffers) => void;
  enterFormWorkspace: (opts: {
    size: number;
    levels: number;
    cageVertices?: number[];
    onCageChanged?: (flat: number[]) => void;
  }) => void;
  exitFormWorkspace: () => void;
  setFormLevels: (levels: number) => void;
  setFormGizmoMode: (mode: GizmoMode) => void;
}

export interface SculptViewportParams {
  size?: number;
  levels?: number;
  cageVertices?: number[];
  showCage?: boolean;
}

export interface Viewport3DProps {
  className?: string;
  style?: CSSProperties;
  /** Open the AR / Vision Pro scaffold panel on mount. */
  showArPanel?: boolean;
  /** Tessellated B-Rep mesh from the CAD worker (Float32Arrays). */
  occtMesh?: MeshBuffers | null;
  /** When true, activate Fusion-style Form Workspace sculpt session. */
  sculptActive?: boolean;
  sculptParams?: SculptViewportParams | null;
  onSculptCageChanged?: (cageVertices: number[]) => void;
  onSculptLevelsChanged?: (levels: number) => void;
}

/**
 * Enterprise CAD WebGL viewport: Three.js scene, dual cameras,
 * Onshape-style navigation, View Cube, Form Workspace, and render/display menus.
 */
export function Viewport3D({
  className,
  style,
  showArPanel: showArPanelProp,
  occtMesh,
  sculptActive = false,
  sculptParams = null,
  onSculptCageChanged,
  onSculptLevelsChanged,
}: Viewport3DProps) {
  const { resolvedTheme } = useTheme();
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewportApi | null>(null);
  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;
  const onCageChangedRef = useRef(onSculptCageChanged);
  onCageChangedRef.current = onSculptCageChanged;

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
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");
  const [formLevels, setFormLevels] = useState(2);
  const [inferenceLabel, setInferenceLabel] = useState<string | null>(null);

  const sketchActive = useSketchStore((s) => s.active);
  const sketchTool = useSketchStore((s) => s.activeTool);
  const sketchEntities = useSketchStore((s) => s.entities);
  const inferenceActive =
    sketchActive && sketchTool !== SketchTool.Select;
  const inferenceActiveRef = useRef(inferenceActive);
  inferenceActiveRef.current = inferenceActive;
  const sketchEntitiesRef = useRef(sketchEntities);
  sketchEntitiesRef.current = sketchEntities;

  /**
   * The AR bridge owns its own lifecycle. It used to be a `useMemo` disposed by
   * the WebGL scene effect, which both coupled two unrelated lifetimes and made
   * the bridge a dependency of the scene — recreating it would have torn down
   * the GL context. Creating and disposing it in one effect also survives a
   * StrictMode remount, where the memo would have been reused after disposal.
   */
  const [arBridge, setArBridge] = useState<ArViewportBridge | null>(null);

  useEffect(() => {
    const bridge = createArViewportBridge();
    setArBridge(bridge);
    return () => {
      setArBridge(null);
      bridge.dispose();
    };
  }, []);

  const renderOptionsRef = useRef(renderOptions);
  renderOptionsRef.current = renderOptions;
  const displayRef = useRef(displayOverrides);
  displayRef.current = displayOverrides;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  /**
   * Set whenever material-affecting state changes, cleared once the render loop
   * has pushed it to the GPU. `applyMaterials` used to run on every single
   * frame, and it ends with `needsUpdate = true`, which forced Three.js to
   * rebuild every shader program 60 times a second.
   */
  const materialsDirtyRef = useRef(true);

  useEffect(() => {
    materialsDirtyRef.current = true;
  }, [renderOptions, displayOverrides]);

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

    const modelRoot = new Group();
    modelRoot.name = "modelRoot";
    scene.add(modelRoot);

    const solidMeshes: Mesh[] = [];
    const edgeLines: LineSegments[] = [];
    const phantomEdges: LineSegments[] = [];

    const sectionPlane = new Plane(new Vector3(0, 0, -1), 0);
    let formWorkspace: FormWorkspace | null = null;

    const setActiveCamera = (cam: ActiveCamera) => {
      cam.position.copy(active.position);
      cam.quaternion.copy(active.quaternion);
      cam.up.copy(active.up);
      active = cam;
      controls.setCamera(cam);
      controls.syncSphericalFromCamera();
      controls.update();
      formWorkspace?.setCamera(cam);
      if (apiRef.current) apiRef.current.active = cam;
    };

    const fit = () => {
      controls.fitToSphere(
        new Vector3(0, 0.25, 0),
        formWorkspace ? 18 : 1.6,
        1.4,
      );
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

    const clearModelRoot = () => {
      while (modelRoot.children.length > 0) {
        const child = modelRoot.children[0];
        modelRoot.remove(child);
        disposeObject(child);
      }
      solidMeshes.length = 0;
      edgeLines.length = 0;
      phantomEdges.length = 0;
    };

    const applyOcctMesh = (buffers: MeshBuffers) => {
      if (formWorkspace) return;
      clearModelRoot();

      const solid = meshFromBuffers(buffers, { partId: "demo-part" });
      modelRoot.add(solid);
      solidMeshes.push(solid);

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
      const e = new LineSegments(
        new EdgesGeometry(solid.geometry, 20),
        edgeMat,
      );
      e.userData.partId = "demo-part";
      e.userData.edgeKind = "boundary";
      modelRoot.add(e);
      edgeLines.push(e);

      const p = new LineSegments(
        new EdgesGeometry(solid.geometry, 1),
        phantomMat,
      );
      p.userData.partId = "demo-part";
      p.userData.edgeKind = "tangent";
      modelRoot.add(p);
      phantomEdges.push(p);

      setStatusLine(
        `OCCT mesh · ${buffers.triangleCount} tris · ${buffers.vertexCount} verts`,
      );
      // Freshly built materials still carry defaults; let the loop configure them.
      materialsDirtyRef.current = true;
      fit();
    };

    const exitFormWorkspace = () => {
      if (!formWorkspace) return;
      formWorkspace.dispose();
      formWorkspace = null;
      if (apiRef.current) apiRef.current.formWorkspace = null;
      controls.enabled = true;
      setStatusLine("Form Workspace closed");
    };

    const enterFormWorkspace = (opts: {
      size: number;
      levels: number;
      cageVertices?: number[];
      onCageChanged?: (flat: number[]) => void;
    }) => {
      exitFormWorkspace();
      clearModelRoot();
      formWorkspace = new FormWorkspace({
        scene,
        camera: active,
        domElement: renderer.domElement,
        orbitControls: controls,
        size: opts.size,
        levels: opts.levels,
        cageVertices: opts.cageVertices,
        onCageChanged: opts.onCageChanged,
        onStatus: setStatusLine,
      });
      if (apiRef.current) apiRef.current.formWorkspace = formWorkspace;
      controls.target.set(0, 0, 0);
      fit();
    };

    aimDirection(AXONOMETRIC.isometric.dir.clone(), true);
    fit();

    apiRef.current = {
      perspective,
      orthographic,
      active,
      controls,
      scene,
      modelRoot,
      solidMeshes,
      edgeLines,
      phantomEdges,
      sectionPlane,
      formWorkspace,
      ambient,
      key,
      fill,
      grid,
      setActiveCamera,
      fit,
      aimDirection,
      applyOcctMesh,
      enterFormWorkspace,
      exitFormWorkspace,
      setFormLevels: (levels: number) => formWorkspace?.setLevels(levels),
      setFormGizmoMode: (mode: GizmoMode) => formWorkspace?.setGizmoMode(mode),
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      const aspect = w / h;
      perspective.aspect = aspect;
      perspective.updateProjectionMatrix();
      const frustum = formWorkspace ? 14 : 2.2;
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
    let lastPixelRatio = renderer.getPixelRatio();
    const viewDir = new Vector3();

    const applyInference = (clientX: number, clientY: number) => {
      const canvas = renderer.domElement;
      const toolOn = inferenceActiveRef.current;
      const targets = defaultReferenceTargets(references.planeWorldSize() / 2);
      if (toolOn) {
        targets.push(...sketchEntitiesToTargets(sketchEntitiesRef.current));
      }
      const hit = inference.query({
        clientX,
        clientY,
        canvas,
        camera: active,
        targets,
        planeHalfExtent: references.planeWorldSize() / 2,
      });
      const planeId =
        hit?.target.kind === "plane" ? hit.target.plane?.id ?? null : null;
      references.setHoveredPlane(planeId);
      if (!toolOn) inference.clear();
      const label =
        hit && (toolOn || hit.target.kind === "plane" || hit.target.kind === "origin")
          ? hit.target.label
          : null;
      setInferenceLabel((prev) => (prev === label ? prev : label));
      canvas.style.cursor = hit && toolOn ? "crosshair" : "";
    };

    const onPointerMove = (event: PointerEvent) => {
      applyInference(event.clientX, event.clientY);
    };
    const onPointerLeave = () => {
      inference.clear();
      references.setHoveredPlane(null);
      setInferenceLabel(null);
      renderer.domElement.style.cursor = "";
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      references.updateScale(active, controls.target);
      // Materials only change on user input, not per frame.
      if (materialsDirtyRef.current) {
        materialsDirtyRef.current = false;
        applyMaterials(
          solidMeshes,
          edgeLines,
          phantomEdges,
          renderOptionsRef.current,
          displayRef.current,
          sectionPlane,
        );
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

    setStatusLine("WebGL ready · Onshape navigation");

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      exitFormWorkspace();
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

  useEffect(() => {
    if (!occtMesh || sculptActive) return;
    apiRef.current?.applyOcctMesh(occtMesh);
  }, [occtMesh, sculptActive]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    if (sculptActive) {
      const size = Number(sculptParams?.size) || 20;
      const levels = Number(sculptParams?.levels) || 2;
      setFormLevels(levels);
      api.enterFormWorkspace({
        size,
        levels,
        cageVertices: sculptParams?.cageVertices,
        onCageChanged: (flat) => onCageChangedRef.current?.(flat),
      });
      api.setFormGizmoMode(gizmoMode);
      return () => {
        api.exitFormWorkspace();
      };
    }

    api.exitFormWorkspace();
    return undefined;
    // Intentionally omit cageVertices — live edits update FormWorkspace in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sculptActive, sculptParams?.size]);

  useEffect(() => {
    if (!sculptActive) return;
    const levels = Number(sculptParams?.levels) || 2;
    setFormLevels(levels);
    apiRef.current?.setFormLevels(levels);
  }, [sculptActive, sculptParams?.levels]);

  useEffect(() => {
    if (!sculptActive) return;
    apiRef.current?.setFormGizmoMode(gizmoMode);
  }, [sculptActive, gizmoMode]);

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

  const onFormLevelClick = useCallback(
    (levels: number) => {
      setFormLevels(levels);
      apiRef.current?.setFormLevels(levels);
      onSculptLevelsChanged?.(levels);
    },
    [onSculptLevelsChanged],
  );

  const modeLabel =
    cameraMode === "orient-sketch-plane"
      ? "Sketch Normal"
      : cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1);

  return (
    <div
      className={`relative h-full min-h-0 w-full overflow-hidden bg-background ${className ?? ""}`}
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

      {inferenceLabel && (
        <div className="pointer-events-none absolute left-1/2 top-12 z-20 -translate-x-1/2 border border-accent bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
          {inferenceLabel}
        </div>
      )}

      {sculptActive && (
        <div className="pointer-events-auto absolute left-3 top-14 z-20 flex flex-col gap-2 rounded border border-border bg-card/95 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">
            Form Workspace
          </div>
          <div className="flex gap-1">
            {(
              [
                ["translate", "Move", "W"],
                ["rotate", "Rotate", "E"],
                ["scale", "Scale", "R"],
              ] as const
            ).map(([mode, label, key]) => (
              <button
                key={mode}
                type="button"
                title={`${label} (${key})`}
                onClick={() => setGizmoMode(mode)}
                className={`rounded px-2 py-1 text-[11px] ${
                  gizmoMode === mode
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Subdiv</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onFormLevelClick(level)}
                className={`h-6 w-6 rounded text-[11px] ${
                  formLevels === level
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-accent"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="max-w-[200px] text-[10px] leading-snug text-faint">
            Click amber vertices, cyan edges, or face centers. Drag the
            gizmo to edit the cage — smooth mesh updates live.
          </p>
        </div>
      )}

      <div className="pointer-events-auto absolute right-3 top-3 z-20">
        <button
          type="button"
          onClick={() => setArPanelOpen((v) => !v)}
          className={`rounded border px-2.5 py-1 text-[11px] font-medium ${
            arPanelOpen
              ? "border-accent bg-active text-accent"
              : "border-border bg-card/90 text-muted-foreground hover:text-accent"
          }`}
          title="AR / Vision Pro (not implemented)"
        >
          AR (stub)
        </button>
      </div>

      {arPanelOpen && arBridge && (
        <ArViewportPlaceholder
          bridge={arBridge}
          onClose={() => setArPanelOpen(false)}
        />
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-border/60 bg-card/90 px-3 py-1 text-[10px] text-muted-foreground">
        <span>{statusLine}</span>
        <span className="font-mono">
          {sculptActive
            ? "LMB select cage · W/E/R gizmo · RMB orbit"
            : "RMB orbit · MMB pan · wheel zoom-to-cursor · pinch"}
        </span>
        <span className="font-mono">
          {sculptActive ? "Form" : modeLabel} · {renderOptions.shading}
          {displayOverrides.sectionViewEnabled ? " · section" : ""} · {fps} fps
        </span>
      </div>
    </div>
  );
}

/** Scratch normal for the section plane; avoids allocating on every update. */
const SECTION_NORMAL = new Vector3();

/**
 * Stable clipping-plane arrays.
 *
 * Three.js keys its shader program cache partly on the number of clipping
 * planes, and assigning a freshly allocated array each time defeated reuse.
 * Reusing these two arrays keeps the identity and the length stable.
 */
const NO_PLANES: Plane[] = [];
const ONE_PLANE: Plane[] = [];

/**
 * Push render/display state onto the live materials.
 *
 * Only called when something actually changed — see `materialsDirtyRef`.
 * `needsUpdate` is set only for properties that alter the compiled program
 * (transparency and clipping-plane count); colours, opacity, metalness and
 * roughness are plain uniforms and never need a recompile.
 */
function applyMaterials(
  solids: Mesh[],
  edges: LineSegments[],
  phantom: LineSegments[],
  render: RenderOptionsState,
  display: DisplayOverridesState,
  sectionPlane: Plane,
) {
  SECTION_NORMAL.set(
    display.sectionPlane.a || 0,
    display.sectionPlane.b || 0,
    display.sectionPlane.c || 1,
  );
  // A zero vector would normalize to NaN and clip the whole scene away.
  if (SECTION_NORMAL.lengthSq() < 1e-12) SECTION_NORMAL.set(0, 0, 1);
  sectionPlane.set(SECTION_NORMAL.normalize(), display.sectionPlane.d);

  let planes: Plane[];
  if (display.sectionViewEnabled) {
    ONE_PLANE[0] = sectionPlane;
    ONE_PLANE.length = 1;
    planes = ONE_PLANE;
  } else {
    planes = NO_PLANES;
  }

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
      mat.color.set("#8b949e");
      mat.metalness = 0.25;
      mat.roughness = 0.45;
      mat.emissive.set("#000000");
      mat.emissiveIntensity = 0;
    }

    const programChanged =
      mat.transparent !== forceTransparent ||
      (mat.clippingPlanes?.length ?? 0) !== planes.length;

    mat.transparent = forceTransparent;
    mat.opacity = forceTransparent ? 0.35 : 1;
    mat.depthWrite = !forceTransparent;
    mat.clippingPlanes = planes;
    mat.clipShadows = display.sectionViewEnabled;
    if (programChanged) mat.needsUpdate = true;
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
    mat.color.set(render.highlightBoundaryEdges ? 0xe85d04 : 0x0f172a);
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
