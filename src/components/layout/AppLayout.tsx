import type { ReactNode } from "react";
import { NavRail, type ShellNavId } from "./NavRail";
import {
  StudioChrome,
  type StudioChromeProps,
  type WorkspaceTab,
} from "./StudioChrome";

export type { WorkspaceTab, ShellNavId };
export type AppSurface =
  | ShellNavId
  | "workspace"
  | "studio"
  | "versions"
  | "releases";

export interface AppLayoutProps extends StudioChromeProps {
  surface: AppSurface;
  onNavigate: (id: ShellNavId) => void;
  children?: ReactNode;
}

function railActive(surface: AppSurface): ShellNavId {
  if (
    surface === "activity" ||
    surface === "analytics" ||
    surface === "settings" ||
    surface === "profile"
  ) {
    return surface;
  }
  return "dashboard";
}

export function AppLayout({
  surface,
  onNavigate,
  children,
  ...studioProps
}: AppLayoutProps) {
  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <NavRail active={railActive(surface)} onNavigate={onNavigate} />
      {surface === "studio" ? (
        <StudioChrome {...studioProps}>{children}</StudioChrome>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      )}
    </div>
  );
}

export default AppLayout;
