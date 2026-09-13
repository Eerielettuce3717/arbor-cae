import type { ReactNode } from "react";
import { useCamStore } from "../../store/camStore";
import { FACE_LABELS } from "../../store/camTypes";

export function CamTree() {
  const setups = useCamStore((s) => s.setups);
  const operations = useCamStore((s) => s.operations);
  const toolpaths = useCamStore((s) => s.toolpaths);
  const activeSetupId = useCamStore((s) => s.activeSetupId);
  const selectedNodeId = useCamStore((s) => s.selectedNodeId);
  const selectedFaceId = useCamStore((s) => s.selectedFaceId);
  const selectSetup = useCamStore((s) => s.selectSetup);
  const selectNode = useCamStore((s) => s.selectNode);
  const setActivePanel = useCamStore((s) => s.setActivePanel);
  const setActiveCamTool = useCamStore((s) => s.setActiveCamTool);

  const setup = setups.find((s) => s.id === activeSetupId) ?? setups[0];

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 text-[10px] text-faint">
        <span className="text-accent">{setup?.wcs.frame ?? "G54"}</span>
        <span>·</span>
        <span>{setup?.stock.material ?? "Stock"}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <Section label="Machine">
          <Row icon="⚙" label={setup?.machine ?? "Mill"} muted />
        </Section>

        <Section label="Setups">
          {setups.map((s) => (
            <div key={s.id}>
              <Row
                icon="▣"
                label={s.name}
                selected={selectedNodeId === s.id}
                onClick={() => {
                  selectSetup(s.id);
                  setActivePanel("setup");
                }}
              />
              <div className="ml-3 border-l border-border/60 pl-1">
                <Row
                  icon="□"
                  label={`Stock ${s.stock.size[0]}×${s.stock.size[1]}×${s.stock.size[2]}`}
                  selected={selectedNodeId === `${s.id}:stock`}
                  onClick={() => {
                    selectNode(`${s.id}:stock`);
                    setActivePanel("stock");
                    setActiveCamTool("stock");
                  }}
                />
                <Row
                  icon="+"
                  label={`WCS ${s.wcs.frame} @ (${s.wcs.origin.join(", ")})`}
                  selected={selectedNodeId === `${s.id}:wcs`}
                  onClick={() => {
                    selectNode(`${s.id}:wcs`);
                    setActivePanel("wcs");
                    setActiveCamTool("wcs");
                  }}
                />
              </div>
            </div>
          ))}
        </Section>

        <Section label="Operations">
          {operations.length === 0 && <Row icon="○" label="No operations" muted />}
          {operations.map((op) => (
            <Row
              key={op.id}
              icon="◈"
              label={op.name}
              selected={selectedNodeId === op.id}
              badge={op.faceId ? FACE_LABELS[op.faceId].split(" ")[0] : "face?"}
              onClick={() => {
                selectNode(op.id);
                setActivePanel("pocket");
                setActiveCamTool("pocket");
              }}
            />
          ))}
        </Section>

        <Section label="Toolpaths">
          {toolpaths.length === 0 && (
            <Row icon="○" label="No toolpaths yet" muted />
          )}
          {toolpaths.map((tp) => (
            <Row
              key={tp.id}
              icon="〰"
              label={`${tp.name} (${tp.xyPoints.length} pts)`}
              selected={selectedNodeId === tp.id}
              onClick={() => selectNode(tp.id)}
            />
          ))}
        </Section>

        {selectedFaceId && (
          <Section label="Selection">
            <Row
              icon="▸"
              label={FACE_LABELS[selectedFaceId]}
              selected
            />
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  selected,
  muted,
  badge,
  onClick,
}: {
  icon: string;
  label: string;
  selected?: boolean;
  muted?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left ${
        selected
          ? "bg-accent/15 text-accent"
          : muted
            ? "text-faint"
            : "text-muted-foreground hover:bg-hover hover:text-accent"
      }`}
    >
      <span className="w-3 shrink-0 text-center text-[10px] opacity-70">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && (
        <span className="rounded bg-active px-1 text-[9px] text-faint">
          {badge}
        </span>
      )}
    </button>
  );
}
