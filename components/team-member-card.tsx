"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  title: string;
  program: string | null;
  year: string | null;
  headshot: string | null;
  linkedin: string | null;
}

export function TeamMemberCard({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) {
  return (
    <motion.article
      className="team-portrait"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.06 }}
    >
      <div className="portrait-frame">
        <div className="portrait-frame-heading">
          <span>SGC / Leadership</span>
          <span>{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="portrait-image">
          {member.headshot ? (
            <Image
              src={member.headshot}
              alt={member.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <span className="portrait-initials">
              {member.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          )}
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="portrait-social"
              aria-label={`${member.name}'s LinkedIn`}
            >
              <ArrowUpRight size={20} />
            </a>
          )}
        </div>
      </div>
      <div className="portrait-details">
        <h3>{member.name}</h3>
        <p className="portrait-title">{member.title}</p>
        {member.program && (
          <p className="portrait-program">
            {member.program}
            {member.year && <span> / {member.year}</span>}
          </p>
        )}
      </div>
    </motion.article>
  );
}
