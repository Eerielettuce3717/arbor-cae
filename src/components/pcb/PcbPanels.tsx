import type { ReactNode } from "react";
import { usePcbStore } from "../../store/pcbStore";
import type { PcbPanelId, SnapAngleMode } from "../../store/pcbTypes";

export function PcbSidePanel() {
  const activePanel = usePcbStore((s) => s.activePanel);
  const setActivePanel = usePcbStore((s) => s.setActivePanel);

  if (activePanel === "none") return null;

  return (
    <aside className="absolute bottom-3 right-3 top-3 z-20 flex w-80 flex-col overflow-hidden rounded-md border border-eng-border bg-eng-panel/95 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-eng-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-eng-muted">
          {panelTitle(activePanel)}
        </span>
        <button
          type="button"
          onClick={() => setActivePanel("none")}
          className="rounded px-1.5 text-eng-faint hover:bg-eng-hover hover:text-eng-text"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        {activePanel === "board" && <BoardPanel />}
        {activePanel === "components" && <ComponentsPanel />}
        {activePanel === "traces" && <TracesPanel />}
        {activePanel === "layers" && <LayersPanel />}
        {activePanel === "rigidFlex" && <RigidFlexPanel />}
        {activePanel === "altium365" && <Altium365Panel />}
      </div>
    </aside>
  );
}

function panelTitle(id: PcbPanelId): string {
  switch (id) {
    case "board":
      return "Board Outline";
    case "components":
      return "Components";
    case "traces":
      return "Traces / Route";
    case "layers":
      return "Layers";
    case "rigidFlex":
      return "Rigid-Flex";
    case "altium365":
      return "Altium 365";
    default:
      return "PCB";
  }
}

function BoardPanel() {
  const outline = usePcbStore((s) => s.outline);
  const updateOutline = usePcbStore((s) => s.updateOutline);

  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          className={inputClass}
          value={outline.name}
          onChange={(e) => updateOutline({ name: e.target.value })}
        />
      </Field>
      <NumField
        label="Thickness (mm)"
        value={outline.thicknessMm}
        step={0.1}
        min={0.2}
        onChange={(v) => updateOutline({ thicknessMm: v })}
      />
      <p className="text-[11px] text-eng-faint">
        Outline has {outline.points.length} vertices. Edits bump revision and
        re-extrude via pcbTo3D.
      </p>
    </div>
  );
}

