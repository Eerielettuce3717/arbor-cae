import { Monitor, Moon, Sun } from "lucide-react";
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

export function SettingsView() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          Machine
        </p>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          Settings
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Chrome, panels, and the 3D viewport follow appearance. Default is
          dark.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="mb-2 flex max-w-xl items-baseline justify-between">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Appearance
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Active · {resolvedTheme}
          </span>
        </div>
        <div className="mt-3 grid max-w-xl grid-cols-3 border border-border">
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
  );
}

export default SettingsView;
