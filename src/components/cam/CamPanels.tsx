import type { ReactNode } from "react";
import { useCamStore } from "../../store/camStore";
import {
  FACE_LABELS,
  STOCK_MATERIALS,
  WCS_FRAMES,
  type FlatFaceId,
  type StockMaterial,
  type WcsFrameId,
} from "../../store/camTypes";

export function CamSidePanel() {
  const activePanel = useCamStore((s) => s.activePanel);
  const setActivePanel = useCamStore((s) => s.setActivePanel);

  if (activePanel === "none") return null;

  return (
    <aside className="absolute bottom-12 right-3 top-3 z-20 flex w-72 flex-col overflow-hidden rounded-md border border-border bg-card/95">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {panelTitle(activePanel)}
        </span>
        <button
          type="button"
          onClick={() => setActivePanel("none")}
          className="rounded px-1.5 text-faint hover:bg-hover hover:text-accent"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        {activePanel === "setup" && <SetupPanel />}
        {activePanel === "stock" && <StockPanel />}
        {activePanel === "wcs" && <WcsPanel />}
        {activePanel === "pocket" && <PocketPanel />}
        {activePanel === "post" && <PostPanel />}
      </div>
    </aside>
  );
}

function panelTitle(id: string): string {
  switch (id) {
    case "setup":
      return "Setup";
    case "stock":
      return "Stock Material";
    case "wcs":
      return "WCS Origin";
    case "pocket":
      return "2.5D Pocket Clear";
    case "post":
      return "Fanuc Post";
    default:
      return "CAM";
  }
}

function SetupPanel() {
  const setups = useCamStore((s) => s.setups);
  const activeSetupId = useCamStore((s) => s.activeSetupId);
  const updateSetupName = useCamStore((s) => s.updateSetupName);
  const setActivePanel = useCamStore((s) => s.setActivePanel);
  const setup = setups.find((s) => s.id === activeSetupId);
  if (!setup) return null;

  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          className={inputClass}
          value={setup.name}
          onChange={(e) => updateSetupName(e.target.value)}
        />
      </Field>
      <Field label="Machine">
        <div className="rounded border border-border bg-background px-2 py-1.5 text-muted-foreground">
          {setup.machine}
        </div>
      </Field>
      <p className="text-[11px] leading-relaxed text-faint">
        A Setup defines stock bounding box and WCS origin for machining. Open
        Stock / WCS to edit, then select a flat face for pocket clearing.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn label="Edit Stock" onClick={() => setActivePanel("stock")} />
        <ActionBtn label="Edit WCS" onClick={() => setActivePanel("wcs")} />
        <ActionBtn label="Pocket" onClick={() => setActivePanel("pocket")} />
      </div>
    </div>
  );
}

