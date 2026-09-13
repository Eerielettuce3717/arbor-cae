import { create } from "zustand";
import {
  composeWorld,
  identityMat4,
  invertRigid,
  makeFrame,
  frameToMat4,
  mat4ToFrame,
  measureMateResidual,
  mulMat4,
  reflectionMat4,
  rotationAboutAxisMat4,
  solveMateWorld,
  translationMat4,
  type Mat4,
  type Vec3,
} from "../assembly/mateMath";
import {
  DEFAULT_BOM_COLUMNS,
  DEFAULT_BOM_FORMATTING,
  DEFAULT_MATE_PARAMS,
  IMPLEMENTED_MATES,
  INSERTABLE_DOCUMENTS,
  MATE_CATALOG,
  defaultConnectorsForPrimitive,
  defaultNameForMate,
  type AssemblyInstance,
  type AssemblyMate,
  type AssemblyPattern,
  type AssemblyRelation,
  type AssemblyToolId,
  type BomColumn,
  type BomFormatting,
  type BomRow,
  type BomState,
  type BomTemplateId,
  type CatalogDocument,
  type DisplayState,
  type ExplodedView,
  type InContextPartStudio,
  type InstanceGroup,
  type LinkedDocument,
  type MateConnector,
  type MateParams,
  type MateType,
  type NamedPosition,
  type RelationType,
} from "./assemblyTypes";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function catalogById(id: string): CatalogDocument | undefined {
  return INSERTABLE_DOCUMENTS.find((d) => d.id === id);
}

function countOfMate(mates: AssemblyMate[], type: MateType): number {
  return mates.filter((m) => m.type === type).length + 1;
}

function buildBomRows(
  instances: AssemblyInstance[],
  templateId: BomTemplateId,
): BomRow[] {
  const visible = instances.filter((i) => !i.suppressed && !i.derived);
  if (templateId === "indented") {
    return visible.map((inst, i) => ({
      id: `bom_${inst.id}`,
      item: i + 1,
      instanceId: inst.id,
      partNumber: inst.partNumber,
      qty: 1,
      description: inst.documentName,
      material: catalogById(inst.documentId)?.material ?? "—",
      revision: inst.revision,
      massGrams: catalogById(inst.documentId)?.massGrams ?? 0,
      level: inst.kind === "assembly" ? 0 : inst.groupId ? 1 : 0,
      isAssembly: inst.kind === "assembly",
    }));
  }

  if (templateId === "topLevel") {
    return visible
      .filter((i) => i.kind === "assembly" || !i.groupId)
      .map((inst, i) => ({
        id: `bom_${inst.id}`,
        item: i + 1,
        instanceId: inst.id,
        partNumber: inst.partNumber,
        qty: 1,
        description: inst.documentName,
        material: catalogById(inst.documentId)?.material ?? "—",
        revision: inst.revision,
        massGrams: catalogById(inst.documentId)?.massGrams ?? 0,
        level: 0,
        isAssembly: inst.kind === "assembly",
      }));
  }

  const grouped = new Map<string, AssemblyInstance[]>();
  for (const inst of visible) {
    if (templateId === "flattened" && inst.kind === "assembly") continue;
    const key = inst.partNumber;
    const list = grouped.get(key) ?? [];
    list.push(inst);
    grouped.set(key, list);
  }

  let item = 1;
  const rows: BomRow[] = [];
  for (const [, list] of grouped) {
    const head = list[0];
    rows.push({
      id: `bom_${head.partNumber}`,
      item: item++,
      instanceId: head.id,
      partNumber: head.partNumber,
      qty: list.length,
      description: head.documentName,
      material: catalogById(head.documentId)?.material ?? "—",
      revision: head.revision,
      massGrams: (catalogById(head.documentId)?.massGrams ?? 0) * list.length,
      level: 0,
      isAssembly: head.kind === "assembly",
    });
  }
  return rows;
}

interface SeededAssembly {
  instances: AssemblyInstance[];
  connectors: MateConnector[];
  mates: AssemblyMate[];
  links: LinkedDocument[];
}

