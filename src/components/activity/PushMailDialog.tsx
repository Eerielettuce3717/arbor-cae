import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Mail, X } from "lucide-react";
import { mailer } from "../../lib/mailerApi";

export interface PushMailDialogProps {
  open: boolean;
  onClose: () => void;
  defaultTo: string;
  defaultSubject: string;
  defaultBody: string;
  commitId?: string | null;
  onSent?: (to: string) => void;
}

export function PushMailDialog({
  open,
  onClose,
  defaultTo,
  defaultSubject,
  defaultBody,
  commitId,
  onSent,
}: PushMailDialogProps) {
  const titleId = useId();
  const toRef = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTo(defaultTo);
    setSubject(defaultSubject);
    setBody(defaultBody);
    setError("");
    const t = window.setTimeout(() => toRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open, defaultTo, defaultSubject, defaultBody]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, sending]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await mailer.send({
        to,
        subject,
        body,
        commitId: commitId ?? null,
      });
      onSent?.(to);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-background/80 p-4 sm:p-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-full w-full max-w-lg flex-col border border-border bg-card"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2
              id={titleId}
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Push to collaborators
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded p-1 text-faint hover:bg-hover hover:text-accent disabled:opacity-40"
            aria-label="Close push dialog"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Attaches a consistent snapshot of this machine’s{" "}
              <span className="font-mono">.cad_db</span>. The message is marked
              Important. Nothing is uploaded to a CAD cloud.
            </p>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                To
              </span>
              <input
                ref={toRef}
                type="text"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="collaborator@shop.example"
                className="w-full border border-border bg-muted px-2.5 py-2 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Subject
              </span>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-border bg-muted px-2.5 py-2 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Body
              </span>
              <textarea
                required
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full resize-y border border-border bg-muted px-2.5 py-2 font-mono text-[11px] leading-relaxed"
              />
            </label>
            {error && (
              <p className="text-[11px] leading-snug text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="min-h-11 border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              aria-busy={sending}
              className="min-h-11 bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
            >
              {sending ? "Sending…" : "Email repository"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
