import { useEffect, useRef } from "react";
import {
  AmbientLight,
  DirectionalLight,
  Group,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { disposePcb3D, pcbTo3D } from "../../pcb";
import { usePcbStore } from "../../store/pcbStore";
import { useTheme } from "../../providers/ThemeProvider";
import { applyViewportSceneTheme } from "../../theme/viewportTheme";
import {
  OnshapeControls,
  type ActiveCamera,
} from "../viewport/controls/OnshapeControls";

interface Pcb3DApi {
  scene: Scene;
  root: Group | null;
  perspective: PerspectiveCamera;
  orthographic: OrthographicCamera;
  active: ActiveCamera;
  controls: OnshapeControls;
  renderer: WebGLRenderer;
  revision: number;
  ambient: AmbientLight;
  key: DirectionalLight;
  fill: DirectionalLight;
}

/**
 * Three.js viewport that rebuilds from pcbTo3D whenever the 2D canvas revision bumps.
 */
export function PcbViewport3D() {
  const { resolvedTheme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Pcb3DApi | null>(null);
  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;

  const outline = usePcbStore((s) => s.outline);
  const components = usePcbStore((s) => s.components);
  const traces = usePcbStore((s) => s.traces);
  const rigidFlex = usePcbStore((s) => s.rigidFlex);
  const revision = usePcbStore((s) => s.revision);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new Scene();
    const ambient = new AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const key = new DirectionalLight(0xffffff, 1.1);
    key.position.set(40, 80, 30);
    scene.add(key);
    const fill = new DirectionalLight(0xaaccff, 0.35);
    fill.position.set(-30, 20, -40);
    scene.add(fill);
    applyViewportSceneTheme(scene, resolvedThemeRef.current, {
      ambient,
      key,
      fill,
    });

    const perspective = new PerspectiveCamera(
      45,
      host.clientWidth / Math.max(host.clientHeight, 1),
      0.1,
      2000,
    );
    perspective.position.set(60, 70, 90);

    const aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    const frustum = 60;
    const orthographic = new OrthographicCamera(
      -frustum * aspect,
      frustum * aspect,
      frustum,
      -frustum,
      0.1,
      2000,
    );
    orthographic.position.copy(perspective.position);

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const controls = new OnshapeControls(perspective, renderer.domElement);
    controls.target.set(0, 0, 0);

    const api: Pcb3DApi = {
      scene,
      root: null,
      perspective,
      orthographic,
      active: perspective,
      controls,
      renderer,
      revision: -1,
      ambient,
      key,
      fill,
    };
    apiRef.current = api;

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, api.active);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      if (!host) return;
      const w = host.clientWidth;
      const h = Math.max(host.clientHeight, 1);
      perspective.aspect = w / h;
      perspective.updateProjectionMatrix();
      const a = w / h;
      orthographic.left = -frustum * a;
      orthographic.right = frustum * a;
      orthographic.top = frustum;
      orthographic.bottom = -frustum;
      orthographic.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposePcb3D(api.root);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    applyViewportSceneTheme(api.scene, resolvedTheme, {
      ambient: api.ambient,
      key: api.key,
      fill: api.fill,
    });
  }, [resolvedTheme]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    if (api.revision === revision && api.root) return;

    disposePcb3D(api.root);
    if (api.root) api.scene.remove(api.root);

    const built = pcbTo3D({
      outline,
      components,
      traces,
      rigidFlex,
      revision,
    });
    api.root = built.root;
    api.revision = revision;
    api.scene.add(built.root);
    api.controls.target.set(0, outline.thicknessMm / 2, 0);
  }, [outline, components, traces, rigidFlex, revision]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-2 top-2 rounded border border-border bg-card/90 px-2 py-1 text-[10px] uppercase tracking-wide text-accent/90">
        3D · pcbTo3D r{revision}
      </div>
    </div>
  );
}

export default PcbViewport3D;
