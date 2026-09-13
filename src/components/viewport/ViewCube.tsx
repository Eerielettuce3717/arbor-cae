import { useEffect, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { useTheme } from "../../providers/ThemeProvider";

export type ViewCubeFace =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "iso";

interface ViewCubeProps {
  /** Main viewport camera direction (world). Updated each frame by parent. */
  viewDirection: Vector3;
  onFaceClick: (face: ViewCubeFace) => void;
  size?: number;
}

/**
 * Corner orientation gizmo — small Three.js scene that mirrors the main
 * camera orientation. Face clicks snap the main camera (Onshape-style).
 */
export function ViewCube({
  viewDirection,
  onFaceClick,
  size = 96,
}: ViewCubeProps) {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewDirRef = useRef(viewDirection);
  viewDirRef.current = viewDirection;

  const onFaceClickRef = useRef(onFaceClick);
  onFaceClickRef.current = onFaceClick;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1.4, 1.4, 1.4, -1.4, 0.1, 20);
    camera.position.set(2.2, 2.2, 2.2);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);

    const root = new Group();
    scene.add(root);

    scene.add(new AmbientLight(0xffffff, 0.85));
    const key = new DirectionalLight(0xffffff, 0.65);
    key.position.set(3, 4, 2);
    scene.add(key);

    const faceMat = new MeshStandardMaterial({
      color: new Color(resolvedTheme === "dark" ? "#1e293b" : "#e8eaee"),
      metalness: 0.15,
      roughness: 0.55,
      transparent: true,
      opacity: 0.92,
    });
    const cubeGeo = new BoxGeometry(1.1, 1.1, 1.1);
    const cube = new Mesh(cubeGeo, faceMat);
    root.add(cube);

    const edgeMat = new LineBasicMaterial({
      color: resolvedTheme === "dark" ? 0x94a3b8 : 0x64748b,
    });
    const edgeBox = new BoxGeometry(1.12, 1.12, 1.12);
    const edgeGeo = new EdgesGeometry(edgeBox);
    edgeBox.dispose();
    const edges = new LineSegments(edgeGeo, edgeMat);
    root.add(edges);

    const markMats: MeshStandardMaterial[] = [];
    const markGeos: BoxGeometry[] = [];
    const axisMarks = [
      { color: "#ef4444", pos: [0.56, 0, 0] as const },
      { color: "#22c55e", pos: [0, 0.56, 0] as const },
      { color: "#3b82f6", pos: [0, 0, 0.56] as const },
    ];
    for (const mark of axisMarks) {
      const geo = new BoxGeometry(0.12, 0.12, 0.12);
      const mat = new MeshStandardMaterial({
        color: mark.color,
        roughness: 0.4,
      });
      markGeos.push(geo);
      markMats.push(mat);
      const m = new Mesh(geo, mat);
      m.position.set(mark.pos[0], mark.pos[1], mark.pos[2]);
      root.add(m);
    }

    let raf = 0;
    const tmp = new Vector3();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      tmp.copy(viewDirRef.current).normalize();
      camera.position.copy(tmp).multiplyScalar(-3.2);
      if (camera.position.lengthSq() < 1e-6) {
        camera.position.set(2, 2, 2);
      }
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const ax = Math.abs(x);
      const ay = Math.abs(y);
      if (ax < 0.22 && ay < 0.22) {
        onFaceClickRef.current("iso");
        return;
      }
      if (ay > ax * 1.15) {
        onFaceClickRef.current(y > 0 ? "top" : "bottom");
      } else if (ax > ay * 1.15) {
        onFaceClickRef.current(x > 0 ? "right" : "left");
      } else {
        const vd = viewDirRef.current;
        if (Math.abs(vd.z) >= Math.abs(vd.x)) {
          onFaceClickRef.current(vd.z >= 0 ? "front" : "back");
        } else {
          onFaceClickRef.current("iso");
        }
      }
    };

    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
      faceMat.dispose();
      cubeGeo.dispose();
      edgeMat.dispose();
      edgeGeo.dispose();
      markMats.forEach((m) => m.dispose());
      markGeos.forEach((g) => g.dispose());
      renderer.dispose();
    };
  }, [size, resolvedTheme]);

  return (
    <div
      className="pointer-events-auto absolute bottom-10 right-3 z-20 select-none"
      title="View Cube — click a face to orient"
    >
      <div className="rounded-md border border-border/80 bg-card/70 p-1">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="block cursor-pointer"
          style={{ width: size, height: size }}
        />
        <div className="mt-0.5 grid grid-cols-4 gap-0.5 px-0.5 pb-0.5">
          {(
            [
              ["front", "F"],
              ["top", "T"],
              ["right", "R"],
              ["iso", "ISO"],
            ] as const
          ).map(([face, label]) => (
            <button
              key={face}
              type="button"
              onClick={() => onFaceClick(face)}
              className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[8px] text-muted-foreground hover:bg-hover hover:text-accent"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
