"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef } from "react";

export function CampusFeature() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [-24, 24]);
  return (
    <section id="about" className="campus-feature" ref={ref}>
      <div className="chapter-heading">
        <span className="eyebrow">01 / Our foundation</span>
        <span className="chapter-location">St. George Campus, Toronto</span>
      </div>
      <div className="campus-heading">
        <h2>
          Engineered <span className="campus-at">@</span>
          <br />
          <span className="campus-university">UofT.</span>
          <span className="campus-for">For UofT.</span>
        </h2>
        <div className="campus-intro">
          <p>
            St. George Capital is Canada's premier student-led quantitative and
            fundamental research organization at the University of Toronto.
          </p>
          <p>
            We develop tomorrow's market leaders through rigorous training,
            cutting-edge research, and real-world market experience.
          </p>
          <Link href="/culture" className="campus-link">
            Inside our community <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <div className="campus-composition">
        <figure className="campus-building">
          <motion.div style={{ y: reduced ? 0 : imageY }}>
            <Image
              src="/images/campus/bahen-centre.jpg"
              alt="Bahen Centre for Information Technology at the University of Toronto"
              fill
              sizes="(min-width: 768px) 70vw, 100vw"
              className="object-cover"
            />
          </motion.div>
          <figcaption>
            Bahen Centre <span>University of Toronto</span>
          </figcaption>
        </figure>
        <figure className="campus-team">
          <div className="campus-team-image">
            <Image
              src="/images/webphotos/engineeredatuoft.jpg"
              alt="SGC members presenting their research at the University of Toronto"
              fill
              sizes="(min-width: 768px) 30vw, 70vw"
              className="object-cover"
            />
          </div>
          <figcaption>
            From the classroom
            <br />
            to the markets.
            <ArrowUpRight size={28} aria-hidden="true" />
          </figcaption>
        </figure>
        <span className="campus-coordinate" aria-hidden="true">
          TORONTO / CANADA
        </span>
      </div>
      <p className="campus-credit">
        Campus photograph:{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Bahen_Front_View.jpg"
          target="_blank"
          rel="noreferrer"
        >
          Sabrerider
        </a>{" "}
        /{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/3.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 3.0
        </a>

      </p>
    </section>
  );
}
