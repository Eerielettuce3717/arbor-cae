import { create } from "zustand";

export type StudioKind =
  | "part"
  | "assembly"
  | "drawing"
  | "cam"
  | "simulation"
  | "render"
  | "pcb";

export interface WorkspaceRecord {
  id: string;
  name: string;
  description: string;
  owner: string;
  modifiedAt: string;
}

export interface FolderNode {
  id: string;
  workspaceId: string;
  name: string;
  parentId: string | null;
}

export interface CadDocument {
  id: string;
  workspaceId: string;
  name: string;
  kind: StudioKind;
  folderId: string;
  labels: string[];
  modifiedAt: string;
  owner: string;
  children?: string[];
}

export type CatalogSource = "empty" | "sample" | "pdm";

const KIND_LABEL: Record<StudioKind, string> = {
  part: "Part Studio",
  assembly: "Assembly",
  drawing: "Drawing",
  cam: "CAM Studio",
  simulation: "Simulation Studio",
  render: "Render Studio",
  pcb: "PCB Studio",
};

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const SAMPLE_WORKSPACES: WorkspaceRecord[] = [
  {
    id: "ws-drive",
    name: "Drive System",
    description: "Mechanical drive, CAM, and drawings",
    owner: "You",
    modifiedAt: "2026-09-12T16:22:00Z",
  },
  {
    id: "ws-elec",
    name: "Electronics",
    description: "Board and enclosure",
    owner: "You",
    modifiedAt: "2026-09-12T16:35:00Z",
  },
];

const SAMPLE_FOLDERS: FolderNode[] = [
  { id: "f-root", workspaceId: "ws-drive", name: "Workspace", parentId: null },
  { id: "f-mech", workspaceId: "ws-drive", name: "Mechanical", parentId: "f-root" },
  { id: "f-proto", workspaceId: "ws-drive", name: "Prototypes", parentId: "f-mech" },
  { id: "f-rel", workspaceId: "ws-drive", name: "Release Candidates", parentId: "f-mech" },
  { id: "f-elec-root", workspaceId: "ws-elec", name: "Workspace", parentId: null },
  { id: "f-elec", workspaceId: "ws-elec", name: "Boards", parentId: "f-elec-root" },
];

const SAMPLE_DOCUMENTS: CadDocument[] = [
  {
    id: "d-1",
    workspaceId: "ws-drive",
    name: "Bracket Plate",
    kind: "part",
    folderId: "f-proto",
    labels: ["WIP", "Aluminum"],
    modifiedAt: "2026-09-11T18:22:00Z",
    owner: "You",
  },
  {
    id: "d-2",
    workspaceId: "ws-drive",
    name: "Drive Assembly",
    kind: "assembly",
    folderId: "f-mech",
    labels: ["Critical"],
    modifiedAt: "2026-09-10T09:05:00Z",
    owner: "You",
    children: ["d-1", "d-4"],
  },
  {
    id: "d-3",
    workspaceId: "ws-drive",
    name: "Housing A Drawing",
    kind: "drawing",
    folderId: "f-rel",
    labels: ["Released"],
    modifiedAt: "2026-09-08T14:40:00Z",
    owner: "A. Chen",
  },
  {
    id: "d-4",
    workspaceId: "ws-drive",
    name: "Shaft Collar",
    kind: "part",
    folderId: "f-proto",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T08:12:00Z",
    owner: "You",
  },
  {
    id: "d-cam",
    workspaceId: "ws-drive",
    name: "Bracket CAM Studio",
    kind: "cam",
    folderId: "f-proto",
    labels: ["WIP", "Aluminum"],
    modifiedAt: "2026-09-12T16:00:00Z",
    owner: "You",
  },
  {
    id: "d-sim",
    workspaceId: "ws-drive",
    name: "Bracket Simulation Studio",
    kind: "simulation",
    folderId: "f-proto",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T16:20:00Z",
    owner: "You",
  },
  {
    id: "d-render",
    workspaceId: "ws-drive",
    name: "Bracket Render Studio",
    kind: "render",
    folderId: "f-proto",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T16:22:00Z",
    owner: "You",
  },
  {
    id: "d-5",
    workspaceId: "ws-elec",
    name: "PCB Frame",
    kind: "part",
    folderId: "f-elec",
    labels: ["Plastic"],
    modifiedAt: "2026-09-07T16:00:00Z",
    owner: "M. Ortiz",
  },
  {
    id: "d-pcb",
    workspaceId: "ws-elec",
    name: "Main Board PCB Studio",
    kind: "pcb",
    folderId: "f-elec",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T16:35:00Z",
    owner: "You",
  },
];

const SAMPLE_LABELS = ["WIP", "Released", "Critical", "Aluminum", "Plastic"];

