import { useRenderStore } from "../../store/renderStore";

/**
 * Graphics Area for Render Studio — host for a future WebGL PBR viewport.
 * Shows mapped material preview state without implementing a raytracer.
 */
export function RenderGraphicsArea() {
  const sceneNodes = useRenderStore((s) => s.sceneNodes);
  const selectedNodeId = useRenderStore((s) => s.selectedNodeId);
  const activePbr = useRenderStore((s) => s.activePbr);
  const environments = useRenderStore((s) => s.environments);
  const activeEnvironmentId = useRenderStore((s) => s.activeEnvironmentId);
  const lights = useRenderStore((s) => s.lights);
  const statusMessage = useRenderStore((s) => s.statusMessage);
  const lastUniforms = useRenderStore((s) => s.lastUniforms);

  const env = environments.find((e) => e.id === activeEnvironmentId);
  const selected =
    sceneNodes.find((n) => n.id === selectedNodeId) ?? sceneNodes[1];
  const visibleParts = sceneNodes.filter(
    (n) => n.kind === "part" && n.visible,
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-card" />

      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="relative flex w-full max-w-lg flex-col items-center">
          <div
            className="relative aspect-square w-56 max-w-full rounded-lg border border-border"
            style={{
              background: activePbr.color,
              opacity: Math.max(0.35, activePbr.opacity),
            }}
          >
            <div className="absolute inset-3 rounded border border-border/60" />
            <div className="absolute bottom-3 left-3 right-3 text-[10px] text-foreground">
              <div className="font-medium">{selected?.label ?? "Selection"}</div>
              <div className="font-mono text-muted-foreground">
                m {activePbr.metalness.toFixed(2)} · r{" "}
                {activePbr.roughness.toFixed(2)}
                {activePbr.transmission > 0
                  ? ` · T ${activePbr.transmission.toFixed(2)}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center text-[10px] text-faint">
            <div className="rounded border border-border bg-card/70 px-2 py-1.5">
              <div className="text-muted-foreground">Parts</div>
              <div className="text-accent">{visibleParts.length}</div>
            </div>
            <div className="rounded border border-border bg-card/70 px-2 py-1.5">
              <div className="text-muted-foreground">Lights</div>
              <div className="text-accent">
                {lights.filter((l) => l.enabled).length}
              </div>
            </div>
            <div className="rounded border border-border bg-card/70 px-2 py-1.5">
              <div className="text-muted-foreground">Env</div>
              <div className="truncate text-accent">{env?.kind ?? "—"}</div>
            </div>
          </div>

          {lastUniforms && (
            <div className="mt-3 w-full rounded border border-border bg-card/80 px-3 py-2 text-left font-mono text-[10px] text-muted-foreground">
              Last push: {Object.keys(lastUniforms).length} uniforms → WebGL
              binder
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-3 top-3 rounded border border-border bg-card/90 px-2 py-1 text-[10px] uppercase tracking-wide text-accent/80">
        Graphics Area · PBR preview
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex justify-center">
        <div className="max-w-xl truncate rounded border border-border bg-card/90 px-3 py-1.5 text-[11px] text-accent/90">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}
