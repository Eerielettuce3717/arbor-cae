import { useState } from "react";
import { useAssemblyStore } from "../../store/assemblyStore";
import {
  IMPLEMENTED_MATES,
  INSERTABLE_DOCUMENTS,
  MATE_CATALOG,
  RELATION_CATALOG,
  type MateType,
  type RelationType,
  type Vec3,
} from "../../store/assemblyTypes";
import { BomTable } from "./BomTable";

const inputClass =
  "w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground";

function ScaffoldBadge() {
  return (
    <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-faint">
      UI only
    </span>
  );
}

export function AssemblySidePanel() {
  const panel = useAssemblyStore((s) => s.activePanel);
  const setActivePanel = useAssemblyStore((s) => s.setActivePanel);
  if (panel === "none") return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-start justify-end bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) setActivePanel("none");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setActivePanel("none");
      }}
    >
      <div className="flex max-h-[calc(100%-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold text-foreground">{panelTitle(panel)}</h2>
          <button
            type="button"
            onClick={() => setActivePanel("none")}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-hover hover:text-accent"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          {panel === "insert" && <InsertPanel />}
          {panel === "link" && <LinkingPanel />}
          {panel === "updateRefs" && <UpdateReferencesPanel />}
          {panel === "mate" && <MateEditor />}
          {panel === "relations" && <RelationsPanel />}
          {panel === "tools" && <AssemblyToolsPanel />}
          {panel === "namedPositions" && <NamedPositionsPanel />}
          {panel === "displayStates" && <DisplayStatesPanel />}
          {panel === "explodedViews" && <ExplodedViewsPanel />}
          {panel === "inContext" && <InContextPanel />}
          {panel === "bom" && <BomTable />}
        </div>
      </div>
    </div>
  );
}

function panelTitle(panel: string): string {
  switch (panel) {
    case "insert":
      return "Insert Parts and Assemblies";
    case "link":
      return "Linking Documents";
    case "updateRefs":
      return "Updating References";
    case "mate":
      return "Mate";
    case "relations":
      return "Relations";
    case "tools":
      return "Assembly tools";
    case "namedPositions":
      return "Named Positions";
    case "displayStates":
      return "Display States";
    case "explodedViews":
      return "Exploded Views";
    case "inContext":
      return "Create Part Studio in Context";
    case "bom":
      return "Bill of Materials";
    default:
      return "Assembly";
  }
}

