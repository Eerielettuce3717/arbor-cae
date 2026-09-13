import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { useCamStore } from "../../store/camStore";
import type { FlatFaceId, SetupNode, Toolpath } from "../../store/camTypes";
import {
  OnshapeControls,
  type ActiveCamera,
} from "../viewport/controls/OnshapeControls";
import { ViewCube, type ViewCubeFace } from "../viewport/ViewCube";
import { useTheme } from "../../providers/ThemeProvider";
import {
  applyViewportSceneTheme,
  createThemedGrid,
} from "../../theme/viewportTheme";

const FACE_DIRS: Record<Exclude<ViewCubeFace, "iso">, Vector3> = {
  front: new Vector3(0, 0, 1),
  back: new Vector3(0, 0, -1),
  right: new Vector3(1, 0, 0),
  left: new Vector3(-1, 0, 0),
  top: new Vector3(0, 1, 0),
  bottom: new Vector3(0, -1, 0),
};

/** Scene units: 1 unit = 1 mm (stock ~100 mm). */
const SCALE = 1;

interface CamViewportApi {
  perspective: PerspectiveCamera;
  orthographic: OrthographicCamera;
  active: ActiveCamera;
  controls: OnshapeControls;
  scene: Scene;
  stockRoot: Group;
  toolpathRoot: Group;
  wcsRoot: Group;
  ambient: AmbientLight;
  key: DirectionalLight;
  fill: DirectionalLight;
  grid: GridHelper;
  setActiveCamera: (cam: ActiveCamera) => void;
  fit: () => void;
  aimDirection: (dir: Vector3, orthographic: boolean) => void;
  rebuild: () => void;
}

/**
 * CAM 3D viewport: stock bounding box, selectable faces, WCS triad, toolpaths.
 */
