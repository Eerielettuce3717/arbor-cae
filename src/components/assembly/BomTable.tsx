import { useMemo, useState } from "react";
import { useAssemblyStore } from "../../store/assemblyStore";
import {
  BOM_TEMPLATES,
  type BomColumnId,
  type BomRow,
} from "../../store/assemblyTypes";

const inputClass =
  "rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground";

export function BomTable() {
  const bom = useAssemblyStore((s) => s.bom);
  const setBomTemplate = useAssemblyStore((s) => s.setBomTemplate);
  const setBomFormatting = useAssemblyStore((s) => s.setBomFormatting);
  const setBomColumn = useAssemblyStore((s) => s.setBomColumn);
  const selectBomRow = useAssemblyStore((s) => s.selectBomRow);
  const updateBomCell = useAssemblyStore((s) => s.updateBomCell);
  const rebuildBom = useAssemblyStore((s) => s.rebuildBom);
  const [tab, setTab] = useState<"table" | "format" | "templates">("table");

  const visibleCols = bom.columns.filter((c) => c.visible);
  const fmt = bom.formatting;

  const totals = useMemo(() => {
    return bom.rows.reduce(
      (acc, r) => {
        acc.qty += r.qty;
        acc.mass += r.massGrams;
        return acc;
      },
      { qty: 0, mass: 0 },
    );
  }, [bom.rows]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-[10px] text-faint">
          Working with Table · Formatting · Templates
        </p>
        <button
          type="button"
          onClick={() => rebuildBom()}
          className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
        >
          Rebuild
        </button>
      </header>

      <nav className="flex gap-1 border-b border-border px-2 py-1.5">
        {(
          [
            ["table", "Working with Table"],
            ["format", "Formatting"],
            ["templates", "Templates"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded px-2 py-1 text-[11px] ${
              tab === id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-hover hover:text-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "templates" && (
        <div className="space-y-2 overflow-y-auto p-3">
          {BOM_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setBomTemplate(t.id)}
              className={`block w-full rounded border px-3 py-2 text-left ${
                bom.templateId === t.id
                  ? "border-accent bg-active"
                  : "border-border hover:bg-hover"
              }`}
            >
              <div className="text-xs font-medium text-foreground">{t.label}</div>
              <div className="text-[10px] text-faint">{t.hint}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "format" && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
          <label className="block text-muted-foreground">
            Header background
            <input
              type="color"
              className="ml-2 h-6 w-10 align-middle"
              value={fmt.headerBg}
              onChange={(e) => setBomFormatting({ headerBg: e.target.value })}
            />
          </label>
          <label className="block text-muted-foreground">
            Header text
            <input
              type="color"
              className="ml-2 h-6 w-10 align-middle"
              value={fmt.headerFg}
              onChange={(e) => setBomFormatting({ headerFg: e.target.value })}
            />
          </label>
          <label className="block text-muted-foreground">
            Alt row
            <input
              type="color"
              className="ml-2 h-6 w-10 align-middle"
              value={fmt.altRowBg}
              onChange={(e) => setBomFormatting({ altRowBg: e.target.value })}
            />
          </label>
          <label className="flex items-center justify-between text-muted-foreground">
            Font size
            <input
              type="number"
              className={`${inputClass} w-16`}
              min={9}
              max={16}
              value={fmt.fontSize}
              onChange={(e) => setBomFormatting({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center justify-between text-muted-foreground">
            Number precision
            <input
              type="number"
              className={`${inputClass} w-16`}
              min={0}
              max={4}
              value={fmt.numberPrecision}
              onChange={(e) =>
                setBomFormatting({ numberPrecision: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex items-center justify-between text-muted-foreground">
            Mass unit
            <select
              className={inputClass}
              value={fmt.massUnit}
              onChange={(e) =>
                setBomFormatting({ massUnit: e.target.value as "g" | "kg" })
              }
            >
              <option value="g">grams</option>
              <option value="kg">kilograms</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={fmt.showGrid}
              onChange={(e) => setBomFormatting({ showGrid: e.target.checked })}
              className="accent-accent"
            />
            Show grid
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={fmt.boldHeader}
              onChange={(e) => setBomFormatting({ boldHeader: e.target.checked })}
              className="accent-accent"
            />
            Bold header
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={fmt.wrapText}
              onChange={(e) => setBomFormatting({ wrapText: e.target.checked })}
              className="accent-accent"
            />
            Wrap text
          </label>

          <div>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
              Columns
            </h4>
            {bom.columns.map((col) => (
              <div key={col.id} className="mb-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={(e) => setBomColumn(col.id, { visible: e.target.checked })}
                  className="accent-accent"
                />
                <span className="w-24 truncate text-muted-foreground">{col.label}</span>
                <input
                  type="number"
                  className={`${inputClass} w-16`}
                  min={40}
                  max={280}
                  value={col.width}
                  onChange={(e) =>
                    setBomColumn(col.id, { width: Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "table" && (
        <div className="min-h-0 flex-1 overflow-auto">
          <table
            className="w-full border-collapse"
            style={{
              fontSize: fmt.fontSize,
              borderColor: fmt.showGrid ? "#334155" : "transparent",
            }}
          >
            <thead>
              <tr
                style={{
                  background: fmt.headerBg,
                  color: fmt.headerFg,
                  fontWeight: fmt.boldHeader ? 600 : 400,
                }}
              >
                {visibleCols.map((col) => (
                  <th
                    key={col.id}
                    className="px-2 py-1.5"
                    style={{
                      width: col.width,
                      textAlign: col.align,
                      borderBottom: "1px solid #334155",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bom.rows.map((row, i) => {
                const selected = bom.selectedRowId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => selectBomRow(row.id)}
                    className="cursor-pointer"
                    style={{
                      background: selected
                        ? "#1e3a5f"
                        : i % 2 === 1
                          ? fmt.altRowBg
                          : "transparent",
                    }}
                  >
                    {visibleCols.map((col) => (
                      <td
                        key={col.id}
                        className="px-2 py-1"
                        style={{
                          textAlign: col.align,
                          borderBottom: fmt.showGrid ? "1px solid #1e293b" : "none",
                          paddingLeft: col.id === "partNumber" ? 8 + row.level * 12 : undefined,
                          whiteSpace: fmt.wrapText ? "normal" : "nowrap",
                        }}
                      >
                        <BomCell
                          row={row}
                          column={col.id}
                          precision={fmt.numberPrecision}
                          massUnit={fmt.massUnit}
                          onChange={(patch) => updateBomCell(row.id, patch)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-muted-foreground">
                <td className="px-2 py-1.5" colSpan={Math.max(visibleCols.length - 2, 1)}>
                  {bom.rows.length} row{bom.rows.length === 1 ? "" : "s"}
                </td>
                {visibleCols.some((c) => c.id === "qty") && (
                  <td className="px-2 py-1.5 text-right font-medium">{totals.qty}</td>
                )}
                {visibleCols.some((c) => c.id === "mass") && (
                  <td className="px-2 py-1.5 text-right font-medium">
                    {formatMass(totals.mass, fmt.massUnit, fmt.numberPrecision)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function formatMass(grams: number, unit: "g" | "kg", precision: number): string {
  const n = unit === "kg" ? grams / 1000 : grams;
  return `${n.toFixed(precision)} ${unit}`;
}

function BomCell({
  row,
  column,
  precision,
  massUnit,
  onChange,
}: {
  row: BomRow;
  column: BomColumnId;
  precision: number;
  massUnit: "g" | "kg";
  onChange: (patch: Partial<BomRow>) => void;
}) {
  if (column === "item") return <span>{row.item}</span>;
  if (column === "qty") {
    return (
      <input
        type="number"
        className={`${inputClass} w-14 text-right`}
        min={1}
        value={row.qty}
        onChange={(e) => onChange({ qty: Number(e.target.value) })}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  if (column === "mass") return <span>{formatMass(row.massGrams, massUnit, precision)}</span>;
  if (column === "partNumber") {
    return (
      <input
        className={`${inputClass} w-full`}
        value={row.partNumber}
        onChange={(e) => onChange({ partNumber: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  if (column === "description") {
    return (
      <input
        className={`${inputClass} w-full`}
        value={row.description}
        onChange={(e) => onChange({ description: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  if (column === "material") return <span>{row.material}</span>;
  if (column === "revision") return <span>{row.revision}</span>;
  return null;
}

export default BomTable;
