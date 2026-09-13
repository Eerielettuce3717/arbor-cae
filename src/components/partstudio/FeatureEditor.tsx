import { useMemo, useState, type ReactNode } from "react";
import { useFeatureStore } from "../../store/featureStore";
import {
  EVALUATED_FEATURE_TOOLS,
  FEATURE_CATEGORIES,
  FEATURE_TOOL_BY_TYPE,
  FEATURE_TOOL_CATALOG,
  ONSHAPE_MATERIAL_LIBRARY,
  SCULPT_FEATURE_TOOLS,
  type CadFeature,
  type FeatureFieldDef,
  type FeatureToolType,
} from "../../store/featureTypes";

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-0.5 flex items-baseline justify-between gap-2">
      <label className="text-[11px] font-medium text-muted-foreground">{children}</label>
      {hint && <span className="text-[9px] text-faint">{hint}</span>}
    </div>
  );
}

function ScaffoldBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-faint">
      UI only
    </span>
  );
}

function ParamField({
  field,
  value,
  onChange,
  evaluated,
}: {
  field: FeatureFieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  evaluated: boolean;
}) {
  const scaffold = field.scaffold && !evaluated;
  const inputClass =
    "w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground";

  if (field.kind === "boolean") {
    return (
      <div className="mb-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="accent-accent"
          />
          {field.label}
          <ScaffoldBadge show={scaffold} />
        </label>
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <div className="mb-2">
        <FieldLabel hint={scaffold ? "UI only" : field.unit}>{field.label}</FieldLabel>
        <select
          className={inputClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === "color") {
    return (
      <div className="mb-2">
        <FieldLabel>{field.label}</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? "#8b949e")}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
          />
          <input
            type="text"
            className={inputClass}
            value={String(value ?? "")}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (field.kind === "table") {
    return null; // handled by dedicated panels
  }

  if (field.kind === "number") {
    return (
      <div className="mb-2">
        <FieldLabel hint={scaffold ? "UI only" : field.unit}>{field.label}</FieldLabel>
        <input
          type="number"
          className={inputClass}
          value={typeof value === "number" ? value : Number(value) || 0}
          min={field.min}
          max={field.max}
          step={field.step ?? 0.1}
          onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
        />
      </div>
    );
  }

  // text / entity
  return (
    <div className="mb-2">
      <FieldLabel hint={scaffold ? "UI only" : field.kind === "entity" ? "entity id" : field.unit}>
        {field.label}
      </FieldLabel>
      <input
        type="text"
        className={inputClass}
        value={String(value ?? "")}
        placeholder={field.kind === "entity" ? "Select in viewport…" : undefined}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </div>
  );
}

function AppearancePanel() {
  const appearance = useFeatureStore((s) => s.appearance);
  const setAppearance = useFeatureStore((s) => s.setAppearance);

  return (
    <section className="mb-4 rounded border border-border bg-background/40 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
        Customizing Appearance
      </h3>
      <ParamField
        field={{ key: "name", label: "Appearance name", kind: "text" }}
        value={appearance.name}
        onChange={(_, v) => setAppearance({ name: String(v) })}
        evaluated
      />
      <ParamField
        field={{ key: "color", label: "Color", kind: "color" }}
        value={appearance.color}
        onChange={(_, v) => setAppearance({ color: String(v) })}
        evaluated
      />
      <ParamField
        field={{ key: "metalness", label: "Metalness", kind: "number", min: 0, max: 1, step: 0.05 }}
        value={appearance.metalness}
        onChange={(_, v) => setAppearance({ metalness: Number(v) })}
        evaluated
      />
      <ParamField
        field={{ key: "roughness", label: "Roughness", kind: "number", min: 0, max: 1, step: 0.05 }}
        value={appearance.roughness}
        onChange={(_, v) => setAppearance({ roughness: Number(v) })}
        evaluated
      />
      <ParamField
        field={{ key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }}
        value={appearance.opacity}
        onChange={(_, v) => setAppearance({ opacity: Number(v) })}
        evaluated
      />
      <div
        className="mt-2 h-10 rounded border border-border"
        style={{
          background: appearance.color,
          opacity: appearance.opacity,
        }}
        title="Preview swatch"
      />
    </section>
  );
}

function MaterialsPanel() {
  const materialId = useFeatureStore((s) => s.materialId);
  const setMaterialId = useFeatureStore((s) => s.setMaterialId);
  const material =
    ONSHAPE_MATERIAL_LIBRARY.find((m) => m.id === materialId) ??
    ONSHAPE_MATERIAL_LIBRARY[0];

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof ONSHAPE_MATERIAL_LIBRARY>();
    for (const m of ONSHAPE_MATERIAL_LIBRARY) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return map;
  }, []);

  return (
    <section className="mb-4 rounded border border-border bg-background/40 p-3">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
        Customizing Part Materials
      </h3>
      <p className="mb-2 text-[10px] text-faint">
        Onshape Material Library — density drives mass properties.
      </p>
      <FieldLabel>Library material</FieldLabel>
      <select
        className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
        value={materialId}
        onChange={(e) => setMaterialId(e.target.value)}
      >
        {[...byCategory.entries()].map(([category, mats]) => (
          <optgroup key={category} label={category}>
            {mats.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {material && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <dt className="text-faint">Library</dt>
          <dd>{material.library}</dd>
          <dt className="text-faint">Category</dt>
          <dd>{material.category}</dd>
          <dt className="text-faint">Density</dt>
          <dd>{material.density} kg/m³</dd>
          <dt className="text-faint">Description</dt>
          <dd className="col-span-1">{material.description}</dd>
        </dl>
      )}
    </section>
  );
}

function ConfigurationsPanel() {
  const configurations = useFeatureStore((s) => s.configurations);
  const setActiveConfiguration = useFeatureStore((s) => s.setActiveConfiguration);
  const upsertConfigVariable = useFeatureStore((s) => s.upsertConfigVariable);
  const setFeatureVisibility = useFeatureStore((s) => s.setFeatureVisibility);
  const [newVarName, setNewVarName] = useState("");

  return (
    <section className="mb-4 space-y-3 rounded border border-border bg-background/40 p-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-accent">
        Configurations
      </h3>

      {/* Variables */}
      <div>
        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Variables
        </h4>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-left text-faint">
              <th className="pb-1 font-medium">Name</th>
              <th className="pb-1 font-medium">Expression</th>
              <th className="pb-1 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {configurations.variables.map((v) => (
              <tr key={v.id} className="border-t border-border/50">
                <td className="py-1 text-foreground">{v.name}</td>
                <td className="py-1">
                  <input
                    className="w-full rounded border border-border bg-background px-1 py-0.5 text-foreground"
                    value={v.expression}
                    onChange={(e) =>
                      upsertConfigVariable({ ...v, expression: e.target.value })
                    }
                  />
                </td>
                <td className="py-1 text-muted-foreground">
                  {v.value} {v.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1 flex gap-1">
          <input
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
            placeholder="New variable name"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-accent"
            onClick={() => {
              if (!newVarName.trim()) return;
              upsertConfigVariable({
                id: `var_${Math.random().toString(36).slice(2, 8)}`,
                name: newVarName.trim(),
                expression: "0 mm",
                value: 0,
                unit: "mm",
              });
              setNewVarName("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Visibility */}
      <div>
        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Visibility
        </h4>
        <ul className="max-h-32 space-y-1 overflow-y-auto">
          {configurations.visibility.map((row) => (
            <li key={row.id}>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={row.visible}
                  onChange={(e) =>
                    setFeatureVisibility(row.featureId, e.target.checked)
                  }
                  className="accent-accent"
                />
                {row.featureName}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Configuration table */}
      <div>
        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tables
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-faint">
                {configurations.columns.map((col) => (
                  <th key={col.id} className="border-b border-border px-2 py-1 font-medium">
                    {col.name}
                  </th>
                ))}
                <th className="border-b border-border px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {configurations.rows.map((row) => {
                const active = configurations.activeConfigurationId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={active ? "bg-active/60" : "hover:bg-hover/40"}
                  >
                    <td className="px-2 py-1 text-foreground">{row.configurationName}</td>
                    {configurations.columns.slice(1).map((col) => (
                      <td key={col.id} className="px-2 py-1 text-muted-foreground">
                        {String(row.values[col.id] ?? "")}
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-accent hover:bg-hover"
                        }`}
                        onClick={() => setActiveConfiguration(row.id)}
                      >
                        {active ? "Active" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FeatureParamsForm({ feature }: { feature: CadFeature }) {
  const updateFeatureParams = useFeatureStore((s) => s.updateFeatureParams);
  const renameFeature = useFeatureStore((s) => s.renameFeature);
  const suppressFeature = useFeatureStore((s) => s.suppressFeature);
  const evaluateFeature = useFeatureStore((s) => s.evaluateFeature);
  const regenerating = useFeatureStore((s) => s.regenerating);
  const def = FEATURE_TOOL_BY_TYPE[feature.type];
  const isOcct = EVALUATED_FEATURE_TOOLS.has(feature.type);
  const isSculpt = SCULPT_FEATURE_TOOLS.has(feature.type);
  const evaluated = isOcct || isSculpt;

  if (!def) {
    return (
      <p className="text-xs text-muted-foreground">Unknown feature type: {feature.type}</p>
    );
  }

  const fields = def.fields.filter((f) => f.kind !== "table");

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <FieldLabel>Feature name</FieldLabel>
          <input
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            value={feature.name}
            onChange={(e) => renameFeature(feature.id, e.target.value)}
          />
        </div>
        <label className="mt-5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={feature.suppressed}
            onChange={(e) => suppressFeature(feature.id, e.target.checked)}
            className="accent-accent"
          />
          Suppress
        </label>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-faint">
          {def.category}
        </span>
        {isSculpt ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] text-accent">
            Form Workspace
          </span>
        ) : evaluated ? (
          <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[9px] text-emerald-300">
            Worker evaluated
          </span>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-faint">
            UI scaffolding
          </span>
        )}
      </div>

      {fields.map((field) => (
        <ParamField
          key={field.key}
          field={field}
          value={feature.params[field.key]}
          evaluated={evaluated}
          onChange={(key, value) => updateFeatureParams(feature.id, { [key]: value })}
        />
      ))}

      {evaluated && (
        <button
          type="button"
          disabled={regenerating || feature.suppressed}
          onClick={() => void evaluateFeature(feature.id)}
          className="mt-2 w-full rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent disabled:opacity-40"
        >
          {regenerating
            ? "Evaluating…"
            : isSculpt
              ? "Bake Catmull-Clark mesh"
              : "Evaluate in worker"}
        </button>
      )}
    </div>
  );
}

function InsertFeatureMenu({ onPick }: { onPick: (type: FeatureToolType) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return FEATURE_CATEGORIES.map((cat) => ({
      ...cat,
      tools: FEATURE_TOOL_CATALOG.filter(
        (t) =>
          t.category === cat.id &&
          (!q || t.label.toLowerCase().includes(q) || t.type.includes(q)),
      ),
    })).filter((g) => g.tools.length > 0);
  }, [filter]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
      >
        + Insert feature
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-72 overflow-hidden rounded-md border border-border bg-muted">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              placeholder="Search tools…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {grouped.map((group) => (
              <div key={group.id} className="mb-2">
                <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
                  {group.label}
                </div>
                {group.tools.map((tool) => {
                  const live = Boolean(tool.evaluated);
                  return (
                  <button
                    key={tool.type}
                    type="button"
                    disabled={!live}
                    aria-disabled={!live}
                    title={
                      live
                        ? tool.label
                        : `${tool.label} (not implemented in OCCT bridge)`
                    }
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                      live
                        ? "text-muted-foreground hover:bg-hover hover:text-accent"
                        : "cursor-not-allowed opacity-45 text-faint"
                    }`}
                    onClick={() => {
                      if (!live) return;
                      onPick(tool.type);
                      setOpen(false);
                      setFilter("");
                    }}
                  >
                    <span className="w-4 text-center text-[10px] text-faint">
                      {tool.icon}
                    </span>
                    <span className="flex-1">{tool.label}</span>
                    {live ? (
                      <span className="text-[9px] text-emerald-400">eval</span>
                    ) : (
                      <span className="text-[9px] text-faint">UI</span>
                    )}
                  </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FeatureEditor() {
  const editorOpen = useFeatureStore((s) => s.editorOpen);
  const closeEditor = useFeatureStore((s) => s.closeEditor);
  const selectedFeatureId = useFeatureStore((s) => s.selectedFeatureId);
  const features = useFeatureStore((s) => s.features);
  const addFeature = useFeatureStore((s) => s.addFeature);
  const selectFeature = useFeatureStore((s) => s.selectFeature);
  const lastError = useFeatureStore((s) => s.lastError);
  const [studioTab, setStudioTab] = useState<
    "feature" | "appearance" | "material" | "configuration"
  >("feature");

  const feature = features.find((f) => f.id === selectedFeatureId) ?? null;

  if (!editorOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-end bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Feature editor"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeEditor();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeEditor();
      }}
    >
      <div className="flex max-h-[calc(100%-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Feature Editor</h2>
            <p className="text-[10px] text-faint">
              {feature
                ? `${FEATURE_TOOL_BY_TYPE[feature.type]?.label ?? feature.type} properties`
                : "Studio settings"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InsertFeatureMenu
              onPick={(type) => {
                addFeature(type);
                setStudioTab("feature");
              }}
            />
            <button
              type="button"
              onClick={closeEditor}
              className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-hover hover:text-accent"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 border-b border-border px-2 py-1.5">
          {(
            [
              ["feature", "Feature"],
              ["appearance", "Appearance"],
              ["material", "Materials"],
              ["configuration", "Configs"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStudioTab(id)}
              className={`rounded px-2 py-1 text-[11px] ${
                studioTab === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-hover hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {studioTab === "appearance" && <AppearancePanel />}
          {studioTab === "material" && <MaterialsPanel />}
          {studioTab === "configuration" && <ConfigurationsPanel />}

          {studioTab === "feature" && (
            <>
              {feature?.type === "appearance" && <AppearancePanel />}
              {feature?.type === "partMaterial" && <MaterialsPanel />}
              {feature?.type === "configuration" && <ConfigurationsPanel />}

              {feature ? (
                <FeatureParamsForm feature={feature} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a feature in the tree, or insert one from the catalog.
                </p>
              )}

              {features.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
                    Tree selection
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {features.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => selectFeature(f.id)}
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          f.id === selectedFeatureId
                            ? "bg-active text-accent"
                            : "bg-muted text-muted-foreground hover:text-accent"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {lastError && (
            <p className="mt-3 rounded border border-rose-800 bg-rose-950/40 px-2 py-1.5 text-[11px] text-rose-300">
              {lastError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeatureEditor;
