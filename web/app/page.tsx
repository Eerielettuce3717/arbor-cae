import { FeatureBento } from "@/components/FeatureBento";
import { Hero } from "@/components/Hero";
import { PageShell } from "@/components/PageShell";
import { TechSpec } from "@/components/TechSpec";

export default function Home() {
  return (
    <PageShell>
      <main id="main">
        <Hero />
        <FeatureBento />
        <TechSpec />
      </main>
    </PageShell>
  );
}
