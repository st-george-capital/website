"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import {
  ResearchArtwork,
  ResearchDiscipline,
} from "@/components/research-artwork";

const captions = {
  research: ["01 / Observe", "02 / Model", "03 / Test"],
  trading: ["Research", "Decision", "Execution"],
  macro: ["Across economies", "Across industries", "Across markets"],
  equity: ["The business", "The valuation", "The thesis"],
};

export function ResearchHero({
  title,
  discipline,
  subtitle,
}: {
  title: string;
  discipline: ResearchDiscipline;
  subtitle: string;
}) {
  return (
    <section className={`discipline-hero discipline-${discipline}`}>
      <div className="discipline-hero-inner">
        <motion.div
          className="discipline-copy"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="eyebrow">
            What we do <span>/</span> St. George Capital
          </p>
          <h1>{title}</h1>
          <p className="discipline-description">{subtitle}</p>
          <a href="#overview" className="text-link">
            Explore our approach <ArrowDown size={15} />
          </a>
        </motion.div>
        <ResearchArtwork discipline={discipline} />
        <div className="discipline-caption" aria-hidden="true">
          {captions[discipline].map((caption) => (
            <span key={caption}>{caption}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
