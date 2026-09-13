import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PageShell({
  children,
  crumbs,
}: {
  children: ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <div className="sheet-grid min-h-full">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      {crumbs && crumbs.length > 0 ? <Breadcrumbs items={crumbs} /> : null}
      {children}
      <SiteFooter />
    </div>
  );
}