export function CamViewport() {
  const { resolvedTheme } = useTheme();
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<CamViewportApi | null>(null);
  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;

  const setups = useCamStore((s) => s.setups);
  const activeSetupId = useCamStore((s) => s.activeSetupId);
  const toolpaths = useCamStore((s) => s.toolpaths);
  const selectedFaceId = useCamStore((s) => s.selectedFaceId);
  const activeCamTool = useCamStore((s) => s.activeCamTool);
  const selectFace = useCamStore((s) => s.selectFace);
  const statusMessage = useCamStore((s) => s.statusMessage);

  const setup = setups.find((s) => s.id === activeSetupId) ?? setups[0];

  const setupRef = useRef(setup);
  setupRef.current = setup;
  const toolpathsRef = useRef(toolpaths);
  toolpathsRef.current = toolpaths;
  const selectedFaceRef = useRef(selectedFaceId);
  selectedFaceRef.current = selectedFaceId;
  const faceSelectRef = useRef(activeCamTool === "faceSelect" || activeCamTool === "pocket");
  faceSelectRef.current =
    activeCamTool === "faceSelect" || activeCamTool === "pocket";

  const [fps, setFps] = useState(0);
  const [viewDirection, setViewDirection] = useState(
    () => new Vector3(1, 0.8, 1).normalize(),
  );

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new Scene();

    const perspective = new PerspectiveCamera(45, 1, 0.1, 5000);
    perspective.position.set(160, 120, 160);
    const orthographic = new OrthographicCamera(-80, 80, 80, -80, 0.1, 5000);
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
    controls.target.set(50, 10, 30);

    const ambient = new AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const key = new DirectionalLight(0xffffff, 1.05);
    key.position.set(80, 120, 60);
    scene.add(key);
    const fill = new DirectionalLight(0xb0c4de, 0.35);
    fill.position.set(-60, 40, -40);
    scene.add(fill);
    const grid = createThemedGrid(resolvedThemeRef.current, 400, 40);
    scene.add(grid);
    applyViewportSceneTheme(
      scene,
      resolvedThemeRef.current,
      { ambient, key, fill },
      grid,
    );

    const stockRoot = new Group();
    stockRoot.name = "stockRoot";
    scene.add(stockRoot);

    const toolpathRoot = new Group();
    toolpathRoot.name = "toolpathRoot";
    scene.add(toolpathRoot);

    const wcsRoot = new Group();
    wcsRoot.name = "wcsRoot";
    scene.add(wcsRoot);

    const raycaster = new Raycaster();
    const pointer = new Vector2();

    function setActiveCamera(cam: ActiveCamera) {
      const prev = active;
      active = cam;
      controls.setCamera(cam);
      cam.position.copy(prev.position);
      cam.quaternion.copy(prev.quaternion);
      cam.up.copy(prev.up);
      controls.target.copy(controls.target);
      controls.update();
    }

    function fit() {
      const boxSize = setupRef.current?.stock.size ?? [100, 60, 20];
      const maxDim = Math.max(...boxSize) * SCALE;
      const dist = maxDim * 2.2;
      const dir = new Vector3(1, 0.8, 1).normalize();
      const c = stockCenter(setupRef.current);
      controls.target.copy(c);
      active.position.copy(c.clone().add(dir.multiplyScalar(dist)));
      if (active === orthographic) {
        const half = maxDim * 0.9;
        orthographic.left = -half;
        orthographic.right = half;
        orthographic.top = half;
        orthographic.bottom = -half;
        orthographic.updateProjectionMatrix();
      }
      controls.update();
    }

    function aimDirection(dir: Vector3, useOrtho: boolean) {
      if (useOrtho && active !== orthographic) setActiveCamera(orthographic);
      if (!useOrtho && active !== perspective) setActiveCamera(perspective);
      const c = stockCenter(setupRef.current);
      const dist = active.position.distanceTo(controls.target) || 200;
      controls.target.copy(c);
      active.position.copy(c.clone().add(dir.clone().normalize().multiplyScalar(dist)));
      controls.update();
    }

    function rebuild() {
      clearGroup(stockRoot);
      clearGroup(toolpathRoot);
      clearGroup(wcsRoot);
      const s = setupRef.current;
      if (!s) return;
      buildStock(stockRoot, s, selectedFaceRef.current);
      buildWcs(wcsRoot, s);
      for (const tp of toolpathsRef.current) {
        if (tp.visible) buildToolpath(toolpathRoot, tp, s);
      }
    }

    const api: CamViewportApi = {
      perspective,
      orthographic,
      get active() {
        return active;
      },
      controls,
      scene,
      stockRoot,
      toolpathRoot,
      wcsRoot,
      ambient,
      key,
      fill,
      grid,
      setActiveCamera,
      fit,
      aimDirection,
      rebuild,
    };
    apiRef.current = api;

    rebuild();
    fit();

    const onPointer = (e: PointerEvent) => {
      if (!faceSelectRef.current) return;
      if (e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, active);
      const hits = raycaster.intersectObjects(stockRoot.children, true);
      for (const hit of hits) {
        let obj: Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.faceId) {
            selectFace(obj.userData.faceId as FlatFaceId);
            return;
          }
          obj = obj.parent;
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointer);

    let frame = 0;
    let lastT = performance.now();
    let frames = 0;
    let raf = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      controls.update();
      const dir = active.position.clone().sub(controls.target).normalize();
      if (frame % 8 === 0) setViewDirection(dir.clone());
      renderer.render(scene, active);
      frames += 1;
      if (t - lastT > 500) {
        setFps(Math.round((frames * 1000) / (t - lastT)));
        frames = 0;
        lastT = t;
      }
      frame += 1;
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      perspective.aspect = w / h;
      perspective.updateProjectionMatrix();
      const aspect = w / h;
      const halfH =
        (orthographic.top - orthographic.bottom) / 2 || 80;
      orthographic.left = -halfH * aspect;
      orthographic.right = halfH * aspect;
      orthographic.updateProjectionMatrix();
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      controls.dispose();
      clearGroup(stockRoot);
      clearGroup(toolpathRoot);
      clearGroup(wcsRoot);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
  }, [selectFace]);

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
    apiRef.current?.rebuild();
  }, [setup, toolpaths, selectedFaceId]);

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={canvasHostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
        <div className="max-w-xl truncate rounded border border-border bg-card/90 px-3 py-1 text-[11px] text-accent/90">
          {statusMessage}
        </div>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 rounded border border-border bg-card/80 px-2 py-1 font-mono text-[10px] text-muted-foreground">
        {fps} fps · mm · {setup?.wcs.frame ?? "G54"}
      </div>
      <div className="absolute bottom-3 right-3">
        <ViewCube
          viewDirection={viewDirection}
          onFaceClick={(face) => {
            const api = apiRef.current;
            if (!api) return;
            if (face === "iso") {
              api.aimDirection(new Vector3(1, 0.8, 1), true);
              return;
            }
            api.aimDirection(FACE_DIRS[face], true);
          }}
        />
      </div>
    </div>
  );
}

/** Map machine (X,Y,Z) mm → Three.js Y-up: (X, Z, Y). */
function toScene(x: number, y: number, z: number): Vector3 {
  return new Vector3(x * SCALE, z * SCALE, y * SCALE);
}