function seedDriveAssembly(): SeededAssembly {
  const bracketDoc = catalogById("d-1")!;
  const shaftDoc = catalogById("d-7")!;
  const collarDoc = catalogById("d-4")!;

  const linkBracket: LinkedDocument = {
    id: "lnk_brk",
    documentId: bracketDoc.id,
    documentName: bracketDoc.name,
    mode: "version",
    pinnedRevision: "V3",
    latestRevision: "V3",
    stale: false,
    linkedAt: Date.now() - 86400000,
  };
  const linkShaft: LinkedDocument = {
    id: "lnk_shf",
    documentId: shaftDoc.id,
    documentName: shaftDoc.name,
    mode: "version",
    pinnedRevision: "V1",
    latestRevision: "V1",
    stale: false,
    linkedAt: Date.now() - 43200000,
  };
  const linkCollar: LinkedDocument = {
    id: "lnk_clr",
    documentId: collarDoc.id,
    documentName: collarDoc.name,
    mode: "workspace",
    pinnedRevision: "V2",
    latestRevision: "V3",
    stale: true,
    linkedAt: Date.now() - 7200000,
  };

  const bracket: AssemblyInstance = {
    id: "inst_bracket",
    name: "Bracket Plate <1>",
    kind: "part",
    documentId: bracketDoc.id,
    documentName: bracketDoc.name,
    partNumber: bracketDoc.partNumber,
    configuration: "Default",
    linkId: linkBracket.id,
    revision: "V3",
    grounded: true,
    suppressed: false,
    visible: true,
    color: bracketDoc.color,
    opacity: 1,
    primitive: bracketDoc.primitive,
    worldTransform: identityMat4(),
    groupId: null,
    patternId: null,
    derived: false,
  };

  const shaft: AssemblyInstance = {
    id: "inst_shaft",
    name: "Drive Shaft <1>",
    kind: "part",
    documentId: shaftDoc.id,
    documentName: shaftDoc.name,
    partNumber: shaftDoc.partNumber,
    configuration: "Default",
    linkId: linkShaft.id,
    revision: "V1",
    grounded: false,
    suppressed: false,
    visible: true,
    color: shaftDoc.color,
    opacity: 1,
    primitive: shaftDoc.primitive,
    worldTransform: translationMat4([2.4, 0.7, 0]),
    groupId: null,
    patternId: null,
    derived: false,
  };

  const collar: AssemblyInstance = {
    id: "inst_collar",
    name: "Shaft Collar <1>",
    kind: "part",
    documentId: collarDoc.id,
    documentName: collarDoc.name,
    partNumber: collarDoc.partNumber,
    configuration: "Default",
    linkId: linkCollar.id,
    revision: "V2",
    grounded: false,
    suppressed: false,
    visible: true,
    color: collarDoc.color,
    opacity: 1,
    primitive: collarDoc.primitive,
    worldTransform: translationMat4([3.2, 0.4, 0.8]),
    groupId: null,
    patternId: null,
    derived: false,
  };

  const bracketConnectors = defaultConnectorsForPrimitive(
    bracket.id,
    bracket.primitive,
  );
  const hole = makeFrame([-0.55, 0.175, 0], [0, 1, 0], [1, 0, 0]);
  bracketConnectors.push({
    id: "mc_bracket_hole",
    name: "Hole 1",
    instanceId: bracket.id,
    local: frameToMat4(hole),
    implicit: false,
    ownerFace: "hole",
  });

  const shaftConnectors = defaultConnectorsForPrimitive(shaft.id, shaft.primitive);
  const collarConnectors = defaultConnectorsForPrimitive(
    collar.id,
    collar.primitive,
  );

  const shaftAxis = shaftConnectors.find((c) => c.name === "Axis")!;
  const collarAxis = collarConnectors.find((c) => c.name === "Axis")!;

  const revolute: AssemblyMate = {
    id: "mate_rev1",
    name: "Revolute 1",
    type: "revolute",
    connectorAId: "mc_bracket_hole",
    connectorBId: shaftAxis.id,
    instanceAId: bracket.id,
    instanceBId: shaft.id,
    params: { ...DEFAULT_MATE_PARAMS, angle: 0 },
    suppressed: false,
    status: "ok",
    statusMessage: "Solved · 1 rotational DOF",
  };

  const fastened: AssemblyMate = {
    id: "mate_fst1",
    name: "Fastened 1",
    type: "fastened",
    connectorAId: shaftAxis.id,
    connectorBId: collarAxis.id,
    instanceAId: shaft.id,
    instanceBId: collar.id,
    params: { ...DEFAULT_MATE_PARAMS },
    suppressed: false,
    status: "ok",
    statusMessage: "Solved · fully constrained",
  };

  const instances = [bracket, shaft, collar];
  const connectors = [...bracketConnectors, ...shaftConnectors, ...collarConnectors];
  const mates = [revolute, fastened];
  const solved = solveGraph(instances, connectors, mates);

  return {
    instances: solved,
    connectors,
    mates,
    links: [linkBracket, linkShaft, linkCollar],
  };
}

function connectorById(
  connectors: MateConnector[],
  id: string,
): MateConnector | undefined {
  return connectors.find((c) => c.id === id);
}

function solveGraph(
  instances: AssemblyInstance[],
  connectors: MateConnector[],
  mates: AssemblyMate[],
): AssemblyInstance[] {
  const byId = new Map(instances.map((i) => [i.id, { ...i }]));
  const solved = new Set(
    instances.filter((i) => i.grounded).map((i) => i.id),
  );
  if (solved.size === 0 && instances[0]) solved.add(instances[0].id);

  let guard = 0;
  let progressed = true;
  while (progressed && guard < instances.length + 2) {
    progressed = false;
    guard += 1;
    for (const mate of mates) {
      if (mate.suppressed) continue;
      if (!IMPLEMENTED_MATES.has(mate.type)) continue;
      const aSolved = solved.has(mate.instanceAId);
      const bSolved = solved.has(mate.instanceBId);
      if (aSolved === bSolved) continue;

      const movedId = aSolved ? mate.instanceBId : mate.instanceAId;
      const instA = byId.get(mate.instanceAId);
      const instB = byId.get(mate.instanceBId);
      const connA = connectorById(connectors, mate.connectorAId);
      const connB = connectorById(connectors, mate.connectorBId);
      if (!instA || !instB || !connA || !connB) continue;

      const kind = mate.type === "revolute" ? "revolute" : "fastened";
      const angle = (mate.params.angle * Math.PI) / 180;
      const options = {
        flipPrimary: mate.params.flipPrimary,
        flipSecondary: mate.params.flipSecondary,
        angle,
      };
      let nextWorld: Mat4;
      if (aSolved) {
        nextWorld = solveMateWorld(
          kind,
          instA.worldTransform,
          connA.local,
          connB.local,
          options,
        );
      } else {
        // T_A * C_A * F * Rz = T_B * C_B  ⇒  T_A = T_B * C_B * inv(F*Rz) * inv(C_A)
        const align = solveMateWorld(
          kind,
          identityMat4(),
          identityMat4(),
          identityMat4(),
          options,
        );
        nextWorld = mulMat4(
          mulMat4(
            mulMat4(instB.worldTransform, connB.local),
            invertRigid(align),
          ),
          invertRigid(connA.local),
        );
      }
      const moved = aSolved ? instB : instA;

      moved.worldTransform = nextWorld;
      byId.set(moved.id, moved);
      solved.add(movedId);
      progressed = true;
    }
  }

  return instances.map((i) => byId.get(i.id) ?? i);
}

function residualForMate(
  mate: AssemblyMate,
  instances: AssemblyInstance[],
  connectors: MateConnector[],
): string {
  const a = instances.find((i) => i.id === mate.instanceAId);
  const b = instances.find((i) => i.id === mate.instanceBId);
  const ca = connectorById(connectors, mate.connectorAId);
  const cb = connectorById(connectors, mate.connectorBId);
  if (!a || !b || !ca || !cb) return "Missing reference";
  const fa = mat4ToFrame(composeWorld(a.worldTransform, ca.local));
  const fb = mat4ToFrame(composeWorld(b.worldTransform, cb.local));
  const r = measureMateResidual(fa, fb);
  if (mate.type === "fastened") {
    return r.fastened
      ? "Solved · fully constrained"
      : `Unsolved · Δorigin ${r.originDistance.toFixed(3)}`;
  }
  if (mate.type === "revolute") {
    return r.revolute
      ? `Solved · θ ${mate.params.angle.toFixed(1)}°`
      : `Unsolved · Δorigin ${r.originDistance.toFixed(3)}`;
  }
  return "Scaffolded — solver not implemented";
}

