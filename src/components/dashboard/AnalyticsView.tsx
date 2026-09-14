import { useMemo } from "react";
import { STUDIO_KIND_LABEL, useCatalogStore } from "../../store/catalogStore";

export function AnalyticsView() {
  const workspaces = useCatalogStore((s) => s.workspaces);
  const documents = useCatalogStore((s) => s.documents);
  const imports = useCatalogStore((s) => s.imports);

  const live = workspaces.filter((w) => !w.trashed);
  const counts = useMemo(() => {
    const byKind = new Map<string, number>();
    for (const doc of documents) {
      byKind.set(doc.kind, (byKind.get(doc.kind) ?? 0) + 1);
    }
    return [...byKind.entries()].sort((a, b) => b[1] - a[1]);
  }, [documents]);

  const importCounts = useMemo(() => {
    const byKind = new Map<string, number>();
    for (const item of imports) {
      byKind.set(item.format, (byKind.get(item.format) ?? 0) + 1);
    }
    return [...byKind.entries()];
  }, [imports]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          On disk
        </p>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          Analytics
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Counts from the local catalog. Empty until you create or load
          workspaces.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="grid max-w-3xl grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
          <CountCell label="Live workspaces" value={live.length} />
          <CountCell label="Studios" value={documents.length} />
          <CountCell label="Imports" value={imports.length} />
        </div>

        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-base font-medium tracking-tight">
            Studios by kind
          </h2>
          {counts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No studios in the catalog.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse border border-border text-left text-sm">
              <thead className="bg-card font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {counts.map(([kind, count]) => (
                  <tr key={kind} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      {STUDIO_KIND_LABEL[kind as keyof typeof STUDIO_KIND_LABEL] ??
                        kind}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-base font-medium tracking-tight">
            Imports by format
          </h2>
          {importCounts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No DXF, DWG, or image imports.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse border border-border text-left text-sm">
              <thead className="bg-card font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Format</th>
                  <th className="px-4 py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {importCounts.map(([format, count]) => (
                  <tr key={format} className="border-t border-border">
                    <td className="px-4 py-2.5 font-mono text-xs uppercase">
                      {format}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-4 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-medium tracking-tight">
        {value}
      </p>
    </div>
  );
}

export default AnalyticsView;
