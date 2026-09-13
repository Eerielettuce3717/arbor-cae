import { useCallback, useEffect, useState } from "react";
import { cadClient } from "../../cad/cadClient";
import {
  ANALYSIS_OVERLAY_TOOLS,
  IMPLEMENTED_ANALYSIS_TOOLS,
  type AnalysisStubResult,
  type AnalysisToolId,
  type MassPropertiesResult,
  type MeasureResult,
  type MeshBuffers,
  type Vec3,
} from "../../cad/types";

export interface AnalysisPanelProps {
  /** Active analyze tool from the toolbar (or null if closed). */
  activeTool: AnalysisToolId | null;
  shapeId?: string;
  onClose: () => void;
  /** Called when the worker returns tessellated mesh buffers. */
  onMeshReady?: (mesh: MeshBuffers) => void;
}

function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function parseVec3(raw: string, fallback: Vec3): Vec3 {
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length >= 3 && parts.every((v) => Number.isFinite(v))) {
    return [parts[0], parts[1], parts[2]];
  }
  return fallback;
}

/**
 * Model Evaluation & Analysis Tools panel.
 * Measure + Mass Properties call the OCCT worker; overlays are UI→worker stubs.
 */
export function AnalysisPanel({
  activeTool,
  shapeId = "demo",
  onClose,
  onMeshReady,
}: AnalysisPanelProps) {
  const [kernelReady, setKernelReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Initializing OpenCASCADE…");
  const [error, setError] = useState<string | null>(null);

  const [pointA, setPointA] = useState("-1, 0.175, 0");
  const [pointB, setPointB] = useState("1, 0.175, 0");
  const [measure, setMeasure] = useState<MeasureResult | null>(null);
  const [mass, setMass] = useState<MassPropertiesResult | null>(null);
  const [stub, setStub] = useState<AnalysisStubResult | null>(null);

  useEffect(() => {
    if (!activeTool || kernelReady) return;
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        setError(null);
        await cadClient.init();
        if (cancelled) return;
        setKernelReady(true);
        setStatus("OpenCASCADE ready · shapes in worker");
        const mesh = await cadClient.tessellate(shapeId);
        if (cancelled) return;
        onMeshReady?.(mesh);
        setStatus(
          `Tessellated ${shapeId}: ${mesh.triangleCount} tris · ${mesh.vertexCount} verts`,
        );
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus("Kernel failed to load");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTool, kernelReady, shapeId, onMeshReady]);

  const runMeasure = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStub(null);
    try {
      const a = parseVec3(pointA, [-1, 0.175, 0]);
      const b = parseVec3(pointB, [1, 0.175, 0]);
      const result = await cadClient.measure(
        { kind: "point", point: a },
        { kind: "point", point: b },
      );
      setMeasure(result);
      setStatus(`Distance = ${fmt(result.distance)} mm`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [pointA, pointB]);

  const runMass = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStub(null);
    try {
      const result = await cadClient.massProperties(shapeId);
      setMass(result);
      setStatus(
        `Volume ${fmt(result.volume)} · Area ${fmt(result.surfaceArea)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [shapeId]);

  const runStub = useCallback(
    async (tool: Exclude<AnalysisToolId, "measure" | "mass-properties">) => {
      setBusy(true);
      setError(null);
      try {
        const result = await cadClient.runAnalysis(tool, shapeId);
        setStub(result);
        setStatus(`${result.tool}: stub acknowledged by worker`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [shapeId],
  );

  useEffect(() => {
    if (!activeTool || !kernelReady) return;
    let cancelled = false;
    (async () => {
      if (activeTool === "measure") {
        if (!cancelled) await runMeasure();
      } else if (activeTool === "mass-properties") {
        if (!cancelled) await runMass();
      } else if (!cancelled) {
        await runStub(activeTool);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTool, kernelReady, runMeasure, runMass, runStub]);

  if (!activeTool) return null;

  const title =
    activeTool === "measure"
      ? "Measure Tool"
      : activeTool === "mass-properties"
        ? "Mass Properties"
        : (ANALYSIS_OVERLAY_TOOLS.find((t) => t.id === activeTool)?.label ??
          "Analysis");

  return (
    <aside className="pointer-events-auto absolute bottom-10 right-3 z-30 flex max-h-[min(70vh,520px)] w-[320px] flex-col overflow-hidden rounded-md border border-border bg-card/95">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Model Evaluation
          </div>
          <div className="text-sm font-medium text-foreground">{title}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-faint hover:bg-hover hover:text-accent"
          aria-label="Close analysis panel"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs text-muted-foreground">
        <p className="mb-3 font-mono text-[10px] text-faint">
          {busy ? "Working…" : status}
        </p>
        {error && (
          <p className="mb-3 rounded border border-rose-900/60 bg-rose-950/40 px-2 py-1.5 text-rose-300">
            {error}
          </p>
        )}

        {activeTool === "measure" && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase text-faint">
                Point A (x,y,z)
              </span>
              <input
                value={pointA}
                onChange={(e) => setPointA(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-foreground"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase text-faint">
                Point B (x,y,z)
              </span>
              <input
                value={pointB}
                onChange={(e) => setPointB(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-foreground"
              />
            </label>
            <button
              type="button"
              disabled={busy || !kernelReady}
              onClick={() => void runMeasure()}
              className="w-full rounded bg-accent px-2 py-1.5 text-accent-foreground hover:bg-accent disabled:opacity-50"
            >
              Measure Distance
            </button>
            {measure && (
              <dl className="space-y-1 rounded border border-border bg-background/60 p-2 font-mono">
                <div className="flex justify-between gap-2">
                  <dt>Distance</dt>
                  <dd className="text-accent">{fmt(measure.distance)} mm</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>On A</dt>
                  <dd>
                    {measure.pointOnA.map((v) => fmt(v, 3)).join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>On B</dt>
                  <dd>
                    {measure.pointOnB.map((v) => fmt(v, 3)).join(", ")}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}

        {activeTool === "mass-properties" && (
          <div className="space-y-3">
            <p>
              Volume, surface area, and center of mass from{" "}
              <code className="text-faint">BRepGProp</code> on shape{" "}
              <span className="font-mono text-accent">{shapeId}</span>.
            </p>
            <button
              type="button"
              disabled={busy || !kernelReady}
              onClick={() => void runMass()}
              className="w-full rounded bg-accent px-2 py-1.5 text-accent-foreground hover:bg-accent disabled:opacity-50"
            >
              Compute Mass Properties
            </button>
            {mass && (
              <dl className="space-y-1 rounded border border-border bg-background/60 p-2 font-mono">
                <div className="flex justify-between gap-2">
                  <dt>Volume</dt>
                  <dd className="text-accent">{fmt(mass.volume)} u³</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Area</dt>
                  <dd className="text-accent">{fmt(mass.surfaceArea)} u²</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>CoM</dt>
                  <dd>
                    {mass.centerOfMass.map((v) => fmt(v, 3)).join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>I diag</dt>
                  <dd>
                    {mass.principalMoments.map((v) => fmt(v, 3)).join(", ")}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}

        {activeTool !== "measure" &&
          activeTool !== "mass-properties" && (
            <div className="space-y-3">
              <p>
                {
                  ANALYSIS_OVERLAY_TOOLS.find((t) => t.id === activeTool)
                    ?.description
                }
              </p>
              <button
                type="button"
                disabled
                aria-disabled
                title="Overlay analysis is not implemented in the OCCT bridge"
                className="w-full cursor-not-allowed rounded border border-border px-2 py-1.5 text-faint opacity-60"
              >
                Worker stub disabled
              </button>
              {stub && (
                <p className="rounded border border-border bg-muted px-2 py-1.5 text-muted-foreground">
                  {stub.message}
                </p>
              )}
            </div>
          )}

        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
            Analysis Overlays
          </div>
          <div className="grid grid-cols-1 gap-1">
            {ANALYSIS_OVERLAY_TOOLS.map((tool) => {
              const live = IMPLEMENTED_ANALYSIS_TOOLS.has(tool.id);
              return (
              <button
                key={tool.id}
                type="button"
                disabled={!live || busy || !kernelReady}
                aria-disabled={!live}
                onClick={() => {
                  if (!live) return;
                  void runStub(tool.id);
                }}
                className={`rounded px-2 py-1.5 text-left ${
                  !live
                    ? "cursor-not-allowed opacity-45 text-faint"
                    : activeTool === tool.id
                    ? "bg-active text-accent hover:bg-hover"
                    : "text-muted-foreground hover:bg-hover"
                }`}
                title={
                  live
                    ? tool.description
                    : `${tool.label} (not implemented)`
                }
              >
                {tool.label}
              </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default AnalysisPanel;
