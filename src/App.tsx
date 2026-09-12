import { useState } from "react";
import { DocumentsPage } from "./components/documents/DocumentsPage";
import { AppLayout, type WorkspaceTab } from "./components/layout/AppLayout";

type AppRoute = "documents" | "workspace";

const INITIAL_TABS: WorkspaceTab[] = [
  { id: "d-2", title: "Drive Assembly", kind: "assembly", dirty: true },
  { id: "d-1", title: "Bracket Plate", kind: "part" },
];

export default function App() {
  const [route, setRoute] = useState<AppRoute>("documents");
  const [tabs, setTabs] = useState<WorkspaceTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("d-2");

  function openDocument(documentId: string) {
    const catalog: Record<string, WorkspaceTab> = {
      "d-1": { id: "d-1", title: "Bracket Plate", kind: "part" },
      "d-2": { id: "d-2", title: "Drive Assembly", kind: "assembly" },
      "d-3": { id: "d-3", title: "Housing A Drawing", kind: "drawing" },
      "d-4": { id: "d-4", title: "Shaft Collar", kind: "part" },
      "d-5": { id: "d-5", title: "PCB Frame", kind: "part" },
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
    return <DocumentsPage onOpenDocument={openDocument} />;
  }

  return (
    <AppLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={setActiveTabId}
      onCloseTab={closeTab}
      onBackToDocuments={() => setRoute("documents")}
    />
  );
}
