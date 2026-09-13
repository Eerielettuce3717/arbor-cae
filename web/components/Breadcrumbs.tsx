import { AppLink } from "./AppLink";
import { JsonLd } from "./JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { ROUTES } from "@/lib/site";

export type Crumb = { name: string; path: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ name: "Arbor", path: ROUTES.home }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <nav
        aria-label="Breadcrumb"
        className="border-b border-rule bg-ink"
      >
        <ol className="mx-auto flex max-w-sheet flex-wrap items-center gap-2 px-[var(--gutter)] py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
          {trail.map((item, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden> / </span> : null}
                {last ? (
                  <span className="text-paper" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <AppLink href={item.path} className="hover:text-signal">
                    {item.name}
                  </AppLink>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
