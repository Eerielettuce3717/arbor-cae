import { create } from "zustand";
import {
  formatDimensionValue,
  projectBoxOutline,
  twoPointLinearDimension,
} from "../drawings/projection";
import {
  ANNOTATION_CATALOG,
  DEFAULT_DRAWING_PROPERTIES,
  DEFAULT_MODEL_BOX,
  DEFAULT_TOLERANCE_LIBRARY,
  DIMENSION_CATALOG,
  DRAWING_STYLES,
  DRAWING_TEMPLATES,
  IMPLEMENTED_DIMENSIONS,
  IMPLEMENTED_VIEWS,
  TABLE_CATALOG,
  VIEW_CATALOG,
  defaultNameForAnnotation,
  defaultNameForDimension,
  defaultNameForTable,
  defaultNameForView,
  sheetPixelSize,
  type DrawingAnnotation,
  type DrawingAnnotationType,
  type DrawingDimension,
  type DrawingDimensionType,
  type DrawingExportState,
  type DrawingProperties,
  type DrawingSheetMeta,
  type DrawingStyle,
  type DrawingTable,
  type DrawingTableType,
  type DrawingTemplate,
  type DrawingToolId,
  type DrawingView,
  type DrawingViewType,
  type MbdCheckItem,
  type ToleranceClass,
  type Vec2,
  type ViewOrientation,
} from "./drawingTypes";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export type DrawingPanelId =
  | "none"
  | "templates"
  | "sheets"
  | "styles"
  | "properties"
  | "views"
  | "dimensions"
  | "annotations"
  | "tables"
  | "mbd"
  | "tolerances"
  | "export";

interface DrawingState {
  sheets: DrawingSheetMeta[];
  activeSheetId: string;
  templateId: string;
  styleId: string;
  properties: DrawingProperties;
  views: DrawingView[];
  dimensions: DrawingDimension[];
  annotations: DrawingAnnotation[];
  tables: DrawingTable[];
  toleranceLibrary: ToleranceClass[];
  activeToleranceId: string;
  mbdChecks: MbdCheckItem[];
  exportState: DrawingExportState;
  activeTool: DrawingToolId;
  activePanel: DrawingPanelId;
  selectedViewId: string | null;
  selectedDimensionId: string | null;
  selectedAnnotationId: string | null;
  selectedTableId: string | null;
  statusMessage: string;
  draftDimPoint: Vec2 | null;

  templates: DrawingTemplate[];
  styles: DrawingStyle[];

  setActiveTool: (tool: DrawingToolId) => void;
  setActivePanel: (panel: DrawingPanelId) => void;
  setActiveSheet: (id: string) => void;
  applyTemplate: (templateId: string) => void;
  setStyle: (styleId: string) => void;
  updateProperties: (patch: Partial<DrawingProperties>) => void;
  addSheet: (name?: string) => void;
  renameSheet: (id: string, name: string) => void;

  selectView: (id: string | null) => void;
  selectDimension: (id: string | null) => void;
  addProjectedView: (orientation?: ViewOrientation, origin?: Vec2) => void;
  addScaffoldView: (type: DrawingViewType) => void;
  placeDimensionClick: (sheetPoint: Vec2) => void;
  addScaffoldDimension: (type: DrawingDimensionType) => void;
  addScaffoldAnnotation: (type: DrawingAnnotationType) => void;
  addScaffoldTable: (type: DrawingTableType) => void;

  runMbdChecks: () => void;
  setActiveTolerance: (id: string) => void;
  updateDrawing: () => void;
  scanDangling: () => void;
  exportDrawing: (format?: DrawingExportState["exportFormat"]) => void;
  printDrawing: () => void;
}

function seedFrontView(): DrawingView {
  return {
    id: "view_front",
    name: "Front",
    type: "projected",
    parentViewId: null,
    orientation: "front",
    origin: { x: 120, y: 160 },
    scale: 1.2,
    rotationDeg: 0,
    modelBox: DEFAULT_MODEL_BOX,
    status: "ok",
    visible: true,
  };
}