const seed = seedDriveAssembly();

function emptyBom(): BomState {
  return {
    templateId: "standard",
    columns: DEFAULT_BOM_COLUMNS.map((c) => ({ ...c })),
    rows: [],
    formatting: { ...DEFAULT_BOM_FORMATTING },
    selectedRowId: null,
  };
}

function sampleAssemblySlice() {
  return {
    instances: seed.instances,
    connectors: seed.connectors,
    mates: seed.mates,
    relations: [] as AssemblyRelation[],
    groups: [] as InstanceGroup[],
    patterns: [] as AssemblyPattern[],
    links: seed.links,
    namedPositions: [
      {
        id: "pos_home",
        name: "Home",
        description: "Shaft at 0°",
        mateValues: {
          mate_rev1: { angle: 0, offset: 0 },
        },
      },
      {
        id: "pos_open",
        name: "Open",
        description: "Shaft rotated 90°",
        mateValues: {
          mate_rev1: { angle: 90, offset: 0 },
        },
      },
      {
        id: "pos_service",
        name: "Service",
        description: "Shaft rotated 180°",
        mateValues: {
          mate_rev1: { angle: 180, offset: 0 },
        },
      },
    ],
    activeNamedPositionId: "pos_home" as string | null,
    displayStates: [
      {
        id: "ds_default",
        name: "Default",
        overrides: seed.instances.map((i) => ({
          instanceId: i.id,
          visible: true,
          opacity: 1,
          color: null as string | null,
        })),
      },
      {
        id: "ds_transparent",
        name: "Transparent bracket",
        overrides: seed.instances.map((i) => ({
          instanceId: i.id,
          visible: true,
          opacity: i.id === "inst_bracket" ? 0.28 : 1,
          color: null as string | null,
        })),
      },
      {
        id: "ds_shaft_only",
        name: "Shaft only",
        overrides: seed.instances.map((i) => ({
          instanceId: i.id,
          visible: i.id !== "inst_bracket",
          opacity: 1,
          color: null as string | null,
        })),
      },
    ],
    activeDisplayStateId: "ds_default" as string | null,
    explodedViews: [
      {
        id: "exp_service",
        name: "Service explode",
        steps: [
          { instanceId: "inst_shaft", direction: [0, 1, 0] as Vec3, distance: 0.9 },
          { instanceId: "inst_collar", direction: [0, 1, 0] as Vec3, distance: 1.4 },
        ],
      },
    ],
    activeExplodedViewId: null as string | null,
    explodeAmount: 1,
    inContextStudios: [] as InContextPartStudio[],
    bom: {
      templateId: "standard" as const,
      columns: DEFAULT_BOM_COLUMNS.map((c) => ({ ...c })),
      rows: buildBomRows(seed.instances, "standard"),
      formatting: { ...DEFAULT_BOM_FORMATTING },
      selectedRowId: null as string | null,
    },
    selectedInstanceIds: [] as string[],
    selectedMateId: "mate_rev1" as string | null,
    selectedConnectorId: null as string | null,
    pendingConnectorId: null as string | null,
    activeTool: "fastened" as AssemblyToolId,
    activePanel: "none" as AssemblyPanelId,
    snapMode: true,
    showMatesMode: true,
    statusMessage: "Drive Assembly · Fastened + Revolute solvers active",
  };
}

export type AssemblyPanelId =
  | "none"
  | "insert"
  | "link"
  | "updateRefs"
  | "mate"
  | "relations"
  | "tools"
  | "namedPositions"
  | "displayStates"
  | "explodedViews"
  | "inContext"
  | "bom";

export interface AssemblyStoreState {
  instances: AssemblyInstance[];
  connectors: MateConnector[];
  mates: AssemblyMate[];
  relations: AssemblyRelation[];
  groups: InstanceGroup[];
  patterns: AssemblyPattern[];
  links: LinkedDocument[];
  namedPositions: NamedPosition[];
  activeNamedPositionId: string | null;
  displayStates: DisplayState[];
  activeDisplayStateId: string | null;
  explodedViews: ExplodedView[];
  activeExplodedViewId: string | null;
  explodeAmount: number;
  inContextStudios: InContextPartStudio[];
  bom: BomState;

  selectedInstanceIds: string[];
  selectedMateId: string | null;
  selectedConnectorId: string | null;
  pendingConnectorId: string | null;
  activeTool: AssemblyToolId;
  activePanel: AssemblyPanelId;
  snapMode: boolean;
  showMatesMode: boolean;
  statusMessage: string;

  setActiveTool: (tool: AssemblyToolId) => void;
  setActivePanel: (panel: AssemblyPanelId) => void;
  setStatus: (message: string) => void;
  /** Replace the workspace with the built-in drive-assembly sample. */
  loadSampleAssembly: () => void;
  selectInstances: (ids: string[]) => void;
  selectMate: (id: string | null) => void;
  selectConnector: (id: string | null) => void;

  insertDocument: (documentId: string) => string | null;
  linkDocument: (documentId: string, mode: LinkedDocument["mode"]) => string | null;
  unlinkDocument: (linkId: string) => void;
  updateReference: (linkId: string) => void;
  updateAllReferences: () => void;
  setLinkMode: (linkId: string, mode: LinkedDocument["mode"]) => void;

  setInstanceGrounded: (id: string, grounded: boolean) => void;
  setInstanceVisible: (id: string, visible: boolean) => void;
  setInstanceSuppressed: (id: string, suppressed: boolean) => void;
  renameInstance: (id: string, name: string) => void;
  removeInstance: (id: string) => void;
  replaceInstance: (id: string, documentId: string) => void;

  addMateConnector: (instanceId: string, name: string, origin: Vec3, zAxis: Vec3, xHint: Vec3) => string;
  pickConnector: (connectorId: string) => void;
  clearPendingConnector: () => void;

