import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { usePcbStore } from "../../store/pcbStore";
import type { PcbPoint } from "../../store/pcbTypes";
import { LAYER_COLORS } from "../../store/pcbTypes";
import { useTheme } from "../../providers/ThemeProvider";
import { VIEWPORT_THEME } from "../../theme/viewportTheme";

const PX_PER_MM = 8;
const ORIGIN_X = 40;
const ORIGIN_Y = 40;

function toScreen(p: PcbPoint): { x: number; y: number } {
  return { x: ORIGIN_X + p.x * PX_PER_MM, y: ORIGIN_Y + p.y * PX_PER_MM };
}

function toWorld(sx: number, sy: number): PcbPoint {
  return {
    x: (sx - ORIGIN_X) / PX_PER_MM,
    y: (sy - ORIGIN_Y) / PX_PER_MM,
  };
}

/**
 * PixiJS hardware-accelerated 2D PCB canvas.
 * Renders board outline, components, traces; handles route clicks with snap.
 */
export function PcbCanvas() {
  const { resolvedTheme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  const outline = usePcbStore((s) => s.outline);
  const components = usePcbStore((s) => s.components);
  const traces = usePcbStore((s) => s.traces);
  const rigidFlex = usePcbStore((s) => s.rigidFlex);
  const revision = usePcbStore((s) => s.revision);
  const activeTool = usePcbStore((s) => s.activeTool);
  const snapMode = usePcbStore((s) => s.snapMode);
  const selectedId = usePcbStore((s) => s.selectedId);
  const activeTraceId = usePcbStore((s) => s.activeTraceId);
  const routePreview = usePcbStore((s) => s.routePreview);
  const statusMessage = usePcbStore((s) => s.statusMessage);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const app = new Application();
    appRef.current = app;

    void (async () => {
      await app.init({
        background: VIEWPORT_THEME[themeRef.current].background,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        resizeTo: host,
        preference: "webgl",
      });
      if (cancelled) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);

      const world = new Container();
      worldRef.current = world;
      app.stage.addChild(world);

      const boardG = new Graphics();
      const copperG = new Graphics();
      const compG = new Graphics();
      const overlayG = new Graphics();
      const labelRoot = new Container();
      world.addChild(boardG, copperG, compG, overlayG, labelRoot);

      const redraw = () => {
        const state = usePcbStore.getState();
        boardG.clear();
        copperG.clear();
        compG.clear();
        overlayG.clear();
        labelRoot.removeChildren();

        // Grid
        const grid = state.gridMm * PX_PER_MM;
        if (grid >= 2) {
          const w = app.screen.width;
          const h = app.screen.height;
          overlayG.setStrokeStyle({
            width: 1,
            color: VIEWPORT_THEME[themeRef.current].grid,
            alpha: 0.7,
          });
          for (let x = ORIGIN_X % grid; x < w; x += grid) {
            overlayG.moveTo(x, 0);
            overlayG.lineTo(x, h);
          }
          for (let y = ORIGIN_Y % grid; y < h; y += grid) {
            overlayG.moveTo(0, y);
            overlayG.lineTo(w, y);
          }
          overlayG.stroke();
        }

        // Board outline fill
        const pts = state.outline.points.map(toScreen);
        if (pts.length >= 3) {
          boardG.setFillStyle({ color: 0x1a4d2e, alpha: 0.85 });
          boardG.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            boardG.lineTo(pts[i].x, pts[i].y);
          }
          boardG.closePath();
          boardG.fill();
          boardG.setStrokeStyle({ width: 2, color: 0x34d399 });
          boardG.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            boardG.lineTo(pts[i].x, pts[i].y);
          }
          boardG.closePath();
          boardG.stroke();
        }

        // Rigid-flex regions
        if (state.rigidFlex.enabled) {
          for (const region of state.rigidFlex.regions) {
            const rpts = region.points.map(toScreen);
            if (rpts.length < 3) continue;
            const fill =
              region.kind === "flex" ? 0xf59e0b : 0x38bdf8;
            boardG.setFillStyle({ color: fill, alpha: 0.12 });
            boardG.moveTo(rpts[0].x, rpts[0].y);
            for (let i = 1; i < rpts.length; i++) {
              boardG.lineTo(rpts[i].x, rpts[i].y);
            }
            boardG.closePath();
            boardG.fill();
            if (region.bendLine) {
              const a = toScreen(region.bendLine.a);
              const b = toScreen(region.bendLine.b);
              boardG.setStrokeStyle({
                width: 2,
                color: 0xfbbf24,
                alpha: 0.9,
              });
              boardG.moveTo(a.x, a.y);
              boardG.lineTo(b.x, b.y);
              boardG.stroke();
            }
          }
        }

        // Traces
        for (const trace of state.traces) {
          if (trace.vertices.length === 0) continue;
          const color =
            LAYER_COLORS[trace.layer] ?? "#c45c26";
          const hex = Number(color.replace("#", "0x"));
          const width = Math.max(trace.widthMm * PX_PER_MM, 1.5);
          const verts = [...trace.vertices];
          if (
            trace.id === state.activeTraceId &&
            state.routePreview &&
            verts.length > 0
          ) {
            verts.push(state.routePreview);
          }
          copperG.setStrokeStyle({
            width,
            color: hex,
            alpha: trace.draft ? 0.55 : 0.95,
            cap: "round",
            join: "round",
          });
          const s0 = toScreen(verts[0]);
          copperG.moveTo(s0.x, s0.y);
          for (let i = 1; i < verts.length; i++) {
            const s = toScreen(verts[i]);
            copperG.lineTo(s.x, s.y);
          }
          copperG.stroke();

          // Vertex markers
          for (const v of trace.vertices) {
            const s = toScreen(v);
            copperG.setFillStyle({ color: hex, alpha: 1 });
            copperG.circle(s.x, s.y, 2.5);
            copperG.fill();
          }
        }

        // Components
        for (const comp of state.components) {
          const s = toScreen({ x: comp.x, y: comp.y });
          const w = comp.widthMm * PX_PER_MM;
          const h = comp.heightMm * PX_PER_MM;
          const selected = state.selectedId === comp.id;
          const hex = Number(comp.color.replace("#", "0x"));
          compG.setFillStyle({ color: hex, alpha: 0.9 });
          compG.setStrokeStyle({
            width: selected ? 2 : 1,
            color: selected ? 0x38bdf8 : 0x94a3b8,
          });
          compG.rect(s.x - w / 2, s.y - h / 2, w, h);
          compG.fill();
          compG.stroke();

          const label = new Text({
            text: comp.designator,
            style: {
              fontSize: 10,
              fill: 0xe2e8f0,
              fontFamily: "IBM Plex Sans, sans-serif",
            },
          });
          label.x = s.x - label.width / 2;
          label.y = s.y - h / 2 - 14;
          labelRoot.addChild(label);
        }
      };

      drawRef.current = redraw;
      redraw();

      const onPointer = (e: PointerEvent) => {
        const rect = app.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = toWorld(sx, sy);
        const store = usePcbStore.getState();

        if (e.type === "pointermove") {
          if (store.activeTool === "route" && store.activeTraceId) {
            store.setRoutePreview(world);
            redraw();
          }
          return;
        }

        if (e.type === "pointerdown" && e.button === 0) {
          if (store.activeTool === "route") {
            if (!store.activeTraceId) {
              store.beginTrace(`NET_${store.traces.length + 1}`);
            }
            store.addTraceVertex(world);
            redraw();
            return;
          }
          if (store.activeTool === "place") {
            store.addComponent({
              x: world.x,
              y: world.y,
            });
            redraw();
            return;
          }
          if (store.activeTool === "select") {
            // Hit-test components
            let hit: string | null = null;
            for (const c of store.components) {
              if (
                Math.abs(world.x - c.x) <= c.widthMm / 2 &&
                Math.abs(world.y - c.y) <= c.heightMm / 2
              ) {
                hit = c.id;
                break;
              }
            }
            store.select(hit);
            redraw();
          }
        }
      };

      const onKey = (e: KeyboardEvent) => {
        const store = usePcbStore.getState();
        if (e.key === "Enter" && store.activeTraceId) {
          store.commitTrace();
          redraw();
        } else if (e.key === "Escape" && store.activeTraceId) {
          store.cancelTrace();
          redraw();
        } else if (e.key === "4" && !e.metaKey && !e.ctrlKey) {
          store.setSnapMode(45);
        } else if (e.key === "9" && !e.metaKey && !e.ctrlKey) {
          store.setSnapMode(90);
        }
      };

      const onDblClick = () => {
        const store = usePcbStore.getState();
        if (store.activeTraceId) {
          store.commitTrace();
          redraw();
        }
      };

      app.canvas.addEventListener("pointerdown", onPointer);
      app.canvas.addEventListener("pointermove", onPointer);
      app.canvas.addEventListener("dblclick", onDblClick);
      window.addEventListener("keydown", onKey);

      (app as Application & { __pcbCleanup?: () => void }).__pcbCleanup = () => {
        app.canvas.removeEventListener("pointerdown", onPointer);
        app.canvas.removeEventListener("pointermove", onPointer);
        app.canvas.removeEventListener("dblclick", onDblClick);
        window.removeEventListener("keydown", onKey);
      };
    })();

    return () => {
      cancelled = true;
      const appInst = appRef.current as
        | (Application & { __pcbCleanup?: () => void })
        | null;
      appInst?.__pcbCleanup?.();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      worldRef.current = null;
      drawRef.current = null;
    };
  }, []);

  // Redraw when store-driven props change
  useEffect(() => {
    drawRef.current?.();
  }, [
    outline,
    components,
    traces,
    rigidFlex,
    revision,
    activeTool,
    snapMode,
    selectedId,
    activeTraceId,
    routePreview,
  ]);

  useEffect(() => {
    const app = appRef.current;
    if (!app?.renderer) return;
    app.renderer.background.color.setValue(
      VIEWPORT_THEME[resolvedTheme].background,
    );
    drawRef.current?.();
  }, [resolvedTheme]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-2 top-2 space-y-1">
        <div className="rounded border border-border bg-card/90 px-2 py-1 text-[10px] uppercase tracking-wide text-accent/90">
          PixiJS · {snapMode}° snap · {PX_PER_MM} px/mm
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
        <div className="max-w-xl truncate rounded border border-border bg-card/90 px-3 py-1 text-[11px] text-accent/90">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}

export default PcbCanvas;
