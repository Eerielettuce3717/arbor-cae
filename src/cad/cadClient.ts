/**
 * Main-thread RPC client for the OpenCASCADE CAD worker.
 * Mesh results use transferable Float32Array / Uint32Array buffers.
 *
 * All state is instance-scoped. It previously lived in module globals shared by
 * every `CadClient`, so tearing one down silently invalidated the others.
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

interface Pending {
  /** Operation name, retained purely for timeout diagnostics. */
  op: string;
  resolve: (payload: CadSuccessPayload) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Distribute Omit over CadRequest union members. */
type CadRequestBody = CadRequest extends infer R
  ? R extends { id: string }
    ? Omit<R, "id">
    : never
  : never;

/**
 * Idle timeout, not a total budget: a worker that keeps reporting progress
 * keeps renewing its deadline.
 */
const RPC_TIMEOUT_MS = 60_000;

export class CadClient {
  #worker: Worker | null = null;
  #initPromise: Promise<void> | null = null;
  #pending = new Map<string, Pending>();
  #seq = 0;

  #nextId(): string {
    this.#seq += 1;
    return `cad-${this.#seq}-${Date.now()}`;
  }

  /**
   * Reject every in-flight RPC and forget the worker.
   *
   * Clearing `#worker` and `#initPromise` together is what makes the client
   * recoverable: the next call spawns a fresh worker and re-runs init. Without
   * this, a worker crash left a dead handle installed and every later request
   * was posted into the void until it timed out — permanently.
   */
  #teardown(reason: Error): void {
    const worker = this.#worker;
    this.#worker = null;
    this.#initPromise = null;

    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }

    // Snapshot and clear before rejecting so a rejection handler that
    // immediately retries cannot have its new entry wiped by this loop.
    const entries = [...this.#pending.values()];
    this.#pending.clear();
    for (const entry of entries) {
      clearTimeout(entry.timer);
      entry.reject(reason);
    }
  }

  #armTimeout(id: string, op: string): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      const entry = this.#pending.get(id);
      if (!entry) return;
      this.#pending.delete(id);
      entry.reject(
        new Error(`CAD worker timed out after ${RPC_TIMEOUT_MS}ms (${op})`),
      );
    }, RPC_TIMEOUT_MS);
  }

  #onMessage(source: Worker, data: CadResponse): void {
    // Ignore late messages from a worker we have already torn down; they must
    // not settle requests belonging to its replacement.
    if (source !== this.#worker) return;

    const entry = this.#pending.get(data.id);
    if (!entry) return;

    if (data.ok && "progress" in data) {
      // Progress does not settle the promise, but it does prove liveness, so
      // renew the deadline. Previously a job reporting progress for longer than
      // the timeout was killed despite making steady forward progress.
      clearTimeout(entry.timer);
      entry.timer = this.#armTimeout(data.id, entry.op);
      return;
    }

    clearTimeout(entry.timer);
    this.#pending.delete(data.id);

    if (!data.ok) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.payload);
  }

  #getWorker(): Worker {
    if (this.#worker) return this.#worker;

    const worker = new Worker(
      new URL("../workers/cadWorker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (event: MessageEvent<CadResponse>) => {
      this.#onMessage(worker, event.data);
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      this.#teardown(new Error(event.message || "CAD worker crashed"));
    };
    worker.onmessageerror = () => {
      this.#teardown(
        new Error("CAD worker sent a message that could not be deserialized"),
      );
    };

    this.#worker = worker;
    return worker;
  }

  #request<T extends CadSuccessPayload>(body: CadRequestBody): Promise<T> {
    const id = this.#nextId();
    const req = { ...body, id } as CadRequest;

    return new Promise<T>((resolve, reject) => {
      const entry: Pending = {
        op: body.op,
        resolve: (payload) => resolve(payload as T),
        reject,
        timer: this.#armTimeout(id, body.op),
      };
      this.#pending.set(id, entry);

      try {
        this.#getWorker().postMessage(req);
      } catch (err) {
        // Worker construction or structured-clone failure. Settle immediately
        // rather than leaving a pending entry and a live timer holding the
        // event loop for the whole timeout window.
        clearTimeout(entry.timer);
        this.#pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /** Ensure WASM kernel is loaded and the demo B-Rep shape exists. */
  init(): Promise<void> {
    if (this.#initPromise) return this.#initPromise;

    const attempt: Promise<void> = this.#request({ op: "init" })
      .then(() => undefined)
      .catch((err: unknown) => {
        // Evict the cached promise so a transient failure (WASM fetch error,
        // out of memory) stays retryable. Caching the rejection meant one bad
        // load bricked every CAD operation for the rest of the session.
        // The identity check avoids clobbering a newer attempt started by a
        // teardown that raced this one.
        if (this.#initPromise === attempt) this.#initPromise = null;
        throw err instanceof Error ? err : new Error(String(err));
      });

    this.#initPromise = attempt;
    return attempt;
  }

  async createDemoShape(shapeId = "demo"): Promise<string> {
    await this.init();
    const payload = await this.#request<{
      op: "createDemoShape";
      shapeId: string;
    }>({
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
    const payload = await this.#request<{ op: "tessellate"; mesh: MeshBuffers }>({
      op: "tessellate",
      shapeId,
      options,
    });
    return payload.mesh;
  }

  async measure(a: MeasureTarget, b: MeasureTarget): Promise<MeasureResult> {
    await this.init();
    const payload = await this.#request<{
      op: "measure";
      result: MeasureResult;
    }>({
      op: "measure",
      a,
      b,
    });
    return payload.result;
  }

  async massProperties(shapeId: string): Promise<MassPropertiesResult> {
    await this.init();
    const payload = await this.#request<{
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
    const payload = await this.#request<{
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
    const payload = await this.#request<{
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
    const payload = await this.#request<{
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
    const payload = await this.#request<{
      op: "evaluateBoolean";
      result: FeatureEvalResult;
    }>({
      op: "evaluateBoolean",
      params,
    });
    return payload.result;
  }

  /** Keep only the listed shape ids (plus the shared demo body). */
  async retainShapes(
    shapeIds: string[],
  ): Promise<{ kept: number; dropped: number }> {
    await this.init();
    const payload = await this.#request<{
      op: "retainShapes";
      kept: number;
      dropped: number;
    }>({
      op: "retainShapes",
      shapeIds,
    });
    return { kept: payload.kept, dropped: payload.dropped };
  }

  async deleteShape(shapeId: string): Promise<boolean> {
    await this.init();
    const payload = await this.#request<{
      op: "deleteShape";
      shapeId: string;
      deleted: boolean;
    }>({
      op: "deleteShape",
      shapeId,
    });
    return payload.deleted;
  }

  /** Tear down the WASM worker thread and reject any in-flight RPCs. */
  terminate(): void {
    this.#teardown(new Error("CAD worker terminated"));
  }
}

/** Shared client for the workspace session. */
export const cadClient = new CadClient();
