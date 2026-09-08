import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

type PreviewItem = {
  key: string;
  href: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  date: Date;
  tag: string;
};

async function getLatestResearch(): Promise<PreviewItem[]> {
  const [articles, reports] = await Promise.all([
    prisma.article.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
    prisma.equityResearchReport.findMany({
      where: { published: true, showOnWebsite: true },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
  ]);

  const articleItems: PreviewItem[] = articles
    .filter((a) => a.publishedAt)
    .map((a) => ({
      key: `article-${a.id}`,
      href: `/research/${a.slug}`,
      title: a.title,
      excerpt: a.excerpt,
      coverImage: a.coverImage,
      date: a.publishedAt as Date,
      tag: "Our Take",
    }));

  const reportItems: PreviewItem[] = reports
    .filter((r) => r.publishedAt)
    .map((r) => ({
      key: `report-${r.id}`,
      href: `/equity-research/${r.ticker}`,
      title: `${r.companyName} (${r.ticker})`,
      excerpt: `${r.recommendation} — ${r.timeHorizon} target ${r.currency} ${r.targetPrice}`,
      coverImage: r.coverImage,
      date: r.publishedAt as Date,
      tag: "Equity Research",
    }));

  return [...articleItems, ...reportItems]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);
}

export async function LatestResearchPreview() {
  let items: PreviewItem[];
  try {
    items = await getLatestResearch();
  } catch (error) {
    console.error("Unable to load research preview", error);
    return (
      <div className="py-8">
        <p className="eyebrow mb-5">Latest Research</p>
        <h2 className="text-4xl mb-6">From the desk</h2>
        <p className="text-muted-foreground mb-6">
          Research is temporarily unavailable.
        </p>
        <Link href="/research" className="inline-flex items-center gap-3">
          Explore our research <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
            Latest Research
          </div>
          <h2 className="font-serif text-4xl md:text-[44px] font-bold">
            From the desk
          </h2>
        </div>
        <Link
          href="/research"
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          View all research
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div data-research-grid>
        {items.map((item, index) => (
          <Link
            key={item.key}
            href={item.href}
            className={`research-entry group ${index === 0 ? "research-feature" : ""}`}
          >
            {item.coverImage && (
              <div
                className={`relative overflow-hidden mb-5 ${index === 0 ? "h-64 md:h-80" : "h-36"}`}
              >
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-primary/70">
              <span>{item.tag}</span>
              <span>
                {item.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <h3>{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {item.excerpt}
            </p>
            <span className="inline-flex gap-5 items-center text-xs mt-6 mb-4">
              Read research <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Link
          href="/research"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          View all research
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
