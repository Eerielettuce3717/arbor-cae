import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  part: "Part Studio",
  assembly: "Assembly",
  drawing: "Drawing",
  cam: "CAM Studio",
  simulation: "Simulation Studio",
  render: "Render Studio",
  pcb: "PCB Studio",
};

export interface StudioLayoutProps {
  workspaceName?: string;
  documentTitle?: string;
  studioKind?: string;
  dirty?: boolean;
  onExitToWorkspace?: () => void;
  onSave?: () => void;
  children: ReactNode;
}

function modifierHint(): string {
  if (typeof navigator === "undefined") return "Ctrl+[";
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return mac ? "⌘[" : "Ctrl+[";
}

/**
 * Persistent studio chrome: exit to the workspace list, plus a save prompt
 * when the session is dirty. Intercepts browser-back (trackpad swipe, mouse
 * back button) and Cmd/Ctrl+[ so leaving a studio is always intentional.
 */
export function StudioLayout({
  workspaceName,
  documentTitle,
  studioKind,
  dirty = false,
  onExitToWorkspace,
  onSave,
  children,
}: StudioLayoutProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const exitingRef = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const exitRef = useRef(onExitToWorkspace);
  exitRef.current = onExitToWorkspace;

  const leave = useCallback(() => {
    exitingRef.current = true;
    setConfirmOpen(false);
    const onPop = exitRef.current;
    if (typeof history !== "undefined" && history.state?.arborStudio) {
      history.back();
    }
    onPop?.();
  }, []);

  const requestExit = useCallback(() => {
    if (!exitRef.current) return;
    if (dirtyRef.current) {
      setConfirmOpen(true);
      return;
    }
    leave();
  }, [leave]);

  useEffect(() => {
    if (typeof history === "undefined") return;
    const marker = { arborStudio: true };
    if (!history.state?.arborStudio) {
      history.pushState(marker, "");
    }

    const onPopState = () => {
      if (exitingRef.current) return;
      history.pushState(marker, "");
      requestExit();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "[") {
        event.preventDefault();
        requestExit();
        return;
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        requestExit();
      }
    };

    const onBrowserBack = (event: MouseEvent) => {
      if (event.button !== 3) return;
      event.preventDefault();
      requestExit();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mouseup", onBrowserBack);
    window.addEventListener("auxclick", onBrowserBack);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", onBrowserBack);
      window.removeEventListener("auxclick", onBrowserBack);
    };
  }, [requestExit]);

  useEffect(() => {
    if (!confirmOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  const kindLabel = studioKind ? (KIND_LABEL[studioKind] ?? studioKind) : null;
  const hint = modifierHint();

  return (
    <div
      data-explorer="studio-layout"
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground"
    >
      <header className="flex h-9 shrink-0 items-stretch border-b border-border bg-card">
        <button
          type="button"
          onClick={requestExit}
          className="flex items-center gap-2 border-r border-border bg-active px-3 text-[12px] font-medium text-accent hover:bg-hover hover:text-accent"
          title={`Exit to Workspace (${hint})`}
        >
          <ArrowLeft className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          <span>Exit to Workspace</span>
          <kbd className="hidden font-mono text-[10px] font-normal text-faint sm:inline">
            {hint}
          </kbd>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
          {kindLabel && (
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              {kindLabel}
            </span>
          )}
          {documentTitle && (
            <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight">
              {documentTitle}
            </span>
          )}
          {dirty && (
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 px-3">
          {workspaceName && (
            <span className="hidden max-w-[180px] truncate text-[11px] text-muted-foreground md:inline">
              {workspaceName}
            </span>
          )}
          <span className="font-mono text-[10px] text-faint">mm · ISO</span>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

      {confirmOpen && (
        <div
          className="absolute inset-0 z-50 flex items-start justify-center bg-background/80 pt-24"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-exit-title"
            className="w-[min(420px,calc(100%-2rem))] border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <h2
                id="studio-exit-title"
                className="text-sm font-semibold tracking-tight"
              >
                Save before leaving?
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {documentTitle ?? "This document"} has unsaved changes. Save
                them before returning to the workspace, or discard and exit.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-hover hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={leave}
                className="border border-border px-3 py-1.5 text-[12px] text-foreground hover:bg-hover"
              >
                Don&apos;t Save
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  saveRef.current?.();
                  leave();
                }}
                className="bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground hover:brightness-110"
              >
                Save and Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudioLayout;
