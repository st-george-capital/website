'use client';

import { motion } from 'framer-motion';
import { CapstoneSpotlight } from '@/components/capstone-spotlight';
import { ResearchHero } from '@/components/research-hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Award, Users, Lightbulb, ArrowRight } from 'lucide-react';

const activities = [
  {
    icon: BookOpen,
    title: 'Technical Workshops',
    description: 'Weekly sessions covering topics from Python programming to advanced statistical modeling and machine learning applications in finance.',
  },
  {
    icon: Users,
    title: 'Guest Lectures',
    description: 'Industry professionals and academics share insights on quantitative finance, market structure, and career development.',
  },
  {
    icon: Lightbulb,
    title: 'Research Seminars',
    description: 'Members present original research, discuss recent papers, and collaborate on innovative trading strategies.',
  },
  {
    icon: Award,
    title: 'Case Competitions',
    description: 'Participate in quantitative finance competitions including datathons, trading challenges, and research presentations.',
  },
];

const pillars = [
  {
    number: '01',
    title: 'Theoretical Foundation',
    description: 'Ground our strategies in solid mathematical and statistical theory, ensuring robustness and reproducibility.',
  },
  {
    number: '02',
    title: 'Empirical Testing',
    description: 'Validate hypotheses through rigorous backtesting, statistical analysis, and out-of-sample verification.',
  },
  {
    number: '03',
    title: 'Practical Implementation',
    description: 'Bridge the gap between theory and practice by implementing research findings in real trading systems.',
  },
];

export default function QuantResearchPage() {
  return (
    <>
      <ResearchHero title="Quantitative Research" discipline="research" subtitle="Rigorous academic research, practical experimentation, and collaborative learning." />

      {/* Overview — off-white */}
      <Section id="overview" tone="offwhite" className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
              Quantitative Research
            </div>
            <h2 className="font-serif text-4xl md:text-[44px] font-bold">
              Research through experimentation
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
              Our Quantitative Research division is dedicated to advancing the frontiers of financial knowledge through rigorous academic research, practical experimentation, and collaborative learning.
            </p>
            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
              We provide a structured curriculum and research framework that prepares members for careers in quantitative finance, whether in buy-side research, algorithmic trading, or academic pursuits.
            </p>
          </div>
        </div>
      </Section>

      {/* Editorial image + content block */}
      <div className="grid md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-surface-navy text-white flex flex-col justify-center px-8 py-16 md:px-16 order-2 md:order-1"
        >
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-6">
            Advancing Financial Knowledge
          </h3>
          <p className="text-base md:text-[17px] text-white/70 leading-relaxed">
            Through workshops, seminars, and collaborative research projects, we cultivate the next generation of quantitative finance professionals.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative h-[360px] md:h-auto md:min-h-[420px] order-1 md:order-2"
        >
          <Image
            src="/images/webphotos/quantresearch.jpg"
            alt="Quantitative Research Team"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </motion.div>
      </div>

      {/* What We Do — 4-card grid, white */}
      <Section tone="white" className="!py-12 !md:py-16">
        <SectionHeader
          title="What We Do"
          subtitle="Educational programs and research activities"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card flat className="h-full">
                <CardHeader className="p-8">
                  <activity.icon className="w-5 h-5 text-primary mb-4" />
                  <CardTitle className="text-xl mb-2">{activity.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {activity.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Research Excellence — numbered blurbs, blue-grey band */}
      <Section tone="blue-grey" className="!py-12 !md:py-16">
        <SectionHeader
          title="Research Excellence"
          subtitle="Our approach to quantitative financial research"
        />

        <div className="grid md:grid-cols-3 gap-10">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="font-serif text-3xl font-semibold text-primary/70 mb-4">{pillar.number}</div>
              <h3 className="font-serif text-xl font-semibold mb-3">{pillar.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      <CapstoneSpotlight />

      {/* CTA — navy */}
      <Section tone="navy">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Join Our Research Community
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Collaborate with passionate researchers and build expertise in quantitative finance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Get Involved
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/research">
                  View Research
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>
    </>
  );
}
