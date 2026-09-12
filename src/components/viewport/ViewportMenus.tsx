import { useMemo, useState, type ReactNode } from "react";
import type {
  CameraMode,
  DisplayOverride,
  DisplayOverridesState,
  RenderOptionsState,
  ShadingMode,
  HiddenEdgesMode,
  TangentEdgesMode,
} from "./types";

interface ViewportMenusProps {
  cameraMode: CameraMode;
  renderOptions: RenderOptionsState;
  displayOverrides: DisplayOverridesState;
  onCameraMode: (mode: CameraMode) => void;
  onRenderOptions: (next: RenderOptionsState) => void;
  onDisplayOverride: (action: DisplayOverride) => void;
  onFitView: () => void;
}

type MenuId = "camera" | "render" | "display" | null;

export function ViewportMenus({
  cameraMode,
  renderOptions,
  displayOverrides,
  onCameraMode,
  onRenderOptions,
  onDisplayOverride,
  onFitView,
}: ViewportMenusProps) {
  const [open, setOpen] = useState<MenuId>(null);

  const cameraLabel = useMemo(() => {
    const labels: Record<CameraMode, string> = {
      perspective: "Perspective",
      isometric: "Isometric",
      dimetric: "Dimetric",
      trimetric: "Trimetric",
      "orient-sketch-plane": "Sketch Normal",
    };
    return labels[cameraMode];
  }, [cameraMode]);

  function toggle(id: MenuId) {
    setOpen((prev) => (prev === id ? null : id));
  }

  function setShading(shading: ShadingMode) {
    onRenderOptions({ ...renderOptions, shading });
  }

  function setHidden(hiddenEdges: HiddenEdgesMode) {
    onRenderOptions({ ...renderOptions, hiddenEdges });
  }

  function setTangent(tangentEdges: TangentEdgesMode) {
    onRenderOptions({ ...renderOptions, tangentEdges });
  }

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1.5">
      <MenuButton label="Camera" open={open === "camera"} onClick={() => toggle("camera")}>
        <MenuItem
          active={cameraMode === "isometric"}
          onClick={() => {
            onCameraMode("isometric");
            setOpen(null);
          }}
        >
          Isometric
        </MenuItem>
        <MenuItem
          active={cameraMode === "dimetric"}
          onClick={() => {
            onCameraMode("dimetric");
            setOpen(null);
          }}
        >
          Dimetric
        </MenuItem>
        <MenuItem
          active={cameraMode === "trimetric"}
          onClick={() => {
            onCameraMode("trimetric");
            setOpen(null);
          }}
        >
          Trimetric
        </MenuItem>
        <MenuItem
          active={cameraMode === "perspective"}
          onClick={() => {
            onCameraMode("perspective");
            setOpen(null);
          }}
        >
          Perspective
        </MenuItem>
        <div className="my-1 border-t border-eng-border" />
        <MenuItem
          active={cameraMode === "orient-sketch-plane"}
          onClick={() => {
            onCameraMode("orient-sketch-plane");
            setOpen(null);
          }}
        >
          Orient Normal to Sketch Plane
        </MenuItem>
        <MenuItem
          onClick={() => {
            onFitView();
            setOpen(null);
          }}
        >
          Fit to Model
        </MenuItem>
      </MenuButton>

      <MenuButton label="Render" open={open === "render"} onClick={() => toggle("render")}>
        <SectionLabel>Shading</SectionLabel>
        <MenuItem active={renderOptions.shading === "shaded"} onClick={() => setShading("shaded")}>
          Shaded
        </MenuItem>
        <MenuItem
          active={renderOptions.shading === "unshaded"}
          onClick={() => setShading("unshaded")}
        >
          Unshaded
        </MenuItem>
        <MenuItem
          active={renderOptions.shading === "translucent"}
          onClick={() => setShading("translucent")}
        >
          Translucent
        </MenuItem>

        <SectionLabel>Hidden Edges</SectionLabel>
        <MenuItem
          active={renderOptions.hiddenEdges === "visible"}
          onClick={() => setHidden("visible")}
        >
          Visible
        </MenuItem>
        <MenuItem
          active={renderOptions.hiddenEdges === "removed"}
          onClick={() => setHidden("removed")}
        >
          Removed
        </MenuItem>

        <SectionLabel>Tangent Edges</SectionLabel>
        <MenuItem
          active={renderOptions.tangentEdges === "visible"}
          onClick={() => setTangent("visible")}
        >
          Visible
        </MenuItem>
        <MenuItem
          active={renderOptions.tangentEdges === "phantom"}
          onClick={() => setTangent("phantom")}
        >
          Phantom
        </MenuItem>
        <MenuItem
          active={renderOptions.tangentEdges === "removed"}
          onClick={() => setTangent("removed")}
        >
          Removed
        </MenuItem>

        <div className="my-1 border-t border-eng-border" />
        <MenuItem
          active={renderOptions.highQuality}
          onClick={() =>
            onRenderOptions({
              ...renderOptions,
              highQuality: !renderOptions.highQuality,
            })
          }
        >
          View in High Quality
        </MenuItem>
        <MenuItem
          active={renderOptions.highlightBoundaryEdges}
          onClick={() =>
            onRenderOptions({
              ...renderOptions,
              highlightBoundaryEdges: !renderOptions.highlightBoundaryEdges,
            })
          }
        >
          Highlight Boundary Edges
        </MenuItem>
      </MenuButton>

      <MenuButton label="Display" open={open === "display"} onClick={() => toggle("display")}>
        <MenuItem onClick={() => onDisplayOverride("hide-show")}>
          Hide / Show
          {displayOverrides.hiddenIds.length > 0 && (
            <span className="ml-2 text-[10px] text-eng-faint">
              ({displayOverrides.hiddenIds.length} hidden)
            </span>
          )}
        </MenuItem>
        <MenuItem onClick={() => onDisplayOverride("isolate")}>
          Isolate
          {displayOverrides.isolatedIds && (
            <span className="ml-2 text-[10px] text-sky-400">on</span>
          )}
        </MenuItem>
        <MenuItem onClick={() => onDisplayOverride("make-transparent")}>
          Make Transparent
        </MenuItem>
        <MenuItem
          active={displayOverrides.sectionViewEnabled}
          onClick={() => onDisplayOverride("section-view")}
        >
          Section View
        </MenuItem>
      </MenuButton>

      <span className="ml-1 rounded border border-eng-border/80 bg-eng-panel/80 px-2 py-1 font-mono text-[10px] text-eng-muted">
        {cameraLabel} · {renderOptions.shading}
      </span>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-10 cursor-default"
          aria-label="Close menus"
          onClick={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function MenuButton({
  label,
  open,
  onClick,
  children,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative z-20">
      <button
        type="button"
        onClick={onClick}
        className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
          open
            ? "border-sky-600 bg-eng-active text-sky-300"
            : "border-eng-border bg-eng-panel/90 text-eng-text hover:border-slate-500 hover:bg-eng-hover"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span className="ml-1 text-[9px] text-eng-faint">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-eng-border bg-eng-elevated py-1 shadow-xl shadow-black/40"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center px-3 py-1.5 text-left text-[11px] ${
        active
          ? "bg-eng-active text-sky-300"
          : "text-eng-text hover:bg-eng-hover"
      }`}
    >
      <span
        className={`mr-2 w-3 text-center text-[10px] ${active ? "text-sky-400" : "text-transparent"}`}
      >
        ✓
      </span>
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pb-0.5 pt-2 text-[9px] font-semibold uppercase tracking-wider text-eng-faint">
      {children}
    </div>
  );
}
