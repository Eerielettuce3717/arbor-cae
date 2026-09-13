import type { ReactNode } from "react";
import { useRenderStore } from "../../store/renderStore";
import type {
  AppearanceCategory,
  RenderPanelId,
} from "../../store/renderTypes";

export function RenderSidePanel() {
  const activePanel = useRenderStore((s) => s.activePanel);
  const setActivePanel = useRenderStore((s) => s.setActivePanel);

  if (activePanel === "none") return null;

  return (
    <aside className="absolute bottom-12 right-3 top-3 z-20 flex w-[22rem] flex-col overflow-hidden rounded-md border border-border bg-card/95">
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
        {activePanel === "appearances" && <AppearancesLibrary />}
        {activePanel === "environments" && <EnvironmentsLibrary />}
        {activePanel === "axf" && <AxfPanel />}
        {activePanel === "volume" && <VolumePanel />}
        {activePanel === "lights" && <LightsPanel />}
        {activePanel === "camera" && <CameraPanel />}
      </div>
    </aside>
  );
}

function panelTitle(id: RenderPanelId): string {
  switch (id) {
    case "appearances":
      return "Appearances Library";
    case "environments":
      return "Environments Library";
    case "axf":
      return "AxF Appearance";
    case "volume":
      return "Volume";
    case "lights":
      return "Light";
    case "camera":
      return "Camera";
    default:
      return "Render";
  }
}

