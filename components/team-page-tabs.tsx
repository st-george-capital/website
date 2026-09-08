"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function TeamPageTabs() {
  const isAlumni = useSearchParams().get("view") === "alumni";
  return (
    <nav className="team-view-links" aria-label="Team directory">
      <Link href="/team" aria-current={!isAlumni ? "page" : undefined}>
        Current Team
      </Link>
      <Link
        href="/team?view=alumni"
        aria-current={isAlumni ? "page" : undefined}
      >
        Alumni
      </Link>
    </nav>
  );
}