function seedTopView(): DrawingView {
  return {
    id: "view_top",
    name: "Top",
    type: "projected",
    parentViewId: "view_front",
    orientation: "top",
    origin: { x: 120, y: 70 },
    scale: 1.2,
    rotationDeg: 0,
    modelBox: DEFAULT_MODEL_BOX,
    status: "ok",
    visible: true,
  };
}

function seedLinearDim(): DrawingDimension {
  const outline = projectBoxOutline(
    DEFAULT_MODEL_BOX,
    "front",
    { x: 120, y: 160 },
    1.2,
  );
  const a = outline.points[0];
  const b = outline.points[1];
  return {
    id: "dim_w",
    name: "Width",
    type: "twoPointLinear",
    viewId: "view_front",
    pointA: a,
    pointB: b,
    offset: -14,
    valueOverride: null,
    status: "ok",
    refA: "edge_bottom",
    refB: "edge_bottom",
  };
}

function emptyMbd(): MbdCheckItem[] {
  return [
    {
      id: "mbd_datums",
      label: "Primary datums defined",
      status: "unknown",
      detail: "Run MBD Check to evaluate.",
    },
    {
      id: "mbd_dims",
      label: "Critical dimensions present",
      status: "unknown",
      detail: "Run MBD Check to evaluate.",
    },
    {
      id: "mbd_tolerances",
      label: "Default tolerance class applied",
      status: "unknown",
      detail: "Run MBD Check to evaluate.",
    },
    {
      id: "mbd_gdt",
      label: "GD&T / PMI coverage",
      status: "unknown",
      detail: "Run MBD Check to evaluate.",
    },
    {
      id: "mbd_dangling",
      label: "No dangling entities",
      status: "unknown",
      detail: "Run MBD Check to evaluate.",
    },
  ];
}