function ComponentsPanel() {
  const components = usePcbStore((s) => s.components);
  const selectedId = usePcbStore((s) => s.selectedId);
  const select = usePcbStore((s) => s.select);
  const addComponent = usePcbStore((s) => s.addComponent);
  const updateComponent = usePcbStore((s) => s.updateComponent);
  const removeComponent = usePcbStore((s) => s.removeComponent);
  const selected = components.find((c) => c.id === selectedId);

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-eng-muted">{components.length} parts</span>
        <ActionBtn label="Add" onClick={() => addComponent()} />
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {components.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => select(c.id)}
            className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left ${
              selectedId === c.id
                ? "border-sky-600 bg-sky-700/20"
                : "border-eng-border hover:bg-eng-hover"
            }`}
          >
            <span>
              {c.designator}{" "}
              <span className="text-eng-faint">{c.footprint}</span>
            </span>
            <span className="font-mono text-[10px] text-eng-faint">
              {c.x.toFixed(1)},{c.y.toFixed(1)}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="space-y-2 rounded border border-eng-border bg-eng-bg/50 p-2">
          <Field label="Designator">
            <input
              className={inputClass}
              value={selected.designator}
              onChange={(e) =>
                updateComponent(selected.id, { designator: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="X"
              value={selected.x}
              step={0.25}
              onChange={(v) => updateComponent(selected.id, { x: v })}
            />
            <NumField
              label="Y"
              value={selected.y}
              step={0.25}
              onChange={(v) => updateComponent(selected.id, { y: v })}
            />
            <NumField
              label="Rot °"
              value={selected.rotationDeg}
              onChange={(v) =>
                updateComponent(selected.id, { rotationDeg: v })
              }
            />
            <NumField
              label="3D H"
              value={selected.height3dMm}
              step={0.1}
              onChange={(v) =>
                updateComponent(selected.id, { height3dMm: v })
              }
            />
          </div>
          <ActionBtn
            label="Remove"
            onClick={() => removeComponent(selected.id)}
          />
        </div>
      )}
    </div>
  );
}

function TracesPanel() {
  const traces = usePcbStore((s) => s.traces);
  const snapMode = usePcbStore((s) => s.snapMode);
  const setSnapMode = usePcbStore((s) => s.setSnapMode);
  const beginTrace = usePcbStore((s) => s.beginTrace);
  const commitTrace = usePcbStore((s) => s.commitTrace);
  const cancelTrace = usePcbStore((s) => s.cancelTrace);
  const activeTraceId = usePcbStore((s) => s.activeTraceId);
  const gridMm = usePcbStore((s) => s.gridMm);
  const setGridMm = usePcbStore((s) => s.setGridMm);

  return (
    <div className="space-y-3">
      <Field label="Angle snap">
        <div className="flex gap-1">
          {([45, 90] as SnapAngleMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSnapMode(m)}
              className={`flex-1 rounded px-2 py-1.5 text-[11px] font-medium ${
                snapMode === m
                  ? "bg-sky-700 text-white"
                  : "border border-eng-border text-eng-muted hover:text-eng-text"
              }`}
            >
              {m}°
            </button>
          ))}
        </div>
      </Field>
      <NumField
        label="Grid (mm)"
        value={gridMm}
        step={0.05}
        min={0}
        onChange={setGridMm}
      />
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn
          label="Start route"
          primary
          onClick={() => beginTrace(`NET_${traces.length + 1}`)}
        />
        <ActionBtn label="Commit" onClick={commitTrace} />
        <ActionBtn label="Cancel" onClick={cancelTrace} />
      </div>
      <p className="text-[11px] text-eng-faint">
        Click canvas to place vertices. Preview snaps to {snapMode}°. Enter /
        double-click finishes. Keys: 4 = 45°, 9 = 90°.
      </p>
      {activeTraceId && (
        <div className="rounded border border-sky-700/50 bg-sky-700/10 px-2 py-1 text-sky-300">
          Active: {activeTraceId}
        </div>
      )}
      <div className="space-y-1">
        {traces.map((t) => (
          <div
            key={t.id}
            className="rounded border border-eng-border px-2 py-1 font-mono text-[10px] text-eng-muted"
          >
            {t.net} · {t.layer} · {t.vertices.length}v
            {t.draft ? " · draft" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayersPanel() {
  const layers = usePcbStore((s) => s.layers);
  const activeLayer = usePcbStore((s) => s.activeLayer);
  const setActiveLayer = usePcbStore((s) => s.setActiveLayer);

  return (
    <div className="space-y-1.5">
      {layers.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setActiveLayer(l.id)}
          className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left ${
            activeLayer === l.id
              ? "border-sky-600 bg-sky-700/20"
              : "border-eng-border hover:bg-eng-hover"
          }`}
        >
          <span
            className="h-3 w-3 rounded-sm border border-eng-border"
            style={{ background: l.color }}
          />
          <span className="flex-1 text-eng-text">{l.name}</span>
          <span className="text-[10px] text-eng-faint">
            {l.visible ? "on" : "off"}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Rigid-Flex PCB workflow UI scaffold */
