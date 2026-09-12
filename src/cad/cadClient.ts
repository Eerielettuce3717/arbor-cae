/**
 * Main-thread RPC client for the OpenCASCADE CAD worker.
 * Mesh results use transferable Float32Array / Uint32Array buffers.
 */

import type {
  AnalysisStubResult,
  AnalysisToolId,
  CadRequest,
  CadResponse,
  CadSuccessPayload,
  EvaluateBooleanParams,
  EvaluateExtrudeParams,
  EvaluateFilletParams,
  FeatureEvalResult,
  MassPropertiesResult,
  MeasureResult,
  MeasureTarget,
  MeshBuffers,
  TessellateOptions,
} from "./types";

type Pending = {
  resolve: (payload: CadSuccessPayload) => void;
  reject: (error: Error) => void;
};

/** Distribute Omit over CadRequest union members. */
type CadRequestBody = CadRequest extends infer R
  ? R extends { id: string }
    ? Omit<R, "id">
    : never
  : never;

let workerSingleton: Worker | null = null;
let seq = 0;
const pending = new Map<string, Pending>();
let initPromise: Promise<void> | null = null;

function nextId(): string {
  seq += 1;
  return `cad-${seq}-${Date.now()}`;
}

function getWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(
      new URL("../workers/cadWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerSingleton.onmessage = (event: MessageEvent<CadResponse>) => {
      const data = event.data;
      const entry = pending.get(data.id);
      if (!entry) return;

      if ("progress" in data && data.ok) {
        // Progress messages do not settle the promise.
        return;
      }

      pending.delete(data.id);
      if (!data.ok) {
        entry.reject(new Error(data.error));
        return;
      }
      if ("payload" in data) {
        entry.resolve(data.payload);
      }
    };
    workerSingleton.onerror = (event) => {
      const err = new Error(event.message || "CAD worker error");
      for (const [id, entry] of pending) {
        entry.reject(err);
        pending.delete(id);
      }
    };
  }
  return workerSingleton;
}

function request<T extends CadSuccessPayload>(body: CadRequestBody): Promise<T> {
  const id = nextId();
  const req = { ...body, id } as CadRequest;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (payload) => resolve(payload as T),
      reject,
    });
    getWorker().postMessage(req);
  });
}

export class CadClient {
  /** Ensure WASM kernel is loaded and the demo B-Rep shape exists. */
  async init(): Promise<void> {
    if (!initPromise) {
      initPromise = request({ op: "init" }).then(() => undefined);
    }
    await initPromise;
  }

  async createDemoShape(shapeId = "demo"): Promise<string> {
    await this.init();
    const payload = await request<{ op: "createDemoShape"; shapeId: string }>({
      op: "createDemoShape",
      shapeId,
    });
    return payload.shapeId;
  }

  /**
   * Tessellate a B-Rep shape; typed arrays are transferred (zero-copy) to this thread.
   */
  async tessellate(
    shapeId: string,
    options?: TessellateOptions,
  ): Promise<MeshBuffers> {
    await this.init();
    const payload = await request<{ op: "tessellate"; mesh: MeshBuffers }>({
      op: "tessellate",
      shapeId,
      options,
    });
    return payload.mesh;
  }

  async measure(a: MeasureTarget, b: MeasureTarget): Promise<MeasureResult> {
    await this.init();
    const payload = await request<{ op: "measure"; result: MeasureResult }>({
      op: "measure",
      a,
      b,
    });
    return payload.result;
  }

  async massProperties(shapeId: string): Promise<MassPropertiesResult> {
    await this.init();
    const payload = await request<{
      op: "massProperties";
      result: MassPropertiesResult;
    }>({
      op: "massProperties",
      shapeId,
    });
    return payload.result;
  }

  async runAnalysis(
    tool: Exclude<AnalysisToolId, "measure" | "mass-properties">,
    shapeId: string,
    params?: Record<string, unknown>,
  ): Promise<AnalysisStubResult> {
    await this.init();
    const payload = await request<{
      op: "runAnalysis";
      result: AnalysisStubResult;
    }>({
      op: "runAnalysis",
      tool,
      shapeId,
      params,
    });
    return payload.result;
  }

  /** Evaluate Extrude feature (prism from rectangle/circle profile). */
  async evaluateExtrude(
    params: EvaluateExtrudeParams,
  ): Promise<FeatureEvalResult> {
    await this.init();
    const payload = await request<{
      op: "evaluateExtrude";
      result: FeatureEvalResult;
    }>({
      op: "evaluateExtrude",
      params,
    });
    return payload.result;
  }

  /** Evaluate Fillet feature (edge blend on target body). */
  async evaluateFillet(
    params: EvaluateFilletParams,
  ): Promise<FeatureEvalResult> {
    await this.init();
    const payload = await request<{
      op: "evaluateFillet";
      result: FeatureEvalResult;
    }>({
      op: "evaluateFillet",
      params,
    });
    return payload.result;
  }

  /** Evaluate Boolean feature (union / subtract / intersect). */
  async evaluateBoolean(
    params: EvaluateBooleanParams,
  ): Promise<FeatureEvalResult> {
    await this.init();
    const payload = await request<{
      op: "evaluateBoolean";
      result: FeatureEvalResult;
    }>({
      op: "evaluateBoolean",
      params,
    });
    return payload.result;
  }

  terminate(): void {
    workerSingleton?.terminate();
    workerSingleton = null;
    initPromise = null;
    pending.clear();
  }
}

/** Shared client for the workspace session. */
export const cadClient = new CadClient();
