import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react";
import { Logo } from "../ui/Logo";

export type ShellNavId =
  | "dashboard"
  | "activity"
  | "analytics"
  | "settings"
  | "profile";

const TOP_ITEMS: {
  id: ShellNavId;
  label: string;
  Icon: typeof LayoutDashboard;
}[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
];

const BOTTOM_ITEMS: {
  id: ShellNavId;
  label: string;
  Icon: typeof Settings;
}[] = [
  { id: "settings", label: "Settings", Icon: Settings },
  { id: "profile", label: "User Profile", Icon: User },
];

export function NavRail({
  active,
  onNavigate,
}: {
  active: ShellNavId;
  onNavigate: (id: ShellNavId) => void;
}) {
  return (
    <nav
      aria-label="Arbor"
      className="flex w-14 shrink-0 flex-col border-r border-border bg-card"
    >
      <div className="flex h-12 items-center justify-center border-b border-border">
        <span className="border border-border">
          <Logo markOnly className="h-7 w-7" />
        </span>
      </div>

      <div className="flex flex-1 flex-col items-stretch py-2">
        {TOP_ITEMS.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>

      <div className="flex flex-col items-stretch border-t border-border py-2">
        {BOTTOM_ITEMS.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}

function RailButton({
  item,
  active,
  onClick,
}: {
  item: {
    id: ShellNavId;
    label: string;
    Icon: typeof LayoutDashboard;
  };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`relative flex h-11 items-center justify-center transition-colors hover:bg-hover hover:text-accent ${
        active ? "text-accent" : "text-foreground/70"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-0.5 bg-accent"
        />
      )}
      <item.Icon
        className="h-[18px] w-[18px]"
        strokeWidth={active ? 2.25 : 1.75}
      />
    </button>
  );
}

export default NavRail;
