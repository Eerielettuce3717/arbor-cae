import type { ReactNode } from "react";
import { useRenderStore } from "../../store/renderStore";

/** Scene List for Render Studio (left document panel). */
export function RenderSceneList() {
  const sceneNodes = useRenderStore((s) => s.sceneNodes);
  const selectedNodeId = useRenderStore((s) => s.selectedNodeId);
  const selectNode = useRenderStore((s) => s.selectNode);
  const setNodeVisible = useRenderStore((s) => s.setNodeVisible);
  const setActivePanel = useRenderStore((s) => s.setActivePanel);
  const setActiveTool = useRenderStore((s) => s.setActiveTool);
  const lights = useRenderStore((s) => s.lights);
  const environments = useRenderStore((s) => s.environments);
  const activeEnvironmentId = useRenderStore((s) => s.activeEnvironmentId);

  const roots = sceneNodes.filter((n) => n.parentId === null);
  const childrenOf = (id: string) =>
    sceneNodes.filter((n) => n.parentId === id);

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 text-[10px] text-faint">
        <span className="text-accent">Scene</span>
        <span>·</span>
        <span>
          {environments.find((e) => e.id === activeEnvironmentId)?.name ??
            "Env"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <Section label="Scene List">
          {roots.map((root) => (
            <div key={root.id}>
              <Row
                icon="◉"
                label={root.label}
                selected={selectedNodeId === root.id}
                onClick={() => selectNode(root.id)}
              />
              <div className="ml-3 border-l border-border/60 pl-1">
                {childrenOf(root.id).map((node) => (
                  <Row
                    key={node.id}
                    icon={
                      node.kind === "camera"
                        ? "◎"
                        : node.kind === "light"
                          ? "✦"
                          : "◇"
                    }
                    label={node.label}
                    selected={selectedNodeId === node.id}
                    badge={node.appearanceId ? "mat" : undefined}
                    visible={node.visible}
                    onToggleVisible={() =>
                      setNodeVisible(node.id, !node.visible)
                    }
                    onClick={() => {
                      selectNode(node.id);
                      if (node.kind === "part") {
                        setActivePanel("appearances");
                        setActiveTool("appearances");
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section label="Lights">
          {lights.map((light) => (
            <Row
              key={light.id}
              icon="✦"
              label={`${light.name}${light.enabled ? "" : " (off)"}`}
              selected={selectedNodeId === light.id}
              onClick={() => {
                selectNode(light.id);
                setActivePanel("lights");
                setActiveTool("lights");
              }}
            />
          ))}
        </Section>

        <Section label="Libraries">
          <Row
            icon="▤"
            label="Appearances"
            selected={selectedNodeId === "lib:appearances"}
            onClick={() => {
              selectNode("lib:appearances");
              setActivePanel("appearances");
              setActiveTool("appearances");
            }}
          />
          <Row
            icon="☁"
            label="Environments"
            selected={selectedNodeId === "lib:environments"}
            onClick={() => {
              selectNode("lib:environments");
              setActivePanel("environments");
              setActiveTool("environments");
            }}
          />
        </Section>
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
      <div className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
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
  badge,
  visible,
  onToggleVisible,
  onClick,
}: {
  icon: string;
  label: string;
  selected?: boolean;
  badge?: string;
  visible?: boolean;
  onToggleVisible?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex w-full items-center gap-1 rounded px-1 py-0.5 ${
        selected ? "bg-accent/20" : "hover:bg-hover"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-1.5 px-0.5 py-0.5 text-left text-muted-foreground hover:text-accent"
      >
        <span className="w-4 shrink-0 text-center text-[10px] opacity-70">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge && (
          <span className="shrink-0 rounded bg-active px-1 text-[9px] text-accent/80">
            {badge}
          </span>
        )}
      </button>
      {onToggleVisible && (
        <button
          type="button"
          title={visible ? "Hide" : "Show"}
          onClick={onToggleVisible}
          className="rounded px-1 text-[10px] text-faint hover:text-accent"
        >
          {visible === false ? "○" : "●"}
        </button>
      )}
    </div>
  );
}
