import { useCallback, useState } from "react";
import { DocumentsPage } from "./components/documents/DocumentsPage";
import { AppLayout, type WorkspaceTab } from "./components/layout/AppLayout";
import { ReleaseManagement } from "./components/pdm/ReleaseManagement";
import { VersionManager } from "./components/pdm/VersionManager";

type AppRoute = "documents" | "workspace" | "versions" | "releases";

const INITIAL_TABS: WorkspaceTab[] = [
  { id: "d-2", title: "Drive Assembly", kind: "assembly", dirty: true },
  { id: "d-1", title: "Bracket Plate", kind: "part" },
  { id: "d-cam", title: "Bracket CAM Studio", kind: "cam" },
  { id: "d-sim", title: "Bracket Simulation Studio", kind: "simulation" },
  { id: "d-render", title: "Bracket Render Studio", kind: "render" },
  { id: "d-pcb", title: "Main Board PCB Studio", kind: "pcb" },
];

export default function App() {
  const [route, setRoute] = useState<AppRoute>("documents");
  const [tabs, setTabs] = useState<WorkspaceTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("d-2");
  const [projectId, setProjectId] = useState<string | null>(null);

  const onProjectReady = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  function openDocument(documentId: string) {
    const catalog: Record<string, WorkspaceTab> = {
      "d-1": { id: "d-1", title: "Bracket Plate", kind: "part" },
      "d-2": { id: "d-2", title: "Drive Assembly", kind: "assembly" },
      "d-3": { id: "d-3", title: "Housing A Drawing", kind: "drawing" },
      "d-4": { id: "d-4", title: "Shaft Collar", kind: "part" },
      "d-5": { id: "d-5", title: "PCB Frame", kind: "part" },
      "d-cam": { id: "d-cam", title: "Bracket CAM Studio", kind: "cam" },
      "d-sim": {
        id: "d-sim",
        title: "Bracket Simulation Studio",
        kind: "simulation",
      },
      "d-render": {
        id: "d-render",
        title: "Bracket Render Studio",
        kind: "render",
      },
      "d-pcb": {
        id: "d-pcb",
        title: "Main Board PCB Studio",
        kind: "pcb",
      },
    };
    const tab = catalog[documentId] ?? {
      id: documentId,
      title: `Document ${documentId}`,
      kind: "part" as const,
    };

    setTabs((prev) =>
      prev.some((t) => t.id === tab.id) ? prev : [...prev, tab],
    );
    setActiveTabId(tab.id);
    setRoute("workspace");
  }

  function closeTab(tabId: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (next.length === 0) {
        setRoute("documents");
        return next;
      }
      if (activeTabId === tabId) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
  }

  if (route === "documents") {
    return (
      <DocumentsPage
        onOpenDocument={openDocument}
        onOpenVersions={() => setRoute("versions")}
        onOpenReleases={() => setRoute("releases")}
      />
    );
  }

  if (route === "versions") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PdmNav
          active="versions"
          onBack={() => setRoute("documents")}
          onVersions={() => setRoute("versions")}
          onReleases={() => setRoute("releases")}
        />
        <div className="min-h-0 flex-1">
          <VersionManager
            projectId={projectId}
            onProjectReady={onProjectReady}
          />
        </div>
      </div>
    );
  }

  if (route === "releases") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PdmNav
          active="releases"
          onBack={() => setRoute("documents")}
          onVersions={() => setRoute("versions")}
          onReleases={() => setRoute("releases")}
        />
        <div className="min-h-0 flex-1">
          <ReleaseManagement
            projectId={projectId}
            onProjectReady={onProjectReady}
          />
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={setActiveTabId}
      onCloseTab={closeTab}
      onBackToDocuments={() => setRoute("documents")}
      onOpenVersions={() => setRoute("versions")}
      onOpenReleases={() => setRoute("releases")}
    />
  );
}

function PdmNav({
  active,
  onBack,
  onVersions,
  onReleases,
}: {
  active: "versions" | "releases";
  onBack: () => void;
  onVersions: () => void;
  onReleases: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-3 py-1.5">
      <button
        type="button"
        onClick={onBack}
        className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
      >
        ← Documents
      </button>
      <button
        type="button"
        onClick={onVersions}
        className={`rounded px-2.5 py-1 text-[11px] font-medium ${
          active === "versions"
            ? "bg-active text-accent"
            : "text-muted-foreground hover:bg-hover hover:text-accent"
        }`}
      >
        Versions
      </button>
      <button
        type="button"
        onClick={onReleases}
        className={`rounded px-2.5 py-1 text-[11px] font-medium ${
          active === "releases"
            ? "bg-active text-accent"
            : "text-muted-foreground hover:bg-hover hover:text-accent"
        }`}
      >
        Releases
      </button>
    </div>
  );
}