  addMate: (
    type: MateType,
    connectorAId: string,
    connectorBId: string,
  ) => string | null;
  updateMateParams: (id: string, patch: Partial<MateParams>) => void;
  suppressMate: (id: string, suppressed: boolean) => void;
  removeMate: (id: string) => void;
  solveAssembly: () => void;

  addRelation: (type: RelationType, mateAId: string, mateBId: string) => string;
  removeRelation: (id: string) => void;

  groupSelected: () => string | null;
  ungroup: (groupId: string) => void;
  setSnapMode: (on: boolean) => void;
  setShowMatesMode: (on: boolean) => void;
  replicateInstance: (instanceId: string, count: number) => void;
  linearPattern: (instanceId: string, count: number, spacing: number, axis: Vec3) => void;
  circularPattern: (instanceId: string, count: number, angle: number, axis: Vec3) => void;
  mirrorInstance: (instanceId: string, axis: Vec3) => void;

  addNamedPosition: (name: string) => string;
  applyNamedPosition: (id: string) => void;
  removeNamedPosition: (id: string) => void;

  addDisplayState: (name: string) => string;
  applyDisplayState: (id: string) => void;
  updateDisplayOverride: (
    stateId: string,
    instanceId: string,
    patch: Partial<DisplayState["overrides"][number]>,
  ) => void;

  addExplodedView: (name: string) => string;
  setActiveExplodedView: (id: string | null) => void;
  setExplodeAmount: (amount: number) => void;

  createPartStudioInContext: (name: string, instanceIds: string[]) => string;

  setBomTemplate: (id: BomTemplateId) => void;
  setBomFormatting: (patch: Partial<BomFormatting>) => void;
  setBomColumn: (columnId: BomColumn["id"], patch: Partial<BomColumn>) => void;
  selectBomRow: (id: string | null) => void;
  updateBomCell: (rowId: string, patch: Partial<BomRow>) => void;
  rebuildBom: () => void;
}

function applyToolSideEffects(
  tool: AssemblyToolId,
): Partial<Pick<AssemblyStoreState, "activePanel" | "snapMode" | "showMatesMode" | "statusMessage" | "pendingConnectorId">> {
  const mateTypes = new Set(MATE_CATALOG.map((m) => m.type));
  if (mateTypes.has(tool as MateType)) {
    const def = MATE_CATALOG.find((m) => m.type === tool);
    return {
      activePanel: "mate",
      snapMode: true,
      pendingConnectorId: null,
      statusMessage: `Mate · ${def?.label}: select two mate connectors`,
    };
  }
  switch (tool) {
    case "insert":
      return { activePanel: "insert", statusMessage: "Insert Parts and Assemblies" };
    case "link":
      return { activePanel: "link", statusMessage: "Linking Documents" };
    case "updateRefs":
      return { activePanel: "updateRefs", statusMessage: "Updating References" };
    case "group":
      return { activePanel: "tools", statusMessage: "Group selected instances" };
    case "snapMode":
      return { statusMessage: "Toggle snap mode" };
    case "showMates":
      return { statusMessage: "Toggle show mates mode" };
    case "replicate":
    case "replace":
    case "linearPattern":
    case "circularPattern":
    case "mirror":
      return { activePanel: "tools", statusMessage: `Assembly tool · ${tool}` };
    case "gear":
    case "rackAndPinion":
    case "screw":
    case "linear":
      return { activePanel: "relations", statusMessage: `Relation · ${tool}` };
    case "namedPositions":
      return { activePanel: "namedPositions", statusMessage: "Named Positions" };
    case "displayStates":
      return { activePanel: "displayStates", statusMessage: "Display States" };
    case "explodedViews":
      return { activePanel: "explodedViews", statusMessage: "Exploded Views" };
    case "inContext":
      return { activePanel: "inContext", statusMessage: "Create Part Studio in Context" };
    case "bom":
      return { activePanel: "bom", statusMessage: "Bill of Materials" };
    default:
      return {};
  }
}

