import { create } from "zustand";

export type StudioKind =
  | "part"
  | "assembly"
  | "drawing"
  | "cam"
  | "simulation"
  | "render"
  | "pcb";

export type ImportKind = "dxf" | "dwg" | "image";

export interface WorkspaceRecord {
  id: string;
  name: string;
  description: string;
  owner: string;
  modifiedAt: string;
  lastOpenedAt: string;
  starred: boolean;
  trashed: boolean;
}

export interface ImportRecord {
  id: string;
  name: string;
  kind: ImportKind;
  format: string;
  owner: string;
  modifiedAt: string;
  workspaceId: string | null;
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
    lastOpenedAt: "2026-09-13T18:04:00Z",
    starred: true,
    trashed: false,
  },
  {
    id: "ws-elec",
    name: "Electronics",
    description: "Board and enclosure",
    owner: "You",
    modifiedAt: "2026-09-12T16:35:00Z",
    lastOpenedAt: "2026-09-13T14:12:00Z",
    starred: true,
    trashed: false,
  },
  {
    id: "ws-jig",
    name: "Jig Library",
    description: "Shared fixture pack from A. Chen",
    owner: "A. Chen",
    modifiedAt: "2026-09-09T11:40:00Z",
    lastOpenedAt: "2026-09-10T08:15:00Z",
    starred: false,
    trashed: false,
  },
  {
    id: "ws-old",
    name: "Old Enclosure",
    description: "Superseded housing study",
    owner: "You",
    modifiedAt: "2026-08-22T09:00:00Z",
    lastOpenedAt: "2026-08-22T09:00:00Z",
    starred: false,
    trashed: true,
  },
];

const SAMPLE_IMPORTS: ImportRecord[] = [
  {
    id: "imp-1",
    name: "motor-mount.dxf",
    kind: "dxf",
    format: "DXF",
    owner: "You",
    modifiedAt: "2026-09-12T10:18:00Z",
    workspaceId: "ws-drive",
  },
  {
    id: "imp-2",
    name: "housing-rev3.dwg",
    kind: "dwg",
    format: "DWG",
    owner: "You",
    modifiedAt: "2026-09-11T15:02:00Z",
    workspaceId: "ws-drive",
  },
  {
    id: "imp-3",
    name: "datum-photo.png",
    kind: "image",
    format: "PNG",
    owner: "M. Ortiz",
    modifiedAt: "2026-09-08T19:44:00Z",
    workspaceId: "ws-elec",
  },
  {
    id: "imp-4",
    name: "scan-reference.jpg",
    kind: "image",
    format: "JPEG",
    owner: "You",
    modifiedAt: "2026-09-07T12:30:00Z",
    workspaceId: null,
  },
];

const SAMPLE_FOLDERS: FolderNode[] = [
  { id: "f-root", workspaceId: "ws-drive", name: "Workspace", parentId: null },
  { id: "f-mech", workspaceId: "ws-drive", name: "Mechanical", parentId: "f-root" },
  { id: "f-proto", workspaceId: "ws-drive", name: "Prototypes", parentId: "f-mech" },
  { id: "f-rel", workspaceId: "ws-drive", name: "Release Candidates", parentId: "f-mech" },
  { id: "f-elec-root", workspaceId: "ws-elec", name: "Workspace", parentId: null },
  { id: "f-elec", workspaceId: "ws-elec", name: "Boards", parentId: "f-elec-root" },
  { id: "f-jig-root", workspaceId: "ws-jig", name: "Workspace", parentId: null },
  { id: "f-old-root", workspaceId: "ws-old", name: "Workspace", parentId: null },
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
  {
    id: "d-jig",
    workspaceId: "ws-jig",
    name: "Drill Jig Plate",
    kind: "part",
    folderId: "f-jig-root",
    labels: ["Released"],
    modifiedAt: "2026-09-09T11:40:00Z",
    owner: "A. Chen",
  },
  {
    id: "d-jig-assy",
    workspaceId: "ws-jig",
    name: "Fixture Assembly",
    kind: "assembly",
    folderId: "f-jig-root",
    labels: ["Released"],
    modifiedAt: "2026-09-09T11:38:00Z",
    owner: "A. Chen",
    children: ["d-jig"],
  },
];

const SAMPLE_LABELS = ["WIP", "Released", "Critical", "Aluminum", "Plastic"];

interface CatalogState {
  source: CatalogSource;
  workspaces: WorkspaceRecord[];
  folders: FolderNode[];
  documents: CadDocument[];
  imports: ImportRecord[];
  labels: string[];
  selectedWorkspaceId: string | null;
  selectedFolderId: string;
  loadSample: () => void;
  clear: () => void;
  selectWorkspace: (id: string | null) => void;
  selectFolder: (id: string) => void;
  createWorkspace: (name?: string) => WorkspaceRecord;
  toggleStar: (id: string) => void;
  trashWorkspace: (id: string) => void;
  restoreWorkspace: (id: string) => void;
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
  imports: [],
  labels: [],
  selectedWorkspaceId: null,
  selectedFolderId: "f-root",

  loadSample: () =>
    set({
      source: "sample",
      workspaces: SAMPLE_WORKSPACES,
      folders: SAMPLE_FOLDERS,
      documents: SAMPLE_DOCUMENTS,
      imports: SAMPLE_IMPORTS,
      labels: SAMPLE_LABELS,
      selectedWorkspaceId: null,
      selectedFolderId: "f-root",
    }),

  clear: () =>
    set({
      source: "empty",
      workspaces: [],
      folders: [],
      documents: [],
      imports: [],
      labels: [],
      selectedWorkspaceId: null,
      selectedFolderId: "f-root",
    }),

  selectWorkspace: (id) => {
    if (!id) {
      set({ selectedWorkspaceId: null, selectedFolderId: "f-root" });
      return;
    }
    const folders = get().folders.filter((f) => f.workspaceId === id);
    const root = folders.find((f) => f.parentId === null);
    set((s) => ({
      selectedWorkspaceId: id,
      selectedFolderId: root?.id ?? "f-root",
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, lastOpenedAt: nowIso() } : w,
      ),
    }));
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
      lastOpenedAt: nowIso(),
      starred: true,
      trashed: false,
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

  toggleStar: (id) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, starred: !w.starred } : w,
      ),
    })),

  trashWorkspace: (id) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, trashed: true, starred: false } : w,
      ),
      selectedWorkspaceId:
        s.selectedWorkspaceId === id ? null : s.selectedWorkspaceId,
    })),

  restoreWorkspace: (id) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, trashed: false } : w,
      ),
    })),

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
