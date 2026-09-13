import { Monitor, Moon, Settings, Sun, X } from "lucide-react";
import type { ThemePreference } from "../../theme/types";
import { useTheme } from "../../providers/ThemeProvider";

const APPEARANCE_OPTIONS: {
  id: ThemePreference;
  label: string;
  hint: string;
  Icon: typeof Sun;
}[] = [
  { id: "light", label: "Light", hint: "High-contrast sheet", Icon: Sun },
  { id: "dark", label: "Dark", hint: "Mill-control black", Icon: Moon },
  { id: "system", label: "System Default", hint: "Match OS", Icon: Monitor },
];

export interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-background/80 p-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
        className="w-full max-w-lg border border-border bg-card"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2
              id="preferences-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-faint hover:bg-hover hover:text-accent"
            aria-label="Close preferences"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="px-4 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Appearance
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Active · {resolvedTheme}
            </span>
          </div>
          <p className="mb-3 text-[11px] leading-snug text-faint">
            Chrome, panels, and the 3D viewport follow this setting. System
            Default tracks{" "}
            <span className="font-mono">prefers-color-scheme</span>.
          </p>

          <div className="grid grid-cols-3 border border-border">
            {APPEARANCE_OPTIONS.map(({ id, label, hint, Icon }) => {
              const selected = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={`flex flex-col items-center gap-2 border-r border-border px-3 py-4 last:border-r-0 ${
                    selected
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-hover hover:text-accent"
                  }`}
                  aria-pressed={selected}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-xs font-semibold tracking-tight">
                    {label}
                  </span>
                  <span
                    className={`text-[10px] leading-tight ${
                      selected ? "text-accent-foreground/80" : "text-faint"
                    }`}
                  >
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreferencesModal;