export const useAssemblyStore = create<AssemblyStoreState>((set, get) => ({
  instances: [],
  connectors: [],
  mates: [],
  relations: [],
  groups: [],
  patterns: [],
  links: [],
  namedPositions: [],
  activeNamedPositionId: null,
  displayStates: [],
  activeDisplayStateId: null,
  explodedViews: [],
  activeExplodedViewId: null,
  explodeAmount: 1,
  inContextStudios: [],
  bom: emptyBom(),

  selectedInstanceIds: [],
  selectedMateId: null,
  selectedConnectorId: null,
  pendingConnectorId: null,
  activeTool: "insert",
  activePanel: "none",
  snapMode: true,
  showMatesMode: false,
  statusMessage: "Empty assembly — Insert a part or load the sample drive assembly.",

  loadSampleAssembly: () => {
    set({
      ...sampleAssemblySlice(),
    });
  },

  setActiveTool: (tool) => {
    const extras = applyToolSideEffects(tool);
    set((s) => {
      if (tool === "snapMode") {
        return {
          activeTool: tool,
          snapMode: !s.snapMode,
          statusMessage: !s.snapMode ? "Snap mode on" : "Snap mode off",
        };
      }
      if (tool === "showMates") {
        return {
          activeTool: tool,
          showMatesMode: !s.showMatesMode,
          statusMessage: !s.showMatesMode ? "Show mates on" : "Show mates off",
        };
      }
      return { activeTool: tool, ...extras };
    });
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setStatus: (message) => set({ statusMessage: message }),
  selectInstances: (ids) =>
    set({ selectedInstanceIds: ids, selectedMateId: null }),
  selectMate: (id) =>
    set({
      selectedMateId: id,
      activePanel: id ? "mate" : get().activePanel,
      selectedInstanceIds: [],
    }),
  selectConnector: (id) => set({ selectedConnectorId: id }),

  insertDocument: (documentId) => {
    const doc = catalogById(documentId);
    if (!doc) {
      set({ statusMessage: "Document not found" });
      return null;
    }
    const id = uid("inst");
    const sameCount =
      get().instances.filter((i) => i.documentId === documentId).length + 1;
    const offset = get().instances.length * 0.45;
    const instance: AssemblyInstance = {
      id,
      name: `${doc.name} <${sameCount}>`,
      kind: doc.kind,
      documentId: doc.id,
      documentName: doc.name,
      partNumber: doc.partNumber,
      configuration: "Default",
      linkId: null,
      revision: doc.revision,
      grounded: get().instances.length === 0,
      suppressed: false,
      visible: true,
      color: doc.color,
      opacity: 1,
      primitive: doc.primitive,
      worldTransform: translationMat4([offset, 0, 2.2]),
      groupId: null,
      patternId: null,
      derived: false,
    };
    const connectors = defaultConnectorsForPrimitive(id, doc.primitive);
    const existingLink = get().links.find((l) => l.documentId === doc.id);
    let linkId = existingLink?.id ?? null;
    const newLink: LinkedDocument | null = existingLink
      ? null
      : {
          id: uid("lnk"),
          documentId: doc.id,
          documentName: doc.name,
          mode: "version",
          pinnedRevision: doc.revision,
          latestRevision: doc.latestRevision,
          stale: doc.revision !== doc.latestRevision || doc.workspaceDirty,
          linkedAt: Date.now(),
        };
    if (newLink) linkId = newLink.id;
    instance.linkId = linkId;

    set((s) => {
      const instances = [...s.instances, instance];
      return {
        instances,
        connectors: [...s.connectors, ...connectors],
        links: newLink ? [...s.links, newLink] : s.links,
        selectedInstanceIds: [id],
        statusMessage: `Inserted ${doc.name} (${doc.kind})`,
        bom: {
          ...s.bom,
          rows: buildBomRows(instances, s.bom.templateId),
        },
      };
    });
    return id;
  },

  linkDocument: (documentId, mode) => {
    const doc = catalogById(documentId);
    if (!doc) return null;
    const existing = get().links.find((l) => l.documentId === documentId);
    if (existing) {
      set({
        statusMessage: `${doc.name} is already linked (${existing.mode})`,
        activePanel: "link",
      });
      return existing.id;
    }
    const link: LinkedDocument = {
      id: uid("lnk"),
      documentId: doc.id,
      documentName: doc.name,
      mode,
      pinnedRevision: mode === "version" ? doc.revision : doc.latestRevision,
      latestRevision: doc.latestRevision,
      stale: mode === "workspace" ? doc.workspaceDirty : doc.revision !== doc.latestRevision,
      linkedAt: Date.now(),
    };
    set((s) => ({
      links: [...s.links, link],
      activePanel: "link",
      statusMessage: `Linked ${doc.name} to ${mode === "version" ? link.pinnedRevision : "workspace"}`,
    }));
    return link.id;
  },

  unlinkDocument: (linkId) =>
    set((s) => ({
      links: s.links.filter((l) => l.id !== linkId),
      instances: s.instances.map((i) =>
        i.linkId === linkId ? { ...i, linkId: null } : i,
      ),
      statusMessage: "Unlinked document",
    })),

  updateReference: (linkId) => {
    set((s) => {
      const link = s.links.find((l) => l.id === linkId);
      if (!link) return s;
      const doc = catalogById(link.documentId);
      const latest = doc?.latestRevision ?? link.latestRevision;
      return {
        links: s.links.map((l) =>
          l.id === linkId
            ? {
                ...l,
                pinnedRevision: latest,
                latestRevision: latest,
                stale: false,
                mode: "version" as const,
              }
            : l,
        ),
        instances: s.instances.map((i) =>
          i.linkId === linkId ? { ...i, revision: latest } : i,
        ),
        statusMessage: `Updated ${link.documentName} → ${latest}`,
      };
    });
    get().rebuildBom();
  },

  updateAllReferences: () => {
    const stale = get().links.filter((l) => l.stale);
    for (const link of stale) get().updateReference(link.id);
    if (stale.length === 0) {
      set({ statusMessage: "All references are up to date" });
    } else {
      set({ statusMessage: `Updated ${stale.length} reference(s)` });
    }
  },

  setLinkMode: (linkId, mode) =>
    set((s) => ({
      links: s.links.map((l) => {
        if (l.id !== linkId) return l;
        const doc = catalogById(l.documentId);
        const stale =
          mode === "workspace"
            ? Boolean(doc?.workspaceDirty)
            : l.pinnedRevision !== l.latestRevision;
        return { ...l, mode, stale };
      }),
      statusMessage: `Link mode → ${mode}`,
    })),

  setInstanceGrounded: (id, grounded) => {
    set((s) => ({
      instances: s.instances.map((i) => (i.id === id ? { ...i, grounded } : i)),
      statusMessage: grounded ? "Instance grounded" : "Instance ungrounded",
    }));
    get().solveAssembly();
  },

  setInstanceVisible: (id, visible) =>
    set((s) => ({
      instances: s.instances.map((i) => (i.id === id ? { ...i, visible } : i)),
    })),

  setInstanceSuppressed: (id, suppressed) => {
    set((s) => ({
      instances: s.instances.map((i) => (i.id === id ? { ...i, suppressed } : i)),
    }));
    get().rebuildBom();
  },

  renameInstance: (id, name) =>
    set((s) => ({
      instances: s.instances.map((i) => (i.id === id ? { ...i, name } : i)),
    })),

  removeInstance: (id) => {
    set((s) => {
      const instances = s.instances.filter((i) => i.id !== id);
      return {
        instances,
        connectors: s.connectors.filter((c) => c.instanceId !== id),
        mates: s.mates.filter((m) => m.instanceAId !== id && m.instanceBId !== id),
        selectedInstanceIds: s.selectedInstanceIds.filter((x) => x !== id),
        bom: { ...s.bom, rows: buildBomRows(instances, s.bom.templateId) },
        statusMessage: "Instance removed",
      };
    });
    get().solveAssembly();
  },

  replaceInstance: (id, documentId) => {
    const doc = catalogById(documentId);
    if (!doc) return;
    set((s) => {
      const connectors = s.connectors.filter((c) => c.instanceId !== id);
      const nextConnectors = [
        ...connectors,
        ...defaultConnectorsForPrimitive(id, doc.primitive),
      ];
      const instances = s.instances.map((i) =>
        i.id === id
          ? {
              ...i,
              documentId: doc.id,
              documentName: doc.name,
              partNumber: doc.partNumber,
              name: `${doc.name} <1>`,
              kind: doc.kind,
              color: doc.color,
              primitive: doc.primitive,
              revision: doc.revision,
            }
          : i,
      );
      return {
        instances,
        connectors: nextConnectors,
        mates: s.mates.filter((m) => m.instanceAId !== id && m.instanceBId !== id),
        statusMessage: `Replaced instance with ${doc.name}`,
        bom: { ...s.bom, rows: buildBomRows(instances, s.bom.templateId) },
      };
    });
    get().solveAssembly();
  },

  addMateConnector: (instanceId, name, origin, zAxis, xHint) => {
    const id = uid("mc");
    const connector: MateConnector = {
      id,
      name,
      instanceId,
      local: frameToMat4(makeFrame(origin, zAxis, xHint)),
      implicit: false,
    };
    set((s) => ({
      connectors: [...s.connectors, connector],
      selectedConnectorId: id,
      statusMessage: `Mate connector ${name} added`,
    }));
    return id;
  },

  pickConnector: (connectorId) => {
    const state = get();
    const mateTypes = new Set(MATE_CATALOG.map((m) => m.type));
    const tool = state.activeTool;
    if (!mateTypes.has(tool as MateType)) {
      set({ selectedConnectorId: connectorId, statusMessage: "Mate connector selected" });
      return;
    }
    if (!state.pendingConnectorId) {
      set({
        pendingConnectorId: connectorId,
        selectedConnectorId: connectorId,
        statusMessage: "Select second mate connector",
      });
      return;
    }
    if (state.pendingConnectorId === connectorId) {
      set({ statusMessage: "Pick a different connector" });
      return;
    }
    const id = get().addMate(tool as MateType, state.pendingConnectorId, connectorId);
    set({
      pendingConnectorId: null,
      selectedConnectorId: connectorId,
      selectedMateId: id,
      statusMessage: id
        ? `Created ${defaultNameForMate(tool as MateType, 0)}`
        : "Could not create mate",
    });
  },

  clearPendingConnector: () =>
    set({ pendingConnectorId: null, statusMessage: "Mate selection cleared" }),

  addMate: (type, connectorAId, connectorBId) => {
    const { connectors, mates } = get();
    const ca = connectorById(connectors, connectorAId);
    const cb = connectorById(connectors, connectorBId);
    if (!ca || !cb) return null;
    if (ca.instanceId === cb.instanceId) {
      set({ statusMessage: "Mate connectors must belong to different instances" });
      return null;
    }
    const implemented = IMPLEMENTED_MATES.has(type);
    const mate: AssemblyMate = {
      id: uid("mate"),
      name: defaultNameForMate(type, countOfMate(mates, type)),
      type,
      connectorAId,
      connectorBId,
      instanceAId: ca.instanceId,
      instanceBId: cb.instanceId,
      params: { ...DEFAULT_MATE_PARAMS },
      suppressed: false,
      status: implemented ? "ok" : "scaffold",
      statusMessage: implemented
        ? "Solved"
        : "Scaffolded — solver not implemented",
    };
    set((s) => ({
      mates: [...s.mates, mate],
      selectedMateId: mate.id,
      activePanel: "mate",
    }));
    get().solveAssembly();
    return mate.id;
  },

  updateMateParams: (id, patch) => {
    set((s) => ({
      mates: s.mates.map((m) =>
        m.id === id ? { ...m, params: { ...m.params, ...patch } } : m,
      ),
    }));
    get().solveAssembly();
  },

  suppressMate: (id, suppressed) => {
    set((s) => ({
      mates: s.mates.map((m) =>
        m.id === id
          ? {
              ...m,
              suppressed,
              status: suppressed ? "suppressed" : IMPLEMENTED_MATES.has(m.type) ? "ok" : "scaffold",
            }
          : m,
      ),
    }));
    get().solveAssembly();
  },

  removeMate: (id) => {
    set((s) => ({
      mates: s.mates.filter((m) => m.id !== id),
      selectedMateId: s.selectedMateId === id ? null : s.selectedMateId,
      statusMessage: "Mate removed",
    }));
    get().solveAssembly();
  },

  solveAssembly: () => {
    set((s) => {
      const instances = solveGraph(s.instances, s.connectors, s.mates);
      const mates = s.mates.map((m) => {
        if (!IMPLEMENTED_MATES.has(m.type)) {
          return {
            ...m,
            status: m.suppressed ? "suppressed" : "scaffold",
            statusMessage: "Scaffolded — solver not implemented",
          } as AssemblyMate;
        }
        const message = residualForMate(m, instances, s.connectors);
        const ok = message.startsWith("Solved");
        return {
          ...m,
          status: m.suppressed ? "suppressed" : ok ? "ok" : "error",
          statusMessage: message,
        } as AssemblyMate;
      });
      return { instances, mates };
    });
  },

  addRelation: (type, mateAId, mateBId) => {
    const id = uid("rel");
    const labels: Record<RelationType, string> = {
      gear: "Gear",
      rackAndPinion: "Rack and Pinion",
      screw: "Screw",
      linear: "Linear",
    };
    const relation: AssemblyRelation = {
      id,
      name: `${labels[type]} ${get().relations.filter((r) => r.type === type).length + 1}`,
      type,
      mateAId,
      mateBId,
      ratio: type === "gear" ? 2 : 1,
      pitch: type === "rackAndPinion" || type === "screw" ? 2 : 1,
      status: "scaffold",
    };
    set((s) => ({
      relations: [...s.relations, relation],
      activePanel: "relations",
      statusMessage: `${relation.name} scaffolded`,
    }));
    return id;
  },

  removeRelation: (id) =>
    set((s) => ({
      relations: s.relations.filter((r) => r.id !== id),
      statusMessage: "Relation removed",
    })),

  groupSelected: () => {
    const ids = get().selectedInstanceIds;
    if (ids.length < 2) {
      set({ statusMessage: "Select two or more instances to group" });
      return null;
    }
    const id = uid("grp");
    const group: InstanceGroup = {
      id,
      name: `Group ${get().groups.length + 1}`,
      instanceIds: ids,
    };
    set((s) => ({
      groups: [...s.groups, group],
      instances: s.instances.map((i) =>
        ids.includes(i.id) ? { ...i, groupId: id } : i,
      ),
      statusMessage: `${group.name} created`,
    }));
    return id;
  },

  ungroup: (groupId) =>
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== groupId),
      instances: s.instances.map((i) =>
        i.groupId === groupId ? { ...i, groupId: null } : i,
      ),
      statusMessage: "Group dissolved",
    })),

  setSnapMode: (on) =>
    set({ snapMode: on, statusMessage: on ? "Snap mode on" : "Snap mode off" }),
  setShowMatesMode: (on) =>
    set({
      showMatesMode: on,
      statusMessage: on ? "Show mates on" : "Show mates off",
    }),

  replicateInstance: (instanceId, count) => {
    get().linearPattern(instanceId, count, 0.6, [1, 0, 0]);
    set((s) => {
      const last = s.patterns[s.patterns.length - 1];
      if (!last) return s;
      return {
        patterns: s.patterns.map((p) =>
          p.id === last.id ? { ...p, kind: "replicate" as const, name: `Replicate ${s.patterns.length}` } : p,
        ),
        statusMessage: `Replicate scaffolded (${count})`,
      };
    });
  },

  linearPattern: (instanceId, count, spacing, axis) => {
    const seedInst = get().instances.find((i) => i.id === instanceId);
    if (!seedInst) return;
    const id = uid("pat");
    const copies: AssemblyInstance[] = [];
    const copyConnectors: MateConnector[] = [];
    const n = Math.max(2, Math.min(count, 12));
    for (let i = 1; i < n; i++) {
      const copyId = uid("inst");
      const offset: Vec3 = [axis[0] * spacing * i, axis[1] * spacing * i, axis[2] * spacing * i];
      copies.push({
        ...seedInst,
        id: copyId,
        name: `${seedInst.documentName} <${i + 1}>`,
        grounded: false,
        derived: true,
        patternId: id,
        worldTransform: mulMat4(seedInst.worldTransform, translationMat4(offset)),
      });
      copyConnectors.push(
        ...defaultConnectorsForPrimitive(copyId, seedInst.primitive),
      );
    }
    const pattern: AssemblyPattern = {
      id,
      name: `Linear Pattern ${get().patterns.length + 1}`,
      kind: "linear",
      seedInstanceId: instanceId,
      count: n,
      spacing,
      axis,
      angle: 0,
      instanceIds: copies.map((c) => c.id),
      status: "scaffold",
    };
    set((s) => {
      const instances = [...s.instances, ...copies];
      return {
        patterns: [...s.patterns, pattern],
        instances,
        connectors: [...s.connectors, ...copyConnectors],
        statusMessage: `${pattern.name} scaffolded`,
        bom: { ...s.bom, rows: buildBomRows(instances, s.bom.templateId) },
      };
    });
  },

  circularPattern: (instanceId, count, angle, axis) => {
    const seedInst = get().instances.find((i) => i.id === instanceId);
    if (!seedInst) return;
    const id = uid("pat");
    const copies: AssemblyInstance[] = [];
    const copyConnectors: MateConnector[] = [];
    const n = Math.max(2, Math.min(Number.isFinite(count) ? count : 2, 12));
    const sweep = Number.isFinite(angle) ? angle : 0;
    const step = (sweep * Math.PI) / 180 / Math.max(n - 1, 1);
    // The axis line passes through the assembly origin, so copies orbit (0,0,0).
    // Conjugating this to pivot at the seed's own origin would stack every copy
    // exactly on the seed.
    for (let i = 1; i < n; i++) {
      const copyId = uid("inst");
      const theta = step * i;
      // Rodrigues about the true axis. The previous branch picked a Y or Z
      // rotation from `|axis.y| > 0.5`, so an X axis rotated in the Z plane.
      const rot = rotationAboutAxisMat4(axis, theta);
      copies.push({
        ...seedInst,
        id: copyId,
        name: `${seedInst.documentName} <${i + 1}>`,
        grounded: false,
        derived: true,
        patternId: id,
        worldTransform: mulMat4(rot, seedInst.worldTransform),
      });
      copyConnectors.push(
        ...defaultConnectorsForPrimitive(copyId, seedInst.primitive),
      );
    }
    const pattern: AssemblyPattern = {
      id,
      name: `Circular Pattern ${get().patterns.length + 1}`,
      kind: "circular",
      seedInstanceId: instanceId,
      count: n,
      spacing: 0,
      axis,
      angle,
      instanceIds: copies.map((c) => c.id),
      status: "scaffold",
    };
    set((s) => {
      const instances = [...s.instances, ...copies];
      return {
        patterns: [...s.patterns, pattern],
        instances,
        connectors: [...s.connectors, ...copyConnectors],
        statusMessage: `${pattern.name} scaffolded`,
        bom: { ...s.bom, rows: buildBomRows(instances, s.bom.templateId) },
      };
    });
  },

  mirrorInstance: (instanceId, axis) => {
    const seedInst = get().instances.find((i) => i.id === instanceId);
    if (!seedInst) return;
    const id = uid("pat");
    const copyId = uid("inst");
    // Reflect through the assembly datum plane whose normal is `axis`.
    //
    // The previous implementation negated one scale component per non-zero axis
    // entry. That is only a reflection for a world-axis-aligned normal; for a
    // diagonal normal like [1,1,0] it negates two axes, which is a 180 degree
    // rotation (determinant +1), not a mirror.
    const mirror = reflectionMat4(axis);
    const copy: AssemblyInstance = {
      ...seedInst,
      id: copyId,
      name: `${seedInst.documentName} mirrored`,
      grounded: false,
      derived: true,
      patternId: id,
      worldTransform: mulMat4(mirror, seedInst.worldTransform),
    };
    const pattern: AssemblyPattern = {
      id,
      name: `Mirror ${get().patterns.length + 1}`,
      kind: "mirror",
      seedInstanceId: instanceId,
      count: 2,
      spacing: 0,
      axis,
      angle: 0,
      instanceIds: [copyId],
      status: "scaffold",
    };
    set((s) => {
      const instances = [...s.instances, copy];
      return {
        patterns: [...s.patterns, pattern],
        instances,
        connectors: [
          ...s.connectors,
          ...defaultConnectorsForPrimitive(copyId, seedInst.primitive),
        ],
        statusMessage: `${pattern.name} scaffolded`,
        bom: { ...s.bom, rows: buildBomRows(instances, s.bom.templateId) },
      };
    });
  },

  addNamedPosition: (name) => {
    const id = uid("pos");
    const mateValues: NamedPosition["mateValues"] = {};
    for (const mate of get().mates) {
      mateValues[mate.id] = { angle: mate.params.angle, offset: mate.params.offset };
    }
    set((s) => ({
      namedPositions: [
        ...s.namedPositions,
        { id, name, description: "Captured mate values", mateValues },
      ],
      activeNamedPositionId: id,
      statusMessage: `Named position "${name}" saved`,
    }));
    return id;
  },

  applyNamedPosition: (id) => {
    const pos = get().namedPositions.find((p) => p.id === id);
    if (!pos) return;
    set((s) => ({
      activeNamedPositionId: id,
      mates: s.mates.map((m) => {
        const vals = pos.mateValues[m.id];
        if (!vals) return m;
        return { ...m, params: { ...m.params, angle: vals.angle, offset: vals.offset } };
      }),
      statusMessage: `Applied position "${pos.name}"`,
    }));
    get().solveAssembly();
  },

  removeNamedPosition: (id) =>
    set((s) => ({
      namedPositions: s.namedPositions.filter((p) => p.id !== id),
      activeNamedPositionId:
        s.activeNamedPositionId === id ? null : s.activeNamedPositionId,
    })),

  addDisplayState: (name) => {
    const id = uid("ds");
    const overrides = get().instances.map((i) => ({
      instanceId: i.id,
      visible: i.visible,
      opacity: i.opacity,
      color: i.color,
    }));
    set((s) => ({
      displayStates: [...s.displayStates, { id, name, overrides }],
      activeDisplayStateId: id,
      statusMessage: `Display state "${name}" saved`,
    }));
    return id;
  },

  applyDisplayState: (id) => {
    const ds = get().displayStates.find((d) => d.id === id);
    if (!ds) return;
    set((s) => ({
      activeDisplayStateId: id,
      instances: s.instances.map((i) => {
        const ov = ds.overrides.find((o) => o.instanceId === i.id);
        if (!ov) return i;
        return {
          ...i,
          visible: ov.visible,
          opacity: ov.opacity,
          color: ov.color ?? i.color,
        };
      }),
      statusMessage: `Applied display state "${ds.name}"`,
    }));
  },

  updateDisplayOverride: (stateId, instanceId, patch) =>
    set((s) => ({
      displayStates: s.displayStates.map((d) =>
        d.id !== stateId
          ? d
          : {
              ...d,
              overrides: d.overrides.map((o) =>
                o.instanceId === instanceId ? { ...o, ...patch } : o,
              ),
            },
      ),
      instances:
        s.activeDisplayStateId === stateId
          ? s.instances.map((i) => {
              if (i.id !== instanceId) return i;
              return {
                ...i,
                visible: patch.visible ?? i.visible,
                opacity: patch.opacity ?? i.opacity,
                color: patch.color ?? i.color,
              };
            })
          : s.instances,
    })),

  addExplodedView: (name) => {
    const id = uid("exp");
    const steps = get()
      .instances.filter((i) => !i.grounded)
      .map((i, idx) => ({
        instanceId: i.id,
        direction: [0, 1, 0] as Vec3,
        distance: 0.5 + idx * 0.35,
      }));
    set((s) => ({
      explodedViews: [...s.explodedViews, { id, name, steps }],
      activeExplodedViewId: id,
      explodeAmount: 1,
      statusMessage: `Exploded view "${name}" created`,
    }));
    return id;
  },

  setActiveExplodedView: (id) =>
    set({
      activeExplodedViewId: id,
      statusMessage: id ? "Exploded view active" : "Exploded view off",
    }),

  setExplodeAmount: (amount) =>
    set({ explodeAmount: Math.max(0, Math.min(1, amount)) }),

  createPartStudioInContext: (name, instanceIds) => {
    const id = uid("ctx");
    const studio: InContextPartStudio = {
      id,
      name,
      sourceInstanceIds: instanceIds,
      updateOnRebuild: true,
      createdAt: Date.now(),
      status: "scaffold",
    };
    set((s) => ({
      inContextStudios: [...s.inContextStudios, studio],
      activePanel: "inContext",
      statusMessage: `In-context part studio "${name}" scaffolded`,
    }));
    return id;
  },

  setBomTemplate: (id) =>
    set((s) => ({
      bom: {
        ...s.bom,
        templateId: id,
        rows: buildBomRows(s.instances, id),
      },
      statusMessage: `BOM template → ${id}`,
    })),

  setBomFormatting: (patch) =>
    set((s) => ({
      bom: { ...s.bom, formatting: { ...s.bom.formatting, ...patch } },
    })),

  setBomColumn: (columnId, patch) =>
    set((s) => ({
      bom: {
        ...s.bom,
        columns: s.bom.columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
      },
    })),

  selectBomRow: (id) =>
    set((s) => ({ bom: { ...s.bom, selectedRowId: id } })),

  updateBomCell: (rowId, patch) =>
    set((s) => ({
      bom: {
        ...s.bom,
        rows: s.bom.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      },
    })),

  rebuildBom: () =>
    set((s) => ({
      bom: { ...s.bom, rows: buildBomRows(s.instances, s.bom.templateId) },
    })),
}));

export function visualWorldTransform(
  instance: AssemblyInstance,
  exploded: ExplodedView | null,
  amount: number,
): Mat4 {
  if (!exploded || amount <= 0) return instance.worldTransform;
  const step = exploded.steps.find((s) => s.instanceId === instance.id);
  if (!step) return instance.worldTransform;
  const d = amount * step.distance;
  const offset: Vec3 = [
    step.direction[0] * d,
    step.direction[1] * d,
    step.direction[2] * d,
  ];
  return mulMat4(translationMat4(offset), instance.worldTransform);
}
