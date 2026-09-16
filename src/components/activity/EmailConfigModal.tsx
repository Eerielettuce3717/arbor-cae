import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Lock, Server, X } from "lucide-react";
import { EMPTY_SMTP, mailer, type SmtpConfig } from "../../lib/mailerApi";
import { isTauriRuntime } from "../../lib/pdmApi";

const PRESETS: {
  id: string;
  label: string;
  host: string;
  port: number;
  starttls: boolean;
  hint: string;
}[] = [
  {
    id: "gmail",
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    starttls: true,
    hint: "smtp.gmail.com",
  },
  {
    id: "outlook",
    label: "Outlook",
    host: "smtp.office365.com",
    port: 587,
    starttls: true,
    hint: "smtp.office365.com",
  },
  {
    id: "custom",
    label: "Custom",
    host: "",
    port: 587,
    starttls: true,
    hint: "Your SMTP host",
  },
];

export interface EmailConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (config: SmtpConfig) => void;
}

export function EmailConfigModal({
  open,
  onClose,
  onSaved,
}: EmailConfigModalProps) {
  const titleId = useId();
  const firstField = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY_SMTP);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setStatus("");
    if (!isTauriRuntime()) {
      setForm(EMPTY_SMTP);
      setStatus(
        "Credentials stay on this machine. Open Arbor with `npm run tauri` to store an app password.",
      );
      const t = window.setTimeout(() => firstField.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
    void mailer
      .getConfig()
      .then((cfg) => {
        setForm(cfg);
        setStatus(
          cfg.hasPassword
            ? "Password is stored in Arbor’s application data (user-only file)."
            : "No password stored yet.",
        );
      })
      .catch((e) => {
        setForm(EMPTY_SMTP);
        setError(e instanceof Error ? e.message : String(e));
      });
    const t = window.setTimeout(() => firstField.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function patch<K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await mailer.saveConfig({
        host: form.host,
        port: Number(form.port) || 587,
        username: form.username,
        fromAddress: form.fromAddress || form.username,
        useStarttls: form.useStarttls,
        defaultRecipients: form.defaultRecipients,
        password: password.trim() ? password : null,
      });
      setForm(saved);
      setPassword("");
      setStatus("Saved on this machine. Arbor never uploads credentials.");
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-background/80 p-4 sm:p-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            <Server className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2
              id={titleId}
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Mail server
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-faint hover:bg-hover hover:text-accent"
            aria-label="Close mail server settings"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <form onSubmit={(e) => void onSubmit(e)} className="min-h-0 overflow-auto">
          <div className="space-y-4 px-4 py-4">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Collaborators receive the workspace as email. Use a provider app
              password (Gmail: Google Account → Security → App passwords).
            </p>

            <fieldset>
              <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Provider
              </legend>
              <div className="grid grid-cols-3 border border-border">
                {PRESETS.map((preset) => {
                  const selected =
                    preset.id === "custom"
                      ? !PRESETS.slice(0, 2).some(
                          (p) => p.host === form.host && p.port === form.port,
                        )
                      : form.host === preset.host && form.port === preset.port;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (preset.host) patch("host", preset.host);
                        patch("port", preset.port);
                        patch("useStarttls", preset.starttls);
                      }}
                      className={`flex min-h-11 flex-col items-start gap-0.5 border-r border-border px-3 py-2.5 last:border-r-0 ${
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "bg-card text-muted-foreground hover:bg-hover hover:text-accent"
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="text-xs font-semibold tracking-tight">
                        {preset.label}
                      </span>
                      <span
                        className={`text-[10px] leading-tight ${
                          selected ? "text-accent-foreground/80" : "text-faint"
                        }`}
                      >
                        {preset.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5.5rem]">
              <Field label="SMTP host" htmlFor="smtp-host">
                <input
                  ref={firstField}
                  id="smtp-host"
                  value={form.host}
                  onChange={(e) => patch("host", e.target.value)}
                  autoComplete="off"
                  required
                  className="w-full border border-border bg-muted px-2.5 py-2 font-mono text-xs"
                />
              </Field>
              <Field label="Port" htmlFor="smtp-port">
                <input
                  id="smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => patch("port", Number(e.target.value))}
                  className="w-full border border-border bg-muted px-2.5 py-2 font-mono text-xs"
                />
              </Field>
            </div>

            <label className="flex min-h-11 items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={form.useStarttls}
                onChange={(e) => patch("useStarttls", e.target.checked)}
                className="accent-accent"
              />
              STARTTLS on port 587 (off = SSL, typically 465)
            </label>

            <Field label="Username" htmlFor="smtp-user">
              <input
                id="smtp-user"
                type="email"
                value={form.username}
                onChange={(e) => patch("username", e.target.value)}
                autoComplete="username"
                required
                className="w-full border border-border bg-muted px-2.5 py-2 text-xs"
              />
            </Field>
            <Field label="From address" htmlFor="smtp-from">
              <input
                id="smtp-from"
                type="email"
                value={form.fromAddress}
                onChange={(e) => patch("fromAddress", e.target.value)}
                placeholder="Same as username if blank"
                autoComplete="email"
                className="w-full border border-border bg-muted px-2.5 py-2 text-xs"
              />
            </Field>
            <Field
              label={
                form.hasPassword
                  ? "App password (leave blank to keep stored)"
                  : "App password"
              }
              htmlFor="smtp-pass"
            >
              <span className="relative block">
                <Lock
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                  strokeWidth={1.75}
                />
                <input
                  id="smtp-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required={!form.hasPassword}
                  className="w-full border border-border bg-muted py-2 pl-8 pr-2.5 font-mono text-xs tracking-wider"
                />
              </span>
            </Field>
            <Field
              label="Default collaborators"
              htmlFor="smtp-to"
              hint="Comma-separated. Used when you push without typing recipients."
            >
              <input
                id="smtp-to"
                value={form.defaultRecipients}
                onChange={(e) => patch("defaultRecipients", e.target.value)}
                placeholder="name@shop.example, other@studio.example"
                className="w-full border border-border bg-muted px-2.5 py-2 text-xs"
              />
            </Field>

            {status && (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {status}
              </p>
            )}
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
              className="min-h-11 border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-accent"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving || !isTauriRuntime()}
              className="min-h-11 bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save on this machine"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}