function countDangling(
  dimensions: DrawingDimension[],
  annotations: DrawingAnnotation[],
): number {
  return (
    dimensions.filter((d) => d.status === "dangling").length +
    annotations.filter((a) => a.status === "dangling").length
  );
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  sheets: [
    {
      id: "sheet_1",
      name: "Sheet 1",
      templateId: "tpl_iso_a3",
      format: "A3",
      landscape: true,
      active: true,
    },
  ],
  activeSheetId: "sheet_1",
  templateId: "tpl_iso_a3",
  styleId: "sty_iso",
  properties: { ...DEFAULT_DRAWING_PROPERTIES },
  views: [seedFrontView(), seedTopView()],
  dimensions: [seedLinearDim()],
  annotations: [],
  tables: [
    {
      id: "tbl_rev",
      name: "Revision",
      type: "revision",
      position: { x: 10, y: 10 },
      columns: ["Rev", "Description", "Date", "By"],
      rows: [
        ["A", "Initial release", "2026-09-12", "VG"],
        ["—", "—", "—", "—"],
      ],
      status: "scaffold",
    },
  ],
  toleranceLibrary: DEFAULT_TOLERANCE_LIBRARY,
  activeToleranceId: "tol_iso_m",
  mbdChecks: emptyMbd(),
  exportState: {
    lastUpdatedAt: Date.now(),
    danglingCount: 0,
    exportFormat: "pdf",
    printReady: true,
    message: "Drawing up to date.",
  },
  activeTool: "select",
  activePanel: "none",
  selectedViewId: "view_front",
  selectedDimensionId: null,
  selectedAnnotationId: null,
  selectedTableId: null,
  statusMessage: "Drawing ready — projected views + 2-point linear dims live.",
  draftDimPoint: null,
  templates: DRAWING_TEMPLATES,
  styles: DRAWING_STYLES,

  setActiveTool: (tool) => {
    const state = get();
    if (tool === "mbdCheck") {
      state.runMbdChecks();
      set({ activeTool: tool, activePanel: "mbd" });
      return;
    }
    if (tool === "tolerances") {
      set({
        activeTool: tool,
        activePanel: "tolerances",
        statusMessage: "Default Tolerances Library.",
      });
      return;
    }
    if (tool === "update") {
      state.updateDrawing();
      set({ activeTool: tool });
      return;
    }
    if (tool === "dangling") {
      state.scanDangling();
      set({ activeTool: tool, activePanel: "export" });
      return;
    }
    if (tool === "export") {
      state.exportDrawing();
      set({ activeTool: tool, activePanel: "export" });
      return;
    }
    if (tool === "print") {
      state.printDrawing();
      set({ activeTool: tool, activePanel: "export" });
      return;
    }

    if (VIEW_CATALOG.some((v) => v.type === tool)) {
      const type = tool as DrawingViewType;
      if (IMPLEMENTED_VIEWS.has(type)) {
        state.addProjectedView();
        set({ activeTool: tool, activePanel: "views", draftDimPoint: null });
      } else {
        state.addScaffoldView(type);
        set({ activeTool: tool, activePanel: "views", draftDimPoint: null });
      }
      return;
    }

    if (DIMENSION_CATALOG.some((d) => d.type === tool)) {
      const type = tool as DrawingDimensionType;
      if (IMPLEMENTED_DIMENSIONS.has(type)) {
        set({
          activeTool: tool,
          activePanel: "dimensions",
          draftDimPoint: null,
          statusMessage: "2 Point Linear — click two points on the sheet.",
        });
      } else {
        state.addScaffoldDimension(type);
        set({ activeTool: tool, activePanel: "dimensions", draftDimPoint: null });
      }
      return;
    }

    if (ANNOTATION_CATALOG.some((a) => a.type === tool)) {
      state.addScaffoldAnnotation(tool as DrawingAnnotationType);
      set({ activeTool: tool, activePanel: "annotations", draftDimPoint: null });
      return;
    }

    if (TABLE_CATALOG.some((t) => t.type === tool)) {
      state.addScaffoldTable(tool as DrawingTableType);
      set({ activeTool: tool, activePanel: "tables", draftDimPoint: null });
      return;
    }

    set({
      activeTool: tool,
      draftDimPoint: null,
      statusMessage:
        tool === "select" ? "Select entities on the sheet." : `Tool: ${tool}`,
    });
  },

  setActivePanel: (panel) => set({ activePanel: panel }),

  setActiveSheet: (id) =>
    set((s) => ({
      activeSheetId: id,
      sheets: s.sheets.map((sh) => ({ ...sh, active: sh.id === id })),
      statusMessage: `Active sheet: ${s.sheets.find((x) => x.id === id)?.name ?? id}`,
    })),

  applyTemplate: (templateId) => {
    const tpl = DRAWING_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    set((s) => ({
      templateId,
      properties: {
        ...s.properties,
        format: tpl.format,
        landscape: tpl.landscape,
        projection: tpl.projection,
        company: tpl.company,
      },
      sheets: s.sheets.map((sh) =>
        sh.id === s.activeSheetId
          ? {
              ...sh,
              templateId,
              format: tpl.format,
              landscape: tpl.landscape,
            }
          : sh,
      ),
      statusMessage: `Applied template “${tpl.name}”.`,
      activePanel: "templates",
    }));
  },

  setStyle: (styleId) => {
    const sty = DRAWING_STYLES.find((t) => t.id === styleId);
    set({
      styleId,
      statusMessage: sty ? `Style: ${sty.name}` : "Style updated.",
      activePanel: "styles",
    });
  },

  updateProperties: (patch) =>
    set((s) => {
      const properties = { ...s.properties, ...patch };
      const sheets = s.sheets.map((sh) =>
        sh.id === s.activeSheetId
          ? {
              ...sh,
              format: properties.format,
              landscape: properties.landscape,
            }
          : sh,
      );
      return {
        properties,
        sheets,
        statusMessage: "Sheet properties updated.",
      };
    }),

  addSheet: (name) => {
    const id = uid("sheet");
    const { properties, templateId, sheets } = get();
    const sheet: DrawingSheetMeta = {
      id,
      name: name ?? `Sheet ${sheets.length + 1}`,
      templateId,
      format: properties.format,
      landscape: properties.landscape,
      active: true,
    };
    set({
      sheets: [...sheets.map((s) => ({ ...s, active: false })), sheet],
      activeSheetId: id,
      statusMessage: `Added ${sheet.name}.`,
      activePanel: "sheets",
    });
  },

  renameSheet: (id, name) =>
    set((s) => ({
      sheets: s.sheets.map((sh) => (sh.id === id ? { ...sh, name } : sh)),
    })),

  selectView: (id) =>
    set({
      selectedViewId: id,
      selectedDimensionId: null,
      selectedAnnotationId: null,
      selectedTableId: null,
    }),

  selectDimension: (id) =>
    set({
      selectedDimensionId: id,
      selectedViewId: null,
      selectedAnnotationId: null,
      selectedTableId: null,
    }),

  addProjectedView: (orientation = "right", origin) => {
    const views = get().views;
    const parent = views.find((v) => v.id === get().selectedViewId) ?? views[0];
    const n = views.filter((v) => v.type === "projected").length + 1;
    const size = sheetPixelSize(
      get().properties.format,
      get().properties.landscape,
    );
    const view: DrawingView = {
      id: uid("view"),
      name: defaultNameForView("projected", n),
      type: "projected",
      parentViewId: parent?.id ?? null,
      orientation,
      origin: origin ?? {
        x: Math.min(size.widthMm - 80, (parent?.origin.x ?? 120) + 110),
        y: parent?.origin.y ?? 160,
      },
      scale: parent?.scale ?? 1,
      rotationDeg: 0,
      modelBox: parent?.modelBox ?? DEFAULT_MODEL_BOX,
      status: "ok",
      visible: true,
    };
    set({
      views: [...views, view],
      selectedViewId: view.id,
      statusMessage: `Added projected view “${view.name}” (${orientation}).`,
    });
  },

  addScaffoldView: (type) => {
    const views = get().views;
    const n = views.filter((v) => v.type === type).length + 1;
    const label = VIEW_CATALOG.find((v) => v.type === type)?.label ?? type;
    const view: DrawingView = {
      id: uid("view"),
      name: defaultNameForView(type, n),
      type,
      parentViewId: get().selectedViewId,
      orientation: "front",
      origin: { x: 250, y: 120 },
      scale: 1,
      rotationDeg: type === "auxiliary" ? 30 : 0,
      modelBox: DEFAULT_MODEL_BOX,
      status: "scaffold",
      visible: true,
      ...(type === "section" ||
      type === "alignedSection" ||
      type === "brokenOutSection"
        ? { sectionPlane: { origin: { x: 0, y: 0 }, angleDeg: 0 } }
        : {}),
      ...(type === "detail"
        ? { detailCircle: { center: { x: 0, y: 0 }, radius: 20 } }
        : {}),
      ...(type === "break" ? { breakGap: 15 } : {}),
      ...(type === "crop"
        ? {
            cropBounds: {
              min: { x: -30, y: -20 },
              max: { x: 30, y: 20 },
            },
          }
        : {}),
    };
    set({
      views: [...views, view],
      selectedViewId: view.id,
      statusMessage: `${label} view scaffolded — projection logic not implemented.`,
    });
  },

  placeDimensionClick: (sheetPoint) => {
    const { activeTool, draftDimPoint, dimensions, properties, selectedViewId } =
      get();
    if (activeTool !== "twoPointLinear") return;

    if (!draftDimPoint) {
      set({
        draftDimPoint: sheetPoint,
        statusMessage: "2 Point Linear — click second point.",
      });
      return;
    }

    const n = dimensions.filter((d) => d.type === "twoPointLinear").length + 1;
    const dim: DrawingDimension = {
      id: uid("dim"),
      name: defaultNameForDimension("twoPointLinear", n),
      type: "twoPointLinear",
      viewId: selectedViewId ?? get().views[0]?.id ?? "",
      pointA: draftDimPoint,
      pointB: sheetPoint,
      offset: 14,
      valueOverride: null,
      status: "ok",
      refA: "picked",
      refB: "picked",
    };
    const geom = twoPointLinearDimension(dim.pointA, dim.pointB, dim.offset);
    const label = formatDimensionValue(
      geom.distance,
      properties.units,
      properties.precision,
    );
    set({
      dimensions: [...dimensions, dim],
      draftDimPoint: null,
      selectedDimensionId: dim.id,
      statusMessage: `Linear dimension ${label} ${properties.units}.`,
    });
  },

  addScaffoldDimension: (type) => {
    const dimensions = get().dimensions;
    const n = dimensions.filter((d) => d.type === type).length + 1;
    const label = DIMENSION_CATALOG.find((d) => d.type === type)?.label ?? type;
    const viewId = get().selectedViewId ?? get().views[0]?.id ?? "";
    const dim: DrawingDimension = {
      id: uid("dim"),
      name: defaultNameForDimension(type, n),
      type,
      viewId,
      pointA: { x: 100, y: 100 },
      pointB: { x: 140, y: 100 },
      offset: 12,
      valueOverride: null,
      status: "scaffold",
      refA: null,
      refB: null,
    };
    set({
      dimensions: [...dimensions, dim],
      selectedDimensionId: dim.id,
      statusMessage: `${label} dimension scaffolded — math not implemented.`,
    });
  },

  addScaffoldAnnotation: (type) => {
    const annotations = get().annotations;
    const n = annotations.filter((a) => a.type === type).length + 1;
    const label =
      ANNOTATION_CATALOG.find((a) => a.type === type)?.label ?? type;
    const ann: DrawingAnnotation = {
      id: uid("ann"),
      name: defaultNameForAnnotation(type, n),
      type,
      viewId: get().selectedViewId,
      position: { x: 200, y: 40 },
      text:
        type === "note"
          ? "NOTES:\n1. INTERPRET PER ASME Y14.5"
          : type === "balloon"
            ? String(n)
            : label,
      status: "scaffold",
      refEntityId: null,
    };
    set({
      annotations: [...annotations, ann],
      selectedAnnotationId: ann.id,
      statusMessage: `${label} annotation scaffolded.`,
    });
  },

  addScaffoldTable: (type) => {
    const tables = get().tables;
    const n = tables.filter((t) => t.type === type).length + 1;
    const label = TABLE_CATALOG.find((t) => t.type === type)?.label ?? type;
    const presets: Record<DrawingTableType, { columns: string[]; rows: string[][] }> =
      {
        bom: {
          columns: ["Item", "Part No.", "Qty", "Desc"],
          rows: [
            ["1", "HSG-A-100", "1", "Housing"],
            ["2", "SCR-M4", "4", "Screw"],
          ],
        },
        cutList: {
          columns: ["Item", "Length", "Qty", "Material"],
          rows: [["1", "120", "2", "Al tube"]],
        },
        hole: {
          columns: ["Tag", "Ø", "Depth", "Qty"],
          rows: [["A", "6.0", "Thru", "4"]],
        },
        custom: {
          columns: ["Col A", "Col B"],
          rows: [["—", "—"]],
        },
        revision: {
          columns: ["Rev", "Description", "Date", "By"],
          rows: [["A", "Initial", "2026-09-12", "VG"]],
        },
      };
    const preset = presets[type];
    const table: DrawingTable = {
      id: uid("tbl"),
      name: defaultNameForTable(type, n),
      type,
      position: { x: 20, y: 40 + tables.length * 8 },
      columns: preset.columns,
      rows: preset.rows,
      status: "scaffold",
    };
    set({
      tables: [...tables, table],
      selectedTableId: table.id,
      statusMessage: `${label} table scaffolded.`,
    });
  },

  runMbdChecks: () => {
    const { dimensions, annotations, activeToleranceId, toleranceLibrary } =
      get();
    const dangling = countDangling(
      dimensions.map((d) =>
        !d.refA || !d.refB ? { ...d, status: "dangling" as const } : d,
      ),
      annotations,
    );
    const hasLinear = dimensions.some(
      (d) => d.type === "twoPointLinear" && d.status !== "scaffold",
    );
    const tol = toleranceLibrary.find((t) => t.id === activeToleranceId);
    const gdt = annotations.some(
      (a) =>
        a.type === "geometricTolerance" ||
        a.type === "datum" ||
        a.type === "surfaceFinish",
    );

    const checks: MbdCheckItem[] = [
      {
        id: "mbd_datums",
        label: "Primary datums defined",
        status: annotations.some((a) => a.type === "datum") ? "pass" : "warn",
        detail: annotations.some((a) => a.type === "datum")
          ? "At least one datum annotation present."
          : "No datum features on sheet — add Datum annotation.",
      },
      {
        id: "mbd_dims",
        label: "Critical dimensions present",
        status: hasLinear ? "pass" : "fail",
        detail: hasLinear
          ? "Linear dimensions found on sheet."
          : "Add at least one 2 Point Linear dimension.",
      },
      {
        id: "mbd_tolerances",
        label: "Default tolerance class applied",
        status: tol ? "pass" : "fail",
        detail: tol
          ? `Active: ${tol.name} (${tol.linearMedium} medium).`
          : "No tolerance class selected.",
      },
      {
        id: "mbd_gdt",
        label: "GD&T / PMI coverage",
        status: gdt ? "pass" : "warn",
        detail: gdt
          ? "MBD annotations present (GTOL / datum / finish)."
          : "Scaffold GD&T callouts for full MBD.",
      },
      {
        id: "mbd_dangling",
        label: "No dangling entities",
        status: dangling === 0 ? "pass" : "fail",
        detail:
          dangling === 0
            ? "All refs resolve."
            : `${dangling} dangling entity(ies) — update or delete.`,
      },
    ];

    set({
      mbdChecks: checks,
      statusMessage: "MBD status check complete.",
      activePanel: "mbd",
      exportState: {
        ...get().exportState,
        danglingCount: dangling,
      },
    });
  },

  setActiveTolerance: (id) => {
    const tol = get().toleranceLibrary.find((t) => t.id === id);
    set({
      activeToleranceId: id,
      statusMessage: tol
        ? `Default tolerance: ${tol.name}`
        : "Tolerance updated.",
    });
  },

  updateDrawing: () => {
    const { dimensions, annotations, views } = get();
    // Re-project implemented views; mark missing refs as dangling.
    const nextViews = views.map((v) =>
      v.type === "projected" && v.status !== "scaffold"
        ? { ...v, status: "ok" as const }
        : v,
    );
    const nextDims = dimensions.map((d) => {
      if (d.type === "twoPointLinear" && d.refA && d.refB) {
        return { ...d, status: "ok" as const };
      }
      if (d.status === "scaffold") return d;
      if (!d.refA || !d.refB) return { ...d, status: "dangling" as const };
      return d;
    });
    const nextAnns = annotations.map((a) => {
      if (a.status === "scaffold") return a;
      if (a.refEntityId === null && a.type !== "note") {
        return { ...a, status: "dangling" as const };
      }
      return a;
    });
    const danglingCount = countDangling(nextDims, nextAnns);
    set({
      views: nextViews,
      dimensions: nextDims,
      annotations: nextAnns,
      exportState: {
        ...get().exportState,
        lastUpdatedAt: Date.now(),
        danglingCount,
        printReady: danglingCount === 0,
        message:
          danglingCount > 0
            ? `Updated with ${danglingCount} dangling entities.`
            : "Drawing updated — no dangling entities.",
      },
      statusMessage:
        danglingCount > 0
          ? `Update complete — ${danglingCount} dangling.`
          : "Drawing updated from model.",
      activePanel: "export",
    });
  },

  scanDangling: () => {
    get().updateDrawing();
    const count = get().exportState.danglingCount;
    set({
      statusMessage:
        count === 0
          ? "No dangling entities."
          : `Found ${count} dangling entities.`,
      activePanel: "export",
    });
  },

  exportDrawing: (format = "pdf") => {
    const dangling = get().exportState.danglingCount;
    set({
      exportState: {
        ...get().exportState,
        exportFormat: format,
        message:
          dangling > 0
            ? `Exported ${format.toUpperCase()} with ${dangling} dangling warning(s).`
            : `Exported drawing as ${format.toUpperCase()} (scaffold).`,
      },
      statusMessage: `Export ${format.toUpperCase()} — scaffold output.`,
      activePanel: "export",
    });
  },

  printDrawing: () => {
    const { exportState, properties } = get();
    const size = sheetPixelSize(properties.format, properties.landscape);
    set({
      exportState: {
        ...exportState,
        printReady: exportState.danglingCount === 0,
        message:
          exportState.danglingCount > 0
            ? `Print blocked — resolve ${exportState.danglingCount} dangling entities.`
            : `Print queue: ${properties.format} ${size.widthMm.toFixed(0)}×${size.heightMm.toFixed(0)} mm (scaffold).`,
      },
      statusMessage:
        exportState.danglingCount > 0
          ? "Print blocked by dangling entities."
          : "Sent to print (scaffold).",
      activePanel: "export",
    });
  },
}));