function stockCenter(setup: SetupNode | undefined): Vector3 {
  if (!setup) return new Vector3(50, 10, 30);
  const { origin, size } = setup.stock;
  return toScene(
    origin[0] + size[0] / 2,
    origin[1] + size[1] / 2,
    origin[2] + size[2] / 2,
  );
}

function buildStock(
  root: Group,
  setup: SetupNode,
  selectedFace: FlatFaceId | null,
) {
  if (!setup.stock.visible) return;
  const [sx, sy, sz] = setup.stock.size;
  const [ox, oy, oz] = setup.stock.origin;

  const body = new Mesh(
    new BoxGeometry(sx * SCALE, sz * SCALE, sy * SCALE),
    new MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.35,
      roughness: 0.55,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide,
    }),
  );
  body.position.copy(
    toScene(ox + sx / 2, oy + sy / 2, oz + sz / 2),
  );
  body.userData.stockBody = true;
  root.add(body);

  const edges = new LineSegments(
    new EdgesGeometry(body.geometry),
    new LineBasicMaterial({ color: 0x94a3b8 }),
  );
  edges.position.copy(body.position);
  root.add(edges);

  // Thin face pick plates slightly outside each face.
  const faces: { id: FlatFaceId; pos: Vector3; size: [number, number, number] }[] =
    [
      {
        id: "top",
        pos: toScene(ox + sx / 2, oy + sy / 2, oz + sz),
        size: [sx * SCALE, 0.4, sy * SCALE],
      },
      {
        id: "bottom",
        pos: toScene(ox + sx / 2, oy + sy / 2, oz),
        size: [sx * SCALE, 0.4, sy * SCALE],
      },
      {
        id: "front",
        pos: toScene(ox + sx / 2, oy + sy, oz + sz / 2),
        size: [sx * SCALE, sz * SCALE, 0.4],
      },
      {
        id: "back",
        pos: toScene(ox + sx / 2, oy, oz + sz / 2),
        size: [sx * SCALE, sz * SCALE, 0.4],
      },
      {
        id: "right",
        pos: toScene(ox + sx, oy + sy / 2, oz + sz / 2),
        size: [0.4, sz * SCALE, sy * SCALE],
      },
      {
        id: "left",
        pos: toScene(ox, oy + sy / 2, oz + sz / 2),
        size: [0.4, sz * SCALE, sy * SCALE],
      },
    ];

  for (const f of faces) {
    const selected = selectedFace === f.id;
    const mesh = new Mesh(
      new BoxGeometry(f.size[0], f.size[1], f.size[2]),
      new MeshStandardMaterial({
        color: selected ? 0x38bdf8 : 0x334155,
        emissive: selected ? 0xe85d04 : 0x000000,
        emissiveIntensity: selected ? 0.35 : 0,
        transparent: true,
        opacity: selected ? 0.55 : 0.15,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.position.copy(f.pos);
    mesh.userData.faceId = f.id;
    root.add(mesh);
  }
}

function buildWcs(root: Group, setup: SetupNode) {
  const [wx, wy, wz] = setup.wcs.origin;
  const triad = new AxesHelper(20 * SCALE);
  triad.position.copy(toScene(wx, wy, wz));
  // Rotate about scene-Y (machine Z) for WCS rotation.
  triad.rotation.y = (-setup.wcs.rotationDeg * Math.PI) / 180;
  root.add(triad);

  // Small origin marker
  const markerGeo = new BufferGeometry();
  const p = toScene(wx, wy, wz);
  markerGeo.setAttribute(
    "position",
    new Float32BufferAttribute([p.x, p.y, p.z, p.x, p.y + 8, p.z], 3),
  );
  root.add(
    new Line(
      markerGeo,
      new LineBasicMaterial({ color: 0xfbbf24 }),
    ),
  );
}

function buildToolpath(root: Group, toolpath: Toolpath, setup: SetupNode) {
  const [wx, wy, wz] = setup.wcs.origin;
  for (const seg of toolpath.segments) {
    if (seg.points.length < 2) continue;
    const positions: number[] = [];
    for (const pt of seg.points) {
      // Toolpath points are in WCS; convert to machine then scene.
      const mx = pt.x + wx;
      const my = pt.y + wy;
      const mz = pt.z + wz;
      const v = toScene(mx, my, mz);
      positions.push(v.x, v.y, v.z);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    const color = new Color(toolpath.color);
    const mat = new LineBasicMaterial({
      color,
      linewidth: 2,
    });
    const line = new Line(geo, mat);
    line.userData.toolpathId = toolpath.id;
    root.add(line);
  }
}

function clearGroup(root: Group) {
  while (root.children.length > 0) {
    const child = root.children[0];
    root.remove(child);
    disposeObject(child);
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

export default CamViewport;