function StockPanel() {
  const setups = useCamStore((s) => s.setups);
  const activeSetupId = useCamStore((s) => s.activeSetupId);
  const updateStock = useCamStore((s) => s.updateStock);
  const setup = setups.find((s) => s.id === activeSetupId);
  if (!setup) return null;
  const { stock } = setup;

  return (
    <div className="space-y-3">
      <Field label="Material">
        <select
          className={inputClass}
          value={stock.material}
          onChange={(e) =>
            updateStock({ material: e.target.value as StockMaterial })
          }
        >
          {STOCK_MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {(["X", "Y", "Z"] as const).map((axis, i) => (
          <Field key={axis} label={`Size ${axis} (mm)`}>
            <input
              type="number"
              className={inputClass}
              value={stock.size[i]}
              min={1}
              step={1}
              onChange={(e) => {
                const next: [number, number, number] = [...stock.size];
                next[i] = Number(e.target.value) || 1;
                updateStock({ size: next });
              }}
            />
          </Field>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["X", "Y", "Z"] as const).map((axis, i) => (
          <Field key={axis} label={`Origin ${axis}`}>
            <input
              type="number"
              className={inputClass}
              value={stock.origin[i]}
              step={1}
              onChange={(e) => {
                const next: [number, number, number] = [...stock.origin];
                next[i] = Number(e.target.value) || 0;
                updateStock({ origin: next });
              }}
            />
          </Field>
        ))}
      </div>
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={stock.visible}
          onChange={(e) => updateStock({ visible: e.target.checked })}
        />
        Show stock bounding box
      </label>
    </div>
  );
}

function WcsPanel() {
  const setups = useCamStore((s) => s.setups);
  const activeSetupId = useCamStore((s) => s.activeSetupId);
  const updateWcs = useCamStore((s) => s.updateWcs);
  const setup = setups.find((s) => s.id === activeSetupId);
  if (!setup) return null;
  const { wcs } = setup;

  return (
    <div className="space-y-3">
      <Field label="Work offset">
        <select
          className={inputClass}
          value={wcs.frame}
          onChange={(e) =>
            updateWcs({ frame: e.target.value as WcsFrameId })
          }
        >
          {WCS_FRAMES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {(["X", "Y", "Z"] as const).map((axis, i) => (
          <Field key={axis} label={`${axis} (mm)`}>
            <input
              type="number"
              className={inputClass}
              value={wcs.origin[i]}
              step={0.1}
              onChange={(e) => {
                const next: [number, number, number] = [...wcs.origin];
                next[i] = Number(e.target.value) || 0;
                updateWcs({ origin: next });
              }}
            />
          </Field>
        ))}
      </div>
      <Field label="Rotation Z (deg)">
        <input
          type="number"
          className={inputClass}
          value={wcs.rotationDeg}
          step={1}
          onChange={(e) =>
            updateWcs({ rotationDeg: Number(e.target.value) || 0 })
          }
        />
      </Field>
      <p className="text-[11px] text-faint">
        Default places G54 on the top of stock at the min-X/min-Y corner.
      </p>
    </div>
  );
}

function PocketPanel() {
  const operations = useCamStore((s) => s.operations);
  const selectedOperationId = useCamStore((s) => s.selectedOperationId);
  const selectedFaceId = useCamStore((s) => s.selectedFaceId);
  const tools = useCamStore((s) => s.tools);
  const updatePocketParams = useCamStore((s) => s.updatePocketParams);
  const generatePocketToolpath = useCamStore((s) => s.generatePocketToolpath);
  const setActiveCamTool = useCamStore((s) => s.setActiveCamTool);
  const selectFace = useCamStore((s) => s.selectFace);

  const op =
    operations.find((o) => o.id === selectedOperationId) ?? operations[0];
  const tool = tools.find((t) => t.id === op?.toolId) ?? tools[0];
  if (!op) return null;

  const face = op.faceId ?? selectedFaceId;

  return (
    <div className="space-y-3">
      <Field label="Tool">
        <div className="rounded border border-border bg-background px-2 py-1.5 text-muted-foreground">
          {tool?.name ?? "—"}
        </div>
      </Field>
      <Field label="Selected face">
        <select
          className={inputClass}
          value={face ?? ""}
          onChange={(e) => {
            const v = e.target.value as FlatFaceId | "";
            selectFace(v || null);
          }}
        >
          <option value="">— select face —</option>
          {(Object.keys(FACE_LABELS) as FlatFaceId[]).map((id) => (
            <option key={id} value={id}>
              {FACE_LABELS[id]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Stepover"
          value={op.params.stepover}
          step={0.05}
          min={0.05}
          max={1}
          onChange={(v) => updatePocketParams(op.id, { stepover: v })}
        />
        <NumField
          label="Angle °"
          value={op.params.angleDeg}
          step={5}
          onChange={(v) => updatePocketParams(op.id, { angleDeg: v })}
        />
        <NumField
          label="DOC mm"
          value={op.params.depthOfCutMm}
          step={0.1}
          onChange={(v) => updatePocketParams(op.id, { depthOfCutMm: v })}
        />
        <NumField
          label="Depth mm"
          value={op.params.totalDepthMm}
          step={0.5}
          onChange={(v) => updatePocketParams(op.id, { totalDepthMm: v })}
        />
        <NumField
          label="Feed"
          value={op.params.feedMmMin}
          step={50}
          onChange={(v) => updatePocketParams(op.id, { feedMmMin: v })}
        />
        <NumField
          label="RPM"
          value={op.params.spindleRpm}
          step={100}
          onChange={(v) => updatePocketParams(op.id, { spindleRpm: v })}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <ActionBtn
          label="Pick Face"
          onClick={() => setActiveCamTool("faceSelect")}
        />
        <ActionBtn label="Generate Zigzag" primary onClick={generatePocketToolpath} />
      </div>
    </div>
  );
}

function PostPanel() {
  const lastGCode = useCamStore((s) => s.lastGCode);
  const lastNcPath = useCamStore((s) => s.lastNcPath);
  const postFanuc = useCamStore((s) => s.postFanuc);
  const toolpaths = useCamStore((s) => s.toolpaths);

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-[11px] text-faint">
        Posts the active pocket toolpath to Fanuc G-code and writes a{" "}
        <span className="font-mono text-accent/80">.nc</span> file via Tauri
        fs.
      </p>
      <ActionBtn
        label="Post & Save .nc"
        primary
        onClick={() => void postFanuc()}
        disabled={toolpaths.length === 0}
      />
      {lastNcPath && (
        <div className="rounded border border-emerald-800/50 bg-emerald-950/30 px-2 py-1.5 text-[11px] text-emerald-300">
          Saved: {lastNcPath}
        </div>
      )}
      {lastGCode && (
        <pre className="min-h-0 flex-1 overflow-auto rounded border border-border bg-background p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {lastGCode}
        </pre>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded border border-border bg-background px-2 py-1.5 text-foreground";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className={inputClass}
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function ActionBtn({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
        primary
          ? "bg-accent text-accent-foreground hover:bg-accent"
          : "border border-border text-muted-foreground hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}