/** Appearances Library: Functions | Modifiers | Light Emission */
export function AppearancesLibrary() {
  const appearanceTab = useRenderStore((s) => s.appearanceTab);
  const setAppearanceTab = useRenderStore((s) => s.setAppearanceTab);
  const functions = useRenderStore((s) => s.functions);
  const modifiers = useRenderStore((s) => s.modifiers);
  const emissions = useRenderStore((s) => s.emissions);
  const selectedFunctionId = useRenderStore((s) => s.selectedFunctionId);
  const selectedEmissionId = useRenderStore((s) => s.selectedEmissionId);
  const selectFunction = useRenderStore((s) => s.selectFunction);
  const toggleModifier = useRenderStore((s) => s.toggleModifier);
  const updateModifier = useRenderStore((s) => s.updateModifier);
  const selectEmission = useRenderStore((s) => s.selectEmission);
  const activePbr = useRenderStore((s) => s.activePbr);
  const pushToRenderer = useRenderStore((s) => s.pushToRenderer);

  const tabs: { id: AppearanceCategory; label: string }[] = [
    { id: "functions", label: "Functions" },
    { id: "modifiers", label: "Modifiers" },
    { id: "lightEmission", label: "Light Emission" },
  ];

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="PBR map" />
      <div className="flex gap-1 rounded border border-border bg-background p-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAppearanceTab(t.id)}
            className={`flex-1 rounded px-2 py-1 text-[10px] font-medium ${
              appearanceTab === t.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {appearanceTab === "functions" && (
        <div className="space-y-1.5">
          {functions.map((fn) => (
            <button
              key={fn.id}
              type="button"
              onClick={() => selectFunction(fn.id)}
              className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left ${
                selectedFunctionId === fn.id
                  ? "border-accent bg-accent/15"
                  : "border-border hover:bg-hover"
              }`}
            >
              <span
                className="h-5 w-5 shrink-0 rounded border border-border"
                style={{ background: fn.baseColor }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{fn.name}</span>
                <span className="text-[10px] text-faint">
                  {fn.kind} · m={fn.metalness} r={fn.roughness}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {appearanceTab === "modifiers" && (
        <div className="space-y-2">
          {modifiers.map((mod) => (
            <div
              key={mod.id}
              className="space-y-1.5 rounded border border-border bg-background/50 p-2"
            >
              <label className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{mod.name}</span>
                <input
                  type="checkbox"
                  checked={mod.enabled}
                  onChange={(e) => toggleModifier(mod.id, e.target.checked)}
                />
              </label>
              {mod.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Strength"
                    value={mod.strength}
                    step={0.05}
                    min={0}
                    max={1}
                    onChange={(v) => updateModifier(mod.id, { strength: v })}
                  />
                  <NumField
                    label="Secondary"
                    value={mod.secondary}
                    step={0.05}
                    onChange={(v) => updateModifier(mod.id, { secondary: v })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {appearanceTab === "lightEmission" && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => selectEmission(null)}
            className={`w-full rounded border px-2 py-1.5 text-left ${
              selectedEmissionId == null
                ? "border-accent bg-accent/15"
                : "border-border hover:bg-hover"
            }`}
          >
            None
          </button>
          {emissions.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => selectEmission(em.id)}
              className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left ${
                selectedEmissionId === em.id
                  ? "border-accent bg-accent/15"
                  : "border-border hover:bg-hover"
              }`}
            >
              <span
                className="h-5 w-5 shrink-0 rounded border border-border"
                style={{ background: em.emissiveColor }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{em.name}</span>
                <span className="text-[10px] text-faint">
                  {em.temperatureK} K · I={em.intensity}
                  {em.castLight ? " · casts light" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <PbrPreview pbr={activePbr} />
      <ActionBtn label="Push to WebGL binder" primary onClick={pushToRenderer} />
    </div>
  );
}

/** Environments Library */
export function EnvironmentsLibrary() {
  const environments = useRenderStore((s) => s.environments);
  const activeEnvironmentId = useRenderStore((s) => s.activeEnvironmentId);
  const selectEnvironment = useRenderStore((s) => s.selectEnvironment);
  const updateEnvironment = useRenderStore((s) => s.updateEnvironment);
  const active = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="IBL / HDRI" />
      <div className="space-y-1.5">
        {environments.map((env) => (
          <button
            key={env.id}
            type="button"
            onClick={() => selectEnvironment(env.id)}
            className={`w-full rounded border px-2 py-1.5 text-left ${
              activeEnvironmentId === env.id
                ? "border-accent bg-accent/15"
                : "border-border hover:bg-hover"
            }`}
          >
            <span className="block text-foreground">{env.name}</span>
            <span className="text-[10px] text-faint">
              {env.kind} · {env.mapRef}
            </span>
          </button>
        ))}
      </div>
      {active && (
        <div className="space-y-2 rounded border border-border bg-background/50 p-2">
          <NumField
            label="Intensity"
            value={active.intensity}
            step={0.05}
            min={0}
            max={5}
            onChange={(v) =>
              updateEnvironment(active.id, { intensity: v })
            }
          />
          <NumField
            label="Rotation (°)"
            value={active.rotationDeg}
            onChange={(v) =>
              updateEnvironment(active.id, { rotationDeg: v })
            }
          />
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={active.backgroundVisible}
              onChange={(e) =>
                updateEnvironment(active.id, {
                  backgroundVisible: e.target.checked,
                })
              }
            />
            Show as background
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={active.groundShadow}
              onChange={(e) =>
                updateEnvironment(active.id, {
                  groundShadow: e.target.checked,
                })
              }
            />
            Ground shadow
          </label>
        </div>
      )}
    </div>
  );
}

function AxfPanel() {
  const axf = useRenderStore((s) => s.axf);
  const updateAxf = useRenderStore((s) => s.updateAxf);
  const recomputePbr = useRenderStore((s) => s.recomputePbr);
  const pushToRenderer = useRenderStore((s) => s.pushToRenderer);

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="AxF" />
      <Field label="Name">
        <input
          className={inputClass}
          value={axf.name}
          onChange={(e) => updateAxf({ name: e.target.value })}
        />
      </Field>
      <Field label="File ref">
        <input
          className={inputClass}
          value={axf.fileRef}
          onChange={(e) => updateAxf({ fileRef: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Scale"
          value={axf.scale}
          step={0.01}
          onChange={(v) => updateAxf({ scale: v })}
        />
        <NumField
          label="Rotation (°)"
          value={axf.rotationDeg}
          onChange={(v) => updateAxf({ rotationDeg: v })}
        />
      </div>
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={axf.useSpectral}
          onChange={(e) => updateAxf({ useSpectral: e.target.checked })}
        />
        Spectral AxF
      </label>
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={axf.previewSrgb}
          onChange={(e) => updateAxf({ previewSrgb: e.target.checked })}
        />
        Preview in sRGB
      </label>
      <p className="text-[11px] text-faint">
        AxF id is attached to the PBR bag (`axfId`) for a future measured-BRDF
        binder — not decoded in this UI scaffold.
      </p>
      <div className="flex gap-1.5">
        <ActionBtn label="Apply to PBR" onClick={recomputePbr} />
        <ActionBtn label="Push uniforms" primary onClick={pushToRenderer} />
      </div>
    </div>
  );
}

function VolumePanel() {
  const volume = useRenderStore((s) => s.volume);
  const updateVolume = useRenderStore((s) => s.updateVolume);
  const recomputePbr = useRenderStore((s) => s.recomputePbr);

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="Volume" />
      <Field label="Name">
        <input
          className={inputClass}
          value={volume.name}
          onChange={(e) => updateVolume({ name: e.target.value })}
        />
      </Field>
      <NumField
        label="Density"
        value={volume.density}
        step={0.01}
        min={0}
        onChange={(v) => updateVolume({ density: v })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Absorption">
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-border bg-background"
            value={volume.absorptionColor}
            onChange={(e) => updateVolume({ absorptionColor: e.target.value })}
          />
        </Field>
        <Field label="Scattering">
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-border bg-background"
            value={volume.scatteringColor}
            onChange={(e) => updateVolume({ scatteringColor: e.target.value })}
          />
        </Field>
      </div>
      <NumField
        label="Anisotropy"
        value={volume.anisotropy}
        step={0.05}
        min={-1}
        max={1}
        onChange={(v) => updateVolume({ anisotropy: v })}
      />
      <NumField
        label="Step size"
        value={volume.stepSize}
        step={0.01}
        min={0.001}
        onChange={(v) => updateVolume({ stepSize: v })}
      />
      <ActionBtn label="Map → PBR thickness / volumeId" onClick={recomputePbr} />
    </div>
  );
}

function LightsPanel() {
  const lights = useRenderStore((s) => s.lights);
  const updateLight = useRenderStore((s) => s.updateLight);

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="Light" />
      {lights.map((light) => (
        <div
          key={light.id}
          className="space-y-2 rounded border border-border bg-background/50 p-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{light.name}</span>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={light.enabled}
                onChange={(e) =>
                  updateLight(light.id, { enabled: e.target.checked })
                }
              />
              On
            </label>
          </div>
          <Field label="Kind">
            <select
              className={inputClass}
              value={light.kind}
              onChange={(e) =>
                updateLight(light.id, {
                  kind: e.target.value as typeof light.kind,
                })
              }
            >
              <option value="directional">Directional</option>
              <option value="point">Point</option>
              <option value="spot">Spot</option>
              <option value="area">Area</option>
              <option value="ibl">IBL</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Color">
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-border bg-background"
                value={light.color}
                onChange={(e) =>
                  updateLight(light.id, { color: e.target.value })
                }
              />
            </Field>
            <NumField
              label="Intensity"
              value={light.intensity}
              step={0.05}
              onChange={(v) => updateLight(light.id, { intensity: v })}
            />
          </div>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={light.castShadow}
              onChange={(e) =>
                updateLight(light.id, { castShadow: e.target.checked })
              }
            />
            Cast shadow
          </label>
        </div>
      ))}
    </div>
  );
}

function CameraPanel() {
  return (
    <div className="space-y-3">
      <ScaffoldBadge />
      <p className="text-[11px] leading-relaxed text-faint">
        Camera framing for Render Studio graphics area. Perspective / ortho and
        exposure controls will bind to the WebGL viewport host.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="FOV (°)" value={45} onChange={() => undefined} />
        <NumField label="Exposure" value={1} step={0.05} onChange={() => undefined} />
      </div>
    </div>
  );
}

function PbrPreview({
  pbr,
}: {
  pbr: {
    color: string;
    metalness: number;
    roughness: number;
    opacity: number;
    emissiveIntensity: number;
    clearcoat: number;
    transmission: number;
    envMapIntensity: number;
    axfId: string | null;
    volumeId: string | null;
  };
}) {
  return (
    <div className="rounded border border-border bg-background/70 p-2">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="h-6 w-6 rounded border border-border"
          style={{ background: pbr.color }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
          Mapped PBR
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
        <span>metal {pbr.metalness.toFixed(2)}</span>
        <span>rough {pbr.roughness.toFixed(2)}</span>
        <span>α {pbr.opacity.toFixed(2)}</span>
        <span>emit {pbr.emissiveIntensity.toFixed(2)}</span>
        <span>coat {pbr.clearcoat.toFixed(2)}</span>
        <span>trans {pbr.transmission.toFixed(2)}</span>
        <span>env {pbr.envMapIntensity.toFixed(2)}</span>
        <span>axf {pbr.axfId ? "yes" : "—"}</span>
        <span className="col-span-2">vol {pbr.volumeId ? "yes" : "—"}</span>
      </div>
    </div>
  );
}

function ScaffoldBadge({ label = "UI only" }: { label?: string }) {
  return (
    <span className="inline-flex rounded bg-active px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent/90">
      {label}
    </span>
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