function InsertPanel() {
  const insertDocument = useAssemblyStore((s) => s.insertDocument);
  const setActivePanel = useAssemblyStore((s) => s.setActivePanel);
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const docs = INSERTABLE_DOCUMENTS.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.partNumber.toLowerCase().includes(q),
  );

  return (
    <div className="flex h-full flex-col p-3">
      <p className="mb-2 text-[11px] text-faint">
        Insert a part studio or sub-assembly. A document link is created automatically.
      </p>
      <input
        className={`${inputClass} mb-2`}
        placeholder="Search documents…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {docs.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => {
              insertDocument(doc.id);
              setActivePanel("none");
            }}
            className="flex w-full items-center gap-2 rounded border border-border px-2 py-2 text-left hover:bg-hover"
          >
            <span className="text-[11px] text-faint">
              {doc.kind === "assembly" ? "⧉" : "◼"}
            </span>
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: doc.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-foreground">{doc.name}</div>
              <div className="text-[10px] text-faint">
                {doc.partNumber} · {doc.kind} · {doc.revision}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LinkingPanel() {
  const links = useAssemblyStore((s) => s.links);
  const linkDocument = useAssemblyStore((s) => s.linkDocument);
  const unlinkDocument = useAssemblyStore((s) => s.unlinkDocument);
  const setLinkMode = useAssemblyStore((s) => s.setLinkMode);
  const linkedIds = new Set(links.map((l) => l.documentId));

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Instances reference other documents by version or live workspace. Stale links
        can be refreshed from Updating References.
      </p>
      {links.map((link) => (
        <div
          key={link.id}
          className="rounded border border-border bg-background/40 p-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{link.documentName}</span>
            {link.stale && (
              <span className="text-[9px] uppercase text-amber-300">stale</span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-faint">
            Pinned {link.pinnedRevision} · latest {link.latestRevision}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select
              className={inputClass}
              value={link.mode}
              onChange={(e) =>
                setLinkMode(link.id, e.target.value as "version" | "workspace")
              }
            >
              <option value="version">Version</option>
              <option value="workspace">Workspace</option>
            </select>
            <button
              type="button"
              onClick={() => unlinkDocument(link.id)}
              className="rounded px-2 py-1 text-[11px] text-rose-300 hover:bg-hover"
            >
              Unlink
            </button>
          </div>
        </div>
      ))}
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-faint">
        Available documents
      </h4>
      {INSERTABLE_DOCUMENTS.filter((d) => !linkedIds.has(d.id)).map((doc) => (
        <div key={doc.id} className="flex items-center gap-2">
          <span className="flex-1 truncate text-muted-foreground">{doc.name}</span>
          <button
            type="button"
            onClick={() => linkDocument(doc.id, "version")}
            className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-accent"
          >
            Link version
          </button>
          <button
            type="button"
            onClick={() => linkDocument(doc.id, "workspace")}
            className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-accent"
          >
            Link workspace
          </button>
        </div>
      ))}
    </div>
  );
}

function UpdateReferencesPanel() {
  const links = useAssemblyStore((s) => s.links);
  const updateReference = useAssemblyStore((s) => s.updateReference);
  const updateAllReferences = useAssemblyStore((s) => s.updateAllReferences);
  const stale = links.filter((l) => l.stale);

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Pull linked documents to their latest version. Workspace links update when
        the source is dirty.
      </p>
      <button
        type="button"
        onClick={() => updateAllReferences()}
        className="w-full rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent"
      >
        Update all references ({stale.length} stale)
      </button>
      {links.map((link) => (
        <div
          key={link.id}
          className="flex items-center justify-between rounded border border-border px-2 py-2"
        >
          <div>
            <div className="text-foreground">{link.documentName}</div>
            <div className="text-[10px] text-faint">
              {link.pinnedRevision}
              {link.stale ? ` → ${link.latestRevision}` : " · current"}
            </div>
          </div>
          <button
            type="button"
            disabled={!link.stale}
            onClick={() => updateReference(link.id)}
            className="rounded bg-muted px-2 py-1 text-[11px] text-accent disabled:text-faint"
          >
            {link.stale ? "Update" : "OK"}
          </button>
        </div>
      ))}
    </div>
  );
}

