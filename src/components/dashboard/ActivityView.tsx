import { useMemo } from "react";
import { useCatalogStore } from "../../store/catalogStore";
import { formatModifiedLong } from "./format";

interface ActivityEvent {
  id: string;
  at: string;
  actor: string;
  verb: string;
  target: string;
}

export function ActivityView() {
  const workspaces = useCatalogStore((s) => s.workspaces);
  const documents = useCatalogStore((s) => s.documents);
  const imports = useCatalogStore((s) => s.imports);

  const events = useMemo(() => {
    const rows: ActivityEvent[] = [
      ...workspaces
        .filter((w) => !w.trashed)
        .map((w) => ({
          id: `ws-${w.id}`,
          at: w.lastOpenedAt,
          actor: w.owner,
          verb: "Opened workspace",
          target: w.name,
        })),
      ...documents.map((d) => ({
        id: `doc-${d.id}`,
        at: d.modifiedAt,
        actor: d.owner,
        verb: "Modified",
        target: d.name,
      })),
      ...imports.map((item) => ({
        id: `imp-${item.id}`,
        at: item.modifiedAt,
        actor: item.owner,
        verb: "Imported",
        target: item.name,
      })),
    ];
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }, [workspaces, documents, imports]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          Local log
        </p>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          Activity
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Opens, edits, and imports from this machine. Nothing is synced.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {events.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">
            No catalog activity yet. Create a workspace or load the sample set.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-card font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-6 py-2.5 font-medium">When</th>
                <th className="px-6 py-2.5 font-medium">Actor</th>
                <th className="px-6 py-2.5 font-medium">Event</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-border">
                  <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-muted-foreground">
                    {formatModifiedLong(event.at)}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {event.actor}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-muted-foreground">{event.verb}</span>{" "}
                    <span className="font-medium text-foreground">
                      {event.target}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ActivityView;
