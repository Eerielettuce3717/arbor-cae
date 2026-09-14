import { useCallback, useState, type ReactNode } from "react";
import { ActivityView } from "./components/dashboard/ActivityView";
import { AnalyticsView } from "./components/dashboard/AnalyticsView";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ProfileView } from "./components/dashboard/ProfileView";
import { SettingsView } from "./components/dashboard/SettingsView";
import {
  WorkspaceView,
  type OpenStudioRequest,
} from "./components/dashboard/WorkspaceView";
import {
  AppLayout,
  type AppSurface,
  type ShellNavId,
  type WorkspaceTab,
} from "./components/layout/AppLayout";
import { ReleaseManagement } from "./components/pdm/ReleaseManagement";
import { VersionManager } from "./components/pdm/VersionManager";
import { useCatalogStore, type StudioKind } from "./store/catalogStore";

type AppRoute =
  | "dashboard"
  | "workspace"
  | "activity"
  | "analytics"
  | "settings"
  | "profile"
  | "studio"
  | "versions"
  | "releases";

const INITIAL_TABS: WorkspaceTab[] = [];

export default function App() {
  const [route, setRoute] = useState<AppRoute>("dashboard");
  const [tabs, setTabs] = useState<WorkspaceTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const selectedWorkspaceId = useCatalogStore((s) => s.selectedWorkspaceId);
  const selectWorkspace = useCatalogStore((s) => s.selectWorkspace);
  const workspaceName =
    useCatalogStore((s) =>
      s.workspaces.find((w) => w.id === s.selectedWorkspaceId),
    )?.name ?? "Workspace";

  const onProjectReady = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  function openDocument(request: OpenStudioRequest | string) {
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
        setRoute(selectedWorkspaceId ? "workspace" : "dashboard");
        return next;
      }
      if (activeTabId === tabId) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
  }

  function goDashboard() {
    selectWorkspace(null);
    setRoute("dashboard");
  }

  function openWorkspace(id: string) {
    selectWorkspace(id);
    setRoute("workspace");
  }

  function onNavigate(id: ShellNavId) {
    if (id === "dashboard") {
      goDashboard();
      return;
    }
    setRoute(id);
  }

  function backFromPdm() {
    if (selectedWorkspaceId) setRoute("workspace");
    else setRoute("dashboard");
  }

  const surface: AppSurface = route;

  const dashboardStage = (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className={`absolute inset-0 overflow-hidden transition-[translate] duration-300 ease-out motion-reduce:transition-none ${
          route === "workspace"
            ? "pointer-events-none -translate-x-full"
            : "translate-x-0"
        }`}
        aria-hidden={route === "workspace"}
        inert={route === "workspace"}
      >
        <Dashboard
          listed={route === "dashboard"}
          onOpenWorkspace={openWorkspace}
        />
      </div>
      <div
        className={`absolute inset-0 overflow-hidden transition-[translate] duration-300 ease-out motion-reduce:transition-none ${
          route === "workspace"
            ? "translate-x-0"
            : "pointer-events-none translate-x-full"
        }`}
        aria-hidden={route !== "workspace"}
        inert={route !== "workspace"}
      >
        <WorkspaceView
          listed={route === "workspace"}
          onBack={goDashboard}
          onOpenStudio={openDocument}
          onOpenVersions={() => setRoute("versions")}
          onOpenReleases={() => setRoute("releases")}
        />
      </div>
    </div>
  );

  let children: ReactNode = null;
  if (route === "dashboard" || route === "workspace") {
    children = dashboardStage;
  } else if (route === "activity") {
    children = <ActivityView />;
  } else if (route === "analytics") {
    children = <AnalyticsView />;
  } else if (route === "settings") {
    children = <SettingsView />;
  } else if (route === "profile") {
    children = <ProfileView />;
  } else if (route === "versions") {
    children = (
      <div className="flex h-full min-h-0 flex-col">
        <PdmNav
          active="versions"
          onBack={backFromPdm}
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
  } else if (route === "releases") {
    children = (
      <div className="flex h-full min-h-0 flex-col">
        <PdmNav
          active="releases"
          onBack={backFromPdm}
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
      surface={surface}
      onNavigate={onNavigate}
      tabs={tabs}
      activeTabId={activeTabId}
      workspaceName={workspaceName}
      onSelectTab={setActiveTabId}
      onCloseTab={closeTab}
      onBackToDocuments={() => setRoute("workspace")}
      onBackToWorkspaces={goDashboard}
      onOpenVersions={() => setRoute("versions")}
      onOpenReleases={() => setRoute("releases")}
      onCreateDocument={createAndOpen}
      onOpenCatalogDocument={openDocument}
    >
      {children}
    </AppLayout>
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
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
      <button
        type="button"
        onClick={onBack}
        className="border border-accent bg-active px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-accent-foreground"
      >
        ← Back to Dashboard
      </button>
      <button
        type="button"
        onClick={onVersions}
        className={`px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
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
        className={`px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
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
