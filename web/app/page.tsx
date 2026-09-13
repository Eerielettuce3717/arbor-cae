import { FeatureBento } from "@/components/FeatureBento";
import { Hero } from "@/components/Hero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TechSpec } from "@/components/TechSpec";

export default function Home() {
  return (
    <div className="sheet-grid min-h-full">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <FeatureBento />
        <TechSpec />
      </main>
      <SiteFooter />
    </div>
  );
}