function MateEditor() {
  const mates = useAssemblyStore((s) => s.mates);
  const selectedMateId = useAssemblyStore((s) => s.selectedMateId);
  const connectors = useAssemblyStore((s) => s.connectors);
  const instances = useAssemblyStore((s) => s.instances);
  const updateMateParams = useAssemblyStore((s) => s.updateMateParams);
  const suppressMate = useAssemblyStore((s) => s.suppressMate);
  const removeMate = useAssemblyStore((s) => s.removeMate);
  const activeTool = useAssemblyStore((s) => s.activeTool);
  const pendingConnectorId = useAssemblyStore((s) => s.pendingConnectorId);
  const clearPendingConnector = useAssemblyStore((s) => s.clearPendingConnector);

  const mate = mates.find((m) => m.id === selectedMateId) ?? mates[0];
  const def = mate ? MATE_CATALOG.find((m) => m.type === mate.type) : undefined;
  const implemented = mate ? IMPLEMENTED_MATES.has(mate.type) : false;
  const toolDef = MATE_CATALOG.find((m) => m.type === activeTool);

  const nameOf = (id: string) => {
    const c = connectors.find((x) => x.id === id);
    const inst = instances.find((i) => i.id === c?.instanceId);
    return c && inst ? `${inst.name} · ${c.name}` : id;
  };

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      {toolDef && (
        <div className="rounded border border-accent/50 bg-accent/10 p-2 text-[11px] text-accent">
          Creating <span className="font-medium">{toolDef.label}</span>
          {IMPLEMENTED_MATES.has(toolDef.type)
            ? " — click two mate connectors in the viewport."
            : " — UI scaffolding; solver not implemented."}
          {pendingConnectorId && (
            <button
              type="button"
              onClick={() => clearPendingConnector()}
              className="ml-2 text-amber-300 underline"
            >
              Clear first pick
            </button>
          )}
        </div>
      )}

      {!mate && (
        <p className="text-muted-foreground">
          Select a mate in the tree, or pick two connectors to create one.
        </p>
      )}

      {mate && def && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{mate.name}</div>
              <div className="text-[10px] text-faint">
                {def.label} · {def.dof}
              </div>
            </div>
            {implemented ? (
              <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[9px] text-emerald-300">
                Solved
              </span>
            ) : (
              <ScaffoldBadge />
            )}
          </div>
          <p className="text-[11px] text-faint">{mate.statusMessage}</p>
          <div className="text-[11px] text-muted-foreground">
            <div>A · {nameOf(mate.connectorAId)}</div>
            <div>B · {nameOf(mate.connectorBId)}</div>
          </div>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={mate.params.flipPrimary}
              onChange={(e) =>
                updateMateParams(mate.id, { flipPrimary: e.target.checked })
              }
              className="accent-accent"
            />
            Flip primary axis
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={mate.params.flipSecondary}
              onChange={(e) =>
                updateMateParams(mate.id, { flipSecondary: e.target.checked })
              }
              className="accent-accent"
            />
            Flip secondary axis
          </label>
          {(mate.type === "revolute" ||
            mate.type === "cylindrical" ||
            mate.type === "ball") && (
            <label className="block text-muted-foreground">
              Angle (°)
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={mate.params.angle}
                onChange={(e) =>
                  updateMateParams(mate.id, { angle: Number(e.target.value) })
                }
                className="mt-1 w-full accent-accent"
              />
              <input
                type="number"
                className={`${inputClass} mt-1`}
                value={mate.params.angle}
                onChange={(e) =>
                  updateMateParams(mate.id, { angle: Number(e.target.value) })
                }
              />
            </label>
          )}
          {(mate.type === "slider" ||
            mate.type === "cylindrical" ||
            mate.type === "pinSlot") && (
            <label className="block text-muted-foreground">
              Offset
              <input
                type="number"
                className={inputClass}
                value={mate.params.offset}
                onChange={(e) =>
                  updateMateParams(mate.id, { offset: Number(e.target.value) })
                }
              />
            </label>
          )}
          {mate.type === "width" && (
            <label className="block text-muted-foreground">
              Width
              <input
                type="number"
                className={inputClass}
                value={mate.params.width}
                onChange={(e) =>
                  updateMateParams(mate.id, { width: Number(e.target.value) })
                }
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={mate.suppressed}
              onChange={(e) => suppressMate(mate.id, e.target.checked)}
              className="accent-accent"
            />
            Suppress
          </label>
          <button
            type="button"
            onClick={() => removeMate(mate.id)}
            className="w-full rounded border border-rose-800 px-2 py-1 text-rose-300 hover:bg-rose-950/40"
          >
            Delete mate
          </button>
        </>
      )}
    </div>
  );
}

