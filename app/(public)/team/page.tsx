import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TeamMemberCard } from "@/components/team-member-card";
import { TeamPageTabs } from "@/components/team-page-tabs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const isAlumni = searchParams.view === "alumni";
  const members = await prisma.teamMember.findMany({
    where: isAlumni
      ? { isAlumni: true }
      : { isExecutive: true, isAlumni: false },
    orderBy: { order: "asc" },
  });
  return (
    <div className="leadership-page">
      <header className="leadership-intro">
        <p className="eyebrow">The people behind St. George Capital</p>
        <div>
          <h1>
            Leadership<span>.</span>
          </h1>
          <p>
            Shaping strategy and vision.
            <br />
            Our leadership team sets the direction for our research, our people,
            and our community.
          </p>
        </div>
      </header>
      <section
        className="leadership-directory"
        aria-label={isAlumni ? "Alumni" : "Executive team"}
      >
        <div className="directory-heading">
          <h2>{isAlumni ? "Alumni" : "Executive Team"}</h2>
          <Suspense>
            <TeamPageTabs />
          </Suspense>
        </div>
        {members.length ? (
          <div className="portrait-grid">
            {members.map((member, index) => (
              <TeamMemberCard member={member} index={index} key={member.id} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-muted-foreground">
            {isAlumni
              ? "No alumni records yet."
              : "Team details will be available soon."}
          </p>
        )}
      </section>
      <section className="leadership-invitation">
        <div>
          <p className="eyebrow">Join the community</p>
          <h2>Find your place at SGC.</h2>
        </div>
        <Link href="/contact">
          Get in touch <ArrowUpRight size={22} />
        </Link>
      </section>
    </div>
  );
}