interface CatalogState {
  source: CatalogSource;
  workspaces: WorkspaceRecord[];
  folders: FolderNode[];
  documents: CadDocument[];
  labels: string[];
  selectedWorkspaceId: string | null;
  selectedFolderId: string;
  loadSample: () => void;
  clear: () => void;
  selectWorkspace: (id: string | null) => void;
  selectFolder: (id: string) => void;
  createWorkspace: (name?: string) => WorkspaceRecord;
  createDocument: (
    kind: StudioKind,
    label?: string,
    workspaceId?: string,
  ) => CadDocument;
  createFolder: (name?: string) => FolderNode;
  documentsInWorkspace: (workspaceId: string) => CadDocument[];
  insertableInWorkspace: (workspaceId: string) => CadDocument[];
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  source: "empty",
  workspaces: [],
  folders: [],
  documents: [],
  labels: [],
  selectedWorkspaceId: null,
  selectedFolderId: "f-root",

  loadSample: () =>
    set({
      source: "sample",
      workspaces: SAMPLE_WORKSPACES,
      folders: SAMPLE_FOLDERS,
      documents: SAMPLE_DOCUMENTS,
      labels: SAMPLE_LABELS,
      selectedWorkspaceId: "ws-drive",
      selectedFolderId: "f-root",
    }),

  clear: () =>
    set({
      source: "empty",
      workspaces: [],
      folders: [],
      documents: [],
      labels: [],
      selectedWorkspaceId: null,
      selectedFolderId: "f-root",
    }),

  selectWorkspace: (id) => {
    const folders = get().folders.filter((f) => f.workspaceId === id);
    const root = folders.find((f) => f.parentId === null);
    set({
      selectedWorkspaceId: id,
      selectedFolderId: root?.id ?? "f-root",
    });
  },

  selectFolder: (id) => set({ selectedFolderId: id }),

  createWorkspace: (name) => {
    const id = uid("ws");
    const created: WorkspaceRecord = {
      id,
      name: name ?? `Workspace ${get().workspaces.length + 1}`,
      description: "Local workspace",
      owner: "You",
      modifiedAt: nowIso(),
    };
    const root: FolderNode = {
      id: uid("f"),
      workspaceId: id,
      name: "Workspace",
      parentId: null,
    };
    set((s) => ({
      source: s.source === "empty" ? "sample" : s.source,
      workspaces: [...s.workspaces, created],
      folders: [...s.folders, root],
      selectedWorkspaceId: id,
      selectedFolderId: root.id,
    }));
    return created;
  },

  createDocument: (kind, label, workspaceId) => {
    const s = get();
    let wsId = workspaceId ?? s.selectedWorkspaceId;
    if (!wsId) {
      wsId = get().createWorkspace("Untitled Workspace").id;
    }
    const folders = get().folders.filter((f) => f.workspaceId === wsId);
    const folderId = folders.some((f) => f.id === get().selectedFolderId)
      ? get().selectedFolderId
      : (folders.find((f) => f.parentId === null)?.id ?? uid("f"));
    const docs = get().documents.filter((d) => d.workspaceId === wsId);
    const created: CadDocument = {
      id: uid("d"),
      workspaceId: wsId,
      name: `${label ?? KIND_LABEL[kind]} ${docs.filter((d) => d.kind === kind).length + 1}`,
      kind,
      folderId,
      labels: ["Local"],
      modifiedAt: nowIso(),
      owner: "You",
    };
    set((state) => ({
      source: state.source === "empty" ? "sample" : state.source,
      documents: [...state.documents, created],
      labels: state.labels.includes("Local")
        ? state.labels
        : [...state.labels, "Local"],
      selectedWorkspaceId: wsId,
    }));
    return created;
  },

  createFolder: (name) => {
    const s = get();
    let wsId = s.selectedWorkspaceId;
    if (!wsId) {
      wsId = get().createWorkspace("Untitled Workspace").id;
    }
    const folders = get().folders.filter((f) => f.workspaceId === wsId);
    const parentId =
      folders.some((f) => f.id === get().selectedFolderId)
        ? get().selectedFolderId
        : (folders.find((f) => f.parentId === null)?.id ?? null);
    const created: FolderNode = {
      id: uid("f"),
      workspaceId: wsId,
      name: name ?? `Folder ${folders.length}`,
      parentId,
    };
    set((state) => ({ folders: [...state.folders, created] }));
    return created;
  },

  documentsInWorkspace: (workspaceId) =>
    get().documents.filter((d) => d.workspaceId === workspaceId),

  insertableInWorkspace: (workspaceId) =>
    get().documents.filter(
      (d) =>
        d.workspaceId === workspaceId &&
        (d.kind === "part" || d.kind === "assembly"),
    ),
}));

export const STUDIO_KIND_LABEL = KIND_LABEL;