function RelationsPanel() {
  const relations = useAssemblyStore((s) => s.relations);
  const mates = useAssemblyStore((s) => s.mates);
  const addRelation = useAssemblyStore((s) => s.addRelation);
  const removeRelation = useAssemblyStore((s) => s.removeRelation);
  const revolutes = mates.filter((m) => m.type === "revolute");
  const sliders = mates.filter((m) => m.type === "slider");
  const [mateA, setMateA] = useState(revolutes[0]?.id ?? mates[0]?.id ?? "");
  const [mateB, setMateB] = useState(revolutes[1]?.id ?? mates[1]?.id ?? "");

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Gear, Rack and Pinion, Screw, and Linear relations couple existing mates.
        Solvers are scaffolded.
      </p>
      <label className="block text-muted-foreground">
        Mate A
        <select className={inputClass} value={mateA} onChange={(e) => setMateA(e.target.value)}>
          {mates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-muted-foreground">
        Mate B
        <select className={inputClass} value={mateB} onChange={(e) => setMateB(e.target.value)}>
          {mates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-1">
        {RELATION_CATALOG.map((rel) => (
          <button
            key={rel.type}
            type="button"
            disabled={!mateA || !mateB}
            onClick={() => addRelation(rel.type as RelationType, mateA, mateB)}
            className="rounded border border-border px-2 py-2 text-left hover:bg-hover disabled:opacity-40"
            title={rel.hint}
          >
            <div className="text-foreground">
              {rel.icon} {rel.label}
            </div>
            <ScaffoldBadge />
          </button>
        ))}
      </div>
      {relations.length === 0 && (
        <p className="text-faint">
          No relations yet.
          {revolutes.length < 2 && sliders.length < 1
            ? " Create mates first."
            : ""}
        </p>
      )}
      {relations.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded border border-border px-2 py-1.5"
        >
          <span className="text-foreground">{r.name}</span>
          <button
            type="button"
            onClick={() => removeRelation(r.id)}
            className="text-faint hover:text-rose-300"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function AssemblyToolsPanel() {
  const instances = useAssemblyStore((s) => s.instances);
  const selectedInstanceIds = useAssemblyStore((s) => s.selectedInstanceIds);
  const groupSelected = useAssemblyStore((s) => s.groupSelected);
  const groups = useAssemblyStore((s) => s.groups);
  const ungroup = useAssemblyStore((s) => s.ungroup);
  const replicateInstance = useAssemblyStore((s) => s.replicateInstance);
  const replaceInstance = useAssemblyStore((s) => s.replaceInstance);
  const linearPattern = useAssemblyStore((s) => s.linearPattern);
  const circularPattern = useAssemblyStore((s) => s.circularPattern);
  const mirrorInstance = useAssemblyStore((s) => s.mirrorInstance);
  const snapMode = useAssemblyStore((s) => s.snapMode);
  const showMatesMode = useAssemblyStore((s) => s.showMatesMode);
  const setSnapMode = useAssemblyStore((s) => s.setSnapMode);
  const setShowMatesMode = useAssemblyStore((s) => s.setShowMatesMode);

  const seedId = selectedInstanceIds[0] ?? instances[0]?.id ?? "";
  const [count, setCount] = useState(3);
  const [spacing, setSpacing] = useState(0.6);
  const [angle, setAngle] = useState(120);
  const [replaceDoc, setReplaceDoc] = useState(INSERTABLE_DOCUMENTS[3]?.id ?? "d-5");
  const axisY: Vec3 = [0, 1, 0];
  const axisX: Vec3 = [1, 0, 0];

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <div className="flex gap-2">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={snapMode}
            onChange={(e) => setSnapMode(e.target.checked)}
            className="accent-accent"
          />
          Snap Mode
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={showMatesMode}
            onChange={(e) => setShowMatesMode(e.target.checked)}
            className="accent-accent"
          />
          Show Mates Mode
        </label>
      </div>

      <button
        type="button"
        onClick={() => groupSelected()}
        className="w-full rounded bg-muted px-2 py-1.5 text-foreground hover:bg-hover"
      >
        Group selected ({selectedInstanceIds.length})
      </button>
      {groups.map((g) => (
        <div key={g.id} className="flex items-center justify-between text-muted-foreground">
          {g.name}
          <button type="button" onClick={() => ungroup(g.id)} className="text-accent">
            Ungroup
          </button>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <label className="text-muted-foreground">
          Count
          <input
            type="number"
            className={inputClass}
            min={2}
            max={12}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="text-muted-foreground">
          Spacing
          <input
            type="number"
            className={inputClass}
            step={0.1}
            value={spacing}
            onChange={(e) => setSpacing(Number(e.target.value))}
          />
        </label>
      </div>

      <ToolButton
        label="Replicate"
        hint="Copy instances along an offset"
        onClick={() => seedId && replicateInstance(seedId, count)}
      />
      <ToolButton
        label="Assembly Linear Pattern"
        hint="Pattern along X"
        onClick={() => seedId && linearPattern(seedId, count, spacing, axisX)}
      />
      <label className="text-muted-foreground">
        Circular angle (°)
        <input
          type="number"
          className={inputClass}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
        />
      </label>
      <ToolButton
        label="Assembly Circular Pattern"
        hint="Pattern about Y"
        onClick={() => seedId && circularPattern(seedId, count, angle, axisY)}
      />
      <ToolButton
        label="Assembly Mirror"
        hint="Mirror across YZ"
        onClick={() => seedId && mirrorInstance(seedId, axisX)}
      />

      <label className="block text-muted-foreground">
        Replace Instance with
        <select
          className={inputClass}
          value={replaceDoc}
          onChange={(e) => setReplaceDoc(e.target.value)}
        >
          {INSERTABLE_DOCUMENTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!seedId}
        onClick={() => seedId && replaceInstance(seedId, replaceDoc)}
        className="w-full rounded bg-accent px-2 py-1.5 text-accent-foreground hover:bg-accent disabled:opacity-40"
      >
        Replace Instance
      </button>
    </div>
  );
}

function ToolButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded border border-border px-2 py-1.5 text-left hover:bg-hover"
    >
      <span>
        <span className="text-foreground">{label}</span>
        <span className="ml-2 text-[10px] text-faint">{hint}</span>
      </span>
      <ScaffoldBadge />
    </button>
  );
}

function NamedPositionsPanel() {
  const namedPositions = useAssemblyStore((s) => s.namedPositions);
  const activeNamedPositionId = useAssemblyStore((s) => s.activeNamedPositionId);
  const addNamedPosition = useAssemblyStore((s) => s.addNamedPosition);
  const applyNamedPosition = useAssemblyStore((s) => s.applyNamedPosition);
  const removeNamedPosition = useAssemblyStore((s) => s.removeNamedPosition);
  const [name, setName] = useState("Position");

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Capture mate angles and offsets, then restore them as a named pose.
      </p>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => addNamedPosition(name || "Position")}
          className="rounded bg-accent px-2 py-1 text-accent-foreground"
        >
          Save
        </button>
      </div>
      {namedPositions.map((p) => (
        <div
          key={p.id}
          className={`rounded border px-2 py-2 ${
            activeNamedPositionId === p.id
              ? "border-accent bg-active"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => applyNamedPosition(p.id)}
              className="text-left text-foreground"
            >
              {p.name}
            </button>
            <button
              type="button"
              onClick={() => removeNamedPosition(p.id)}
              className="text-faint hover:text-rose-300"
            >
              ×
            </button>
          </div>
          <div className="text-[10px] text-faint">{p.description}</div>
        </div>
      ))}
    </div>
  );
}

function DisplayStatesPanel() {
  const displayStates = useAssemblyStore((s) => s.displayStates);
  const activeDisplayStateId = useAssemblyStore((s) => s.activeDisplayStateId);
  const addDisplayState = useAssemblyStore((s) => s.addDisplayState);
  const applyDisplayState = useAssemblyStore((s) => s.applyDisplayState);
  const updateDisplayOverride = useAssemblyStore((s) => s.updateDisplayOverride);
  const instances = useAssemblyStore((s) => s.instances);
  const [name, setName] = useState("Display state");
  const active = displayStates.find((d) => d.id === activeDisplayStateId);

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Visibility, opacity, and color overrides that do not affect mates.
      </p>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => addDisplayState(name || "Display state")}
          className="rounded bg-accent px-2 py-1 text-accent-foreground"
        >
          Save
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {displayStates.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => applyDisplayState(d.id)}
            className={`rounded px-2 py-1 ${
              d.id === activeDisplayStateId
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>
      {active &&
        instances.map((inst) => {
          const ov = active.overrides.find((o) => o.instanceId === inst.id);
          if (!ov) return null;
          return (
            <div key={inst.id} className="rounded border border-border p-2">
              <div className="mb-1 text-foreground">{inst.name}</div>
              <label className="mr-3 inline-flex items-center gap-1 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={ov.visible}
                  onChange={(e) =>
                    updateDisplayOverride(active.id, inst.id, {
                      visible: e.target.checked,
                    })
                  }
                  className="accent-accent"
                />
                Visible
              </label>
              <label className="inline-flex items-center gap-1 text-muted-foreground">
                Opacity
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={ov.opacity}
                  onChange={(e) =>
                    updateDisplayOverride(active.id, inst.id, {
                      opacity: Number(e.target.value),
                    })
                  }
                  className="accent-accent"
                />
              </label>
            </div>
          );
        })}
    </div>
  );
}

function ExplodedViewsPanel() {
  const explodedViews = useAssemblyStore((s) => s.explodedViews);
  const activeExplodedViewId = useAssemblyStore((s) => s.activeExplodedViewId);
  const explodeAmount = useAssemblyStore((s) => s.explodeAmount);
  const addExplodedView = useAssemblyStore((s) => s.addExplodedView);
  const setActiveExplodedView = useAssemblyStore((s) => s.setActiveExplodedView);
  const setExplodeAmount = useAssemblyStore((s) => s.setExplodeAmount);
  const [name, setName] = useState("Exploded view");

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Offset ungrounded instances along explode steps. Visual only — mates stay solved.
      </p>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => addExplodedView(name || "Exploded view")}
          className="rounded bg-accent px-2 py-1 text-accent-foreground"
        >
          Create
        </button>
      </div>
      {explodedViews.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() =>
            setActiveExplodedView(activeExplodedViewId === v.id ? null : v.id)
          }
          className={`block w-full rounded border px-2 py-2 text-left ${
            activeExplodedViewId === v.id
              ? "border-accent bg-active"
              : "border-border"
          }`}
        >
          {v.name} · {v.steps.length} steps
        </button>
      ))}
      <label className="block text-muted-foreground">
        Explode amount
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explodeAmount}
          onChange={(e) => setExplodeAmount(Number(e.target.value))}
          className="mt-1 w-full accent-accent"
        />
      </label>
    </div>
  );
}

function InContextPanel() {
  const instances = useAssemblyStore((s) => s.instances);
  const selectedInstanceIds = useAssemblyStore((s) => s.selectedInstanceIds);
  const inContextStudios = useAssemblyStore((s) => s.inContextStudios);
  const createPartStudioInContext = useAssemblyStore(
    (s) => s.createPartStudioInContext,
  );
  const [name, setName] = useState("In-context Part Studio");
  const ids = selectedInstanceIds.length > 0 ? selectedInstanceIds : instances.map((i) => i.id);

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Create a part studio that references assembly geometry. Downstream features
        update when the assembly rebuilds.
      </p>
      <input
        className={inputClass}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground">
        Context instances: {ids.length === 0 ? "none selected (will use all)" : ids.length}
      </p>
      <button
        type="button"
        onClick={() => createPartStudioInContext(name || "In-context Part Studio", ids)}
        className="w-full rounded bg-accent px-2 py-1.5 text-accent-foreground hover:bg-accent"
      >
        Create Part Studio in Context
      </button>
      {inContextStudios.map((s) => (
        <div key={s.id} className="rounded border border-border px-2 py-2">
          <div className="flex items-center justify-between text-foreground">
            {s.name}
            <ScaffoldBadge />
          </div>
          <div className="text-[10px] text-faint">
            {s.sourceInstanceIds.length} references ·{" "}
            {s.updateOnRebuild ? "updates on rebuild" : "frozen"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MateToolbar({
  compact,
}: {
  compact?: boolean;
}) {
  const activeTool = useAssemblyStore((s) => s.activeTool);
  const setActiveTool = useAssemblyStore((s) => s.setActiveTool);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {MATE_CATALOG.map((mate) => {
        const implemented = IMPLEMENTED_MATES.has(mate.type);
        return (
        <button
          key={mate.type}
          type="button"
          disabled={!implemented}
          aria-disabled={!implemented}
          title={
            implemented
              ? `${mate.label} — ${mate.hint}`
              : `${mate.label} (not implemented)`
          }
          onClick={() => {
            if (!implemented) return;
            setActiveTool(mate.type as MateType);
          }}
          className={`rounded px-2 py-1 text-xs ${
            !implemented
              ? "cursor-not-allowed opacity-45 text-faint"
              : activeTool === mate.type
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-hover hover:text-accent"
          }`}
        >
          {compact ? mate.icon : mate.label}
        </button>
        );
      })}
    </div>
  );
}
