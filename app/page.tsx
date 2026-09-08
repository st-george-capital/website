import { Suspense } from "react";
import { HomeContent } from "@/components/home-content";
import { LatestResearchPreview } from "@/components/latest-research-preview";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <HomeContent
      research={
        <Suspense
          fallback={
            <p className="py-12 text-muted-foreground">
              Loading latest research…
            </p>
          }
        >
          <LatestResearchPreview />
        </Suspense>
      }
    />
  );
}
