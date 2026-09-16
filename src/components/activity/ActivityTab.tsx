import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Send, Server } from "lucide-react";
import { formatModifiedLong } from "../dashboard/format";
import { EmailConfigModal } from "./EmailConfigModal";
import { PushMailDialog } from "./PushMailDialog";
import { mailer, type SmtpConfig, type PushRecord } from "../../lib/mailerApi";
import { isTauriRuntime, pdm, type Commit } from "../../lib/pdmApi";
import { useCatalogStore } from "../../store/catalogStore";

type TimelineKind = "commit" | "edit" | "import" | "push";

interface TimelineItem {
  id: string;
  kind: TimelineKind;
  at: string;
  title: string;
  author: string;
  hash?: string;
  branch?: string;
  commit?: Commit;
  pushTo?: string;
}

export function ActivityTab() {
  const workspaces = useCatalogStore((s) => s.workspaces);
  const documents = useCatalogStore((s) => s.documents);
  const imports = useCatalogStore((s) => s.imports);
  const selectedWorkspaceId = useCatalogStore((s) => s.selectedWorkspaceId);
  const workspaceName =
    workspaces.find((w) => w.id === selectedWorkspaceId)?.name ??
    workspaces.find((w) => !w.trashed)?.name ??
    "Workspace";

  const [commits, setCommits] = useState<Array<Commit & { branchName: string }>>(
    [],
  );
  const [pushes, setPushes] = useState<PushRecord[]>([]);
  const [smtp, setSmtp] = useState<SmtpConfig | null>(null);
  const [offline, setOffline] = useState(!isTauriRuntime());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushAfterConfig, setPushAfterConfig] = useState(false);
  const [pendingCommit, setPendingCommit] = useState<Commit | null>(null);

  const load = useCallback(async () => {
    setError("");
    if (!isTauriRuntime()) {
      setOffline(true);
      setStatus("Browser preview · mail sidecar needs `npm run tauri`");
      return;
    }
    setOffline(false);
    try {
      const [projects, cfg, sent] = await Promise.all([
        pdm.listProjects(),
        mailer.getConfig(),
        mailer.listPushes(),
      ]);
      setSmtp(cfg);
      setPushes(sent);
      if (projects.length === 0) {
        setCommits([]);
        setStatus("No PDM project yet · catalog edits still list below");
        return;
      }
      const pid = projects[0].id;
      const graph = await pdm.getBranchGraph(pid);
      const branchById = new Map(graph.branches.map((b) => [b.id, b.name]));
      const rows = [...graph.nodes]
        .map((n) => ({
          ...n.commit,
          branchName: branchById.get(n.commit.branchId) ?? n.branchName,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setCommits(rows);
      const path = await pdm.dbPath();
      setStatus(`.cad_db · ${path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const rows: TimelineItem[] = [];
    for (const c of commits) {
      rows.push({
        id: `commit-${c.id}`,
        kind: "commit",
        at: c.createdAt,
        title: c.message,
        author: c.authorName,
        hash: c.id.slice(0, 7),
        branch: c.branchName,
        commit: c,
      });
    }
    for (const p of pushes) {
      rows.push({
        id: `push-${p.at}-${p.to}`,
        kind: "push",
        at: p.at,
        title: p.subject,
        author: "Mailed",
        pushTo: p.to,
      });
    }
    if (commits.length === 0) {
      for (const d of documents) {
        rows.push({
          id: `doc-${d.id}`,
          kind: "edit",
          at: d.modifiedAt,
          title: d.name,
          author: d.owner,
        });
      }
      for (const item of imports) {
        rows.push({
          id: `imp-${item.id}`,
          kind: "import",
          at: item.modifiedAt,
          title: item.name,
          author: item.owner,
        });
      }
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }, [commits, pushes, documents, imports]);

  const readyToSend = Boolean(smtp?.hasPassword && smtp.host && smtp.username);

  function requestPush(commit: Commit | null) {
    if (offline) {
      setError("Open Arbor with `npm run tauri` to send mail from this machine.");
      return;
    }
    if (!readyToSend) {
      setPendingCommit(commit);
      setPushAfterConfig(true);
      setConfigOpen(true);
      return;
    }
    setPendingCommit(commit);
    setPushOpen(true);
  }

  function onConfigSaved(cfg: SmtpConfig) {
    setSmtp(cfg);
    if (pushAfterConfig && cfg.hasPassword) {
      setPushAfterConfig(false);
      setConfigOpen(false);
      setPushOpen(true);
    }
  }

  const pushDefaults = useMemo(
    () => composePush(workspaceName, pendingCommit, smtp?.defaultRecipients ?? ""),
    [workspaceName, pendingCommit, smtp?.defaultRecipients],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0 max-w-xl flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            Local log · SMTP push
          </p>
          <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
            Activity
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recently edited revisions on this machine. Mail the{" "}
            <span className="font-mono">.cad_db</span> when a collaborator
            needs the file — there is no cloud.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPushAfterConfig(false);
              setConfigOpen(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 border border-border px-3 py-2 text-xs text-muted-foreground hover:border-accent hover:text-accent"
          >
            <Server className="h-3.5 w-3.5" strokeWidth={1.75} />
            Mail server
          </button>
          <button
            type="button"
            onClick={() => requestPush(commits[0] ?? null)}
            className="inline-flex min-h-11 items-center gap-2 bg-accent px-3 py-2 text-xs font-medium text-accent-foreground"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            Push to collaborators
          </button>
        </div>
      </header>

      <div className="flex min-w-0 items-center gap-3 border-b border-border bg-card px-6 py-2">
        <p className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          {status || "Recently edited"}
        </p>
        {offline && (
          <span className="shrink-0 border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Offline
          </span>
        )}
      </div>

      {error && (
        <div className="border-b border-red-900/40 bg-red-950/30 px-6 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {items.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">
            No revisions yet. Save one in Version Manager, or load the sample
            workspaces to see catalog edits here.
          </p>
        ) : (
          <ol className="px-6 py-5">
            {items.map((item, index) => (
              <TimelineRow
                key={item.id}
                item={item}
                isHead={index === 0}
                isLast={index === items.length - 1}
                onPush={
                  (item.kind === "commit" || index === 0) && item.kind !== "push"
                    ? () => requestPush(item.commit ?? null)
                    : undefined
                }
              />
            ))}
          </ol>
        )}
      </div>

      <EmailConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={onConfigSaved}
      />
      <PushMailDialog
        open={pushOpen}
        onClose={() => setPushOpen(false)}
        defaultTo={pushDefaults.to}
        defaultSubject={pushDefaults.subject}
        defaultBody={pushDefaults.body}
        commitId={pendingCommit?.id ?? null}
        onSent={() => {
          setStatus("Pushed over SMTP");
          void load();
        }}
      />
    </div>
  );
}

function TimelineRow({
  item,
  isHead,
  isLast,
  onPush,
}: {
  item: TimelineItem;
  isHead: boolean;
  isLast: boolean;
  onPush?: () => void;
}) {
  const kindLabel =
    item.kind === "commit"
      ? item.branch ?? "commit"
      : item.kind === "push"
        ? "mailed"
        : item.kind === "import"
          ? "imported"
          : "edited";

  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4">
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden
          className={`relative z-[1] mt-1.5 block h-2.5 w-2.5 ${
            isHead ? "bg-accent" : "border border-border bg-card"
          }`}
        />
        {!isLast && (
          <span
            aria-hidden
            className="absolute bottom-0 top-4 w-px bg-border"
          />
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-2.5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {item.hash && (
              <span className="font-mono text-[11px] text-accent">{item.hash}</span>
            )}
            {item.kind === "push" && (
              <Mail className="h-3 w-3 text-accent" strokeWidth={1.75} />
            )}
            <span className="text-sm font-medium tracking-tight text-foreground">
              {item.title}
            </span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {item.author}
            <span className="text-faint"> · {kindLabel} · </span>
            <time dateTime={item.at}>{formatModifiedLong(item.at)}</time>
            {item.pushTo && (
              <>
                <span className="text-faint"> · to </span>
                {item.pushTo}
              </>
            )}
          </p>
        </div>
        {onPush && (
          <button
            type="button"
            onClick={onPush}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
            Email repository
          </button>
        )}
      </div>
    </li>
  );
}

function composePush(
  workspaceName: string,
  commit: Commit | null,
  defaultTo: string,
): { to: string; subject: string; body: string } {
  const hash = commit ? commit.id.slice(0, 7) : "HEAD";
  const message = commit?.message ?? "current workspace";
  const subject = `[Arbor] ${workspaceName} · ${hash} ${message}`;
  const body = [
    `Attached is a snapshot of the Arbor workspace “${workspaceName}”.`,
    "",
    `Revision: ${hash}`,
    `Message: ${message}`,
    commit ? `Author: ${commit.authorName}` : null,
    commit ? `When: ${formatModifiedLong(commit.createdAt)}` : null,
    "",
    "This file is a SQLite PDM store (.cad_db), not a STEP export.",
    "Open it in Arbor on your machine. There is no cloud copy.",
    "",
    "— sent from Arbor (local SMTP sidecar)",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return { to: defaultTo, subject, body };
}

export default ActivityTab;
