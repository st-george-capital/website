'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader } from '@/components/card';
import { Linkedin } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  program: string | null;
  year: string | null;
  headshot: string | null;
  linkedin: string | null;
}

interface TeamMemberCardProps {
  member: TeamMember;
  index: number;
}

export function TeamMemberCard({ member, index }: TeamMemberCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
    >
      <Card className="text-center h-full">
        <CardHeader>
          {/* Headshot */}
          <div className="w-32 h-32 mx-auto mb-6 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
            {member.headshot ? (
              <img
                src={member.headshot}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
              </div>
            )}
          </div>

          {/* Name & Title */}
          <h3 className="text-2xl font-bold mb-2">{member.name}</h3>
          <p className="text-primary font-semibold mb-3">{member.title}</p>

          {/* Program & Year */}
          {member.program && <p className="text-muted-foreground mb-1">{member.program}</p>}
          {member.year && <p className="text-sm text-muted-foreground mb-4">{member.year}</p>}

          {/* LinkedIn Link */}
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border hover:border-primary hover:bg-primary/10 transition-all"
              aria-label={`${member.name}'s LinkedIn`}
            >
              <Linkedin className="w-5 h-5" />
            </a>
          )}
        </CardHeader>
      </Card>
    </motion.div>
  );
}

