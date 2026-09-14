import { useCallback, useState } from "react";
import {
  DocumentsPage,
  type OpenDocumentRequest,
} from "./components/documents/DocumentsPage";
import { WorkspacesPage } from "./components/documents/WorkspacesPage";
import { AppLayout, type WorkspaceTab } from "./components/layout/AppLayout";
import { ReleaseManagement } from "./components/pdm/ReleaseManagement";
import { VersionManager } from "./components/pdm/VersionManager";
import { useCatalogStore, type StudioKind } from "./store/catalogStore";

type AppRoute = "workspaces" | "documents" | "studio" | "versions" | "releases";

const INITIAL_TABS: WorkspaceTab[] = [];

export default function App() {
  const [route, setRoute] = useState<AppRoute>("workspaces");
  const [tabs, setTabs] = useState<WorkspaceTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const selectedWorkspaceId = useCatalogStore((s) => s.selectedWorkspaceId);
  const workspaceName =
    useCatalogStore((s) =>
      s.workspaces.find((w) => w.id === s.selectedWorkspaceId),
    )?.name ?? "Workspace";

  const onProjectReady = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  function openDocument(request: OpenDocumentRequest | string) {
    const catalog = useCatalogStore.getState();
    const fromStore =
      typeof request === "string"
        ? catalog.documents.find((d) => d.id === request)
        : catalog.documents.find((d) => d.id === request.id);

    const tab: WorkspaceTab = fromStore
      ? { id: fromStore.id, title: fromStore.name, kind: fromStore.kind }
      : typeof request === "string"
        ? { id: request, title: `Document ${request}`, kind: "part" }
        : {
            id: request.id,
            title: request.title,
            kind: request.kind,
          };

    setTabs((prev) =>
      prev.some((t) => t.id === tab.id) ? prev : [...prev, tab],
    );
    setActiveTabId(tab.id);
    setRoute("studio");
  }

  function createAndOpen(kind: StudioKind, label?: string) {
    const doc = useCatalogStore.getState().createDocument(kind, label);
    openDocument({ id: doc.id, title: doc.name, kind: doc.kind });
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

  if (route === "workspaces") {
    return (
      <WorkspacesPage
        onOpenWorkspace={() => setRoute("documents")}
        onOpenVersions={() => setRoute("versions")}
        onOpenReleases={() => setRoute("releases")}
      />
    );
  }

  if (route === "documents" && !selectedWorkspaceId) {
    return (
      <WorkspacesPage
        onOpenWorkspace={() => setRoute("documents")}
        onOpenVersions={() => setRoute("versions")}
        onOpenReleases={() => setRoute("releases")}
      />
    );
  }

  if (route === "documents") {
    return (
      <DocumentsPage
        onOpenDocument={openDocument}
        onBackToWorkspaces={() => setRoute("workspaces")}
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
          onBack={() =>
            setRoute(selectedWorkspaceId ? "documents" : "workspaces")
          }
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
          onBack={() =>
            setRoute(selectedWorkspaceId ? "documents" : "workspaces")
          }
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
      workspaceName={workspaceName}
      onSelectTab={setActiveTabId}
      onCloseTab={closeTab}
      onBackToDocuments={() => setRoute("documents")}
      onBackToWorkspaces={() => setRoute("workspaces")}
      onOpenVersions={() => setRoute("versions")}
      onOpenReleases={() => setRoute("releases")}
      onCreateDocument={createAndOpen}
      onOpenCatalogDocument={openDocument}
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
        ← Back
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