function RigidFlexPanel() {
  const rigidFlex = usePcbStore((s) => s.rigidFlex);
  const setRigidFlexEnabled = usePcbStore((s) => s.setRigidFlexEnabled);
  const setFoldPreview = usePcbStore((s) => s.setFoldPreview);
  const updateRigidFlex = usePcbStore((s) => s.updateRigidFlex);

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="Rigid-Flex" />
      <label className="flex items-center gap-2 text-eng-muted">
        <input
          type="checkbox"
          checked={rigidFlex.enabled}
          onChange={(e) => setRigidFlexEnabled(e.target.checked)}
        />
        Enable rigid-flex regions
      </label>
      <NumField
        label="Fold preview (°)"
        value={rigidFlex.foldPreviewDeg}
        min={0}
        max={180}
        onChange={setFoldPreview}
      />
      <div className="space-y-1.5">
        {rigidFlex.regions.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => updateRigidFlex({ activeRegionId: r.id })}
            className={`w-full rounded border px-2 py-1.5 text-left ${
              rigidFlex.activeRegionId === r.id
                ? "border-sky-600 bg-sky-700/20"
                : "border-eng-border hover:bg-eng-hover"
            }`}
          >
            <span className="block text-eng-text">{r.name}</span>
            <span className="text-[10px] text-eng-faint">
              {r.kind}
              {r.bendLine
                ? ` · bend R=${r.bendRadiusMm} mm`
                : ""}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-eng-faint">
        Regions and bend lines visualize on the Pixi canvas and as amber guides
        in 3D. Full stackup / bend simulation is scaffold-only.
      </p>
    </div>
  );
}

/** Altium 365 Integration UI placeholders */
function Altium365Panel() {
  const altium = usePcbStore((s) => s.altium365);
  const connectAltium365 = usePcbStore((s) => s.connectAltium365);
  const disconnectAltium365 = usePcbStore((s) => s.disconnectAltium365);
  const updateAltium365 = usePcbStore((s) => s.updateAltium365);
  const syncAltium365 = usePcbStore((s) => s.syncAltium365);

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="Altium 365" />
      <Field label="Workspace URL">
        <input
          className={inputClass}
          value={altium.workspaceUrl}
          onChange={(e) => updateAltium365({ workspaceUrl: e.target.value })}
        />
      </Field>
      <Field label="Project ID">
        <input
          className={inputClass}
          value={altium.projectId}
          placeholder="e.g. proj_…"
          onChange={(e) => updateAltium365({ projectId: e.target.value })}
        />
      </Field>
      <div className="rounded border border-eng-border bg-eng-bg/60 px-2 py-1.5 text-[11px] text-eng-muted">
        Status:{" "}
        <span className="text-sky-300">
          {altium.connected ? "connected" : "offline"} · {altium.syncStatus}
        </span>
        {altium.lastSyncAt && (
          <div className="mt-1 text-eng-faint">
            Last sync: {new Date(altium.lastSyncAt).toLocaleString()}
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-eng-muted">
        <input
          type="checkbox"
          checked={altium.commentsEnabled}
          onChange={(e) =>
            updateAltium365({ commentsEnabled: e.target.checked })
          }
        />
        Web comments (placeholder)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {altium.connected ? (
          <>
            <ActionBtn label="Sync now" primary onClick={syncAltium365} />
            <ActionBtn label="Disconnect" onClick={disconnectAltium365} />
          </>
        ) : (
          <ActionBtn label="Connect" primary onClick={connectAltium365} />
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-eng-faint">
        {altium.statusMessage}
      </p>
    </div>
  );
}

function ScaffoldBadge({ label = "UI only" }: { label?: string }) {
  return (
    <span className="inline-flex rounded bg-eng-active px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-300/90">
      {label}
    </span>
  );
}

const inputClass =
  "w-full rounded border border-eng-border bg-eng-bg px-2 py-1.5 text-eng-text outline-none focus:border-sky-600";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-eng-faint">
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
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1.5 text-[11px] font-medium ${
        primary
          ? "bg-sky-700 text-white hover:bg-sky-600"
          : "border border-eng-border text-eng-muted hover:border-sky-700 hover:text-sky-300"
      }`}
    >
      {label}
    </button>
  );
}
