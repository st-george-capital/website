'use client';

import { motion } from 'framer-motion';
import { ResearchHero } from '@/components/research-hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, ArrowRight, LogIn } from 'lucide-react';
import { publicShowcaseTools } from '@/lib/tool-catalog';

const objectives = [
  {
    number: '01',
    title: 'Market Outlook',
    description: 'Comprehensive analysis of global macroeconomic trends, central bank policies, and their implications for asset allocation across equity, fixed income, and commodity markets.',
  },
  {
    number: '02',
    title: 'Industry Deep Dives',
    description: 'Sector-specific research covering competitive dynamics, regulatory landscape, technological disruption, and long-term structural trends shaping industry profitability.',
  },
  {
    number: '03',
    title: 'Company Health Evaluations',
    description: 'Fundamental analysis of individual securities including financial modeling, valuation, competitive positioning, and management quality assessment.',
  },
];

const principles = [
  {
    title: 'Bottom-Up Analysis',
    description: 'Focus on individual company fundamentals, competitive advantages, and growth potential.',
  },
  {
    title: 'Top-Down Framework',
    description: 'Understand macro trends and sector dynamics that drive investment themes.',
  },
  {
    title: 'Risk-Aware Positioning',
    description: 'Evaluate downside risks and stress scenarios for every investment thesis.',
  },
  {
    title: 'Long-Term Perspective',
    description: 'Identify sustainable competitive advantages and secular growth opportunities.',
  },
];

const processSteps = [
  { number: '01', title: 'Idea Generation', description: 'Screen for opportunities using quantitative metrics and qualitative insights.' },
  { number: '02', title: 'Due Diligence', description: 'Build financial models, analyze industry dynamics, assess management quality.' },
  { number: '03', title: 'Thesis Development', description: 'Articulate investment rationale, target price, risks, and catalysts.' },
  { number: '04', title: 'Monitoring & Updates', description: 'Track performance, update models, reassess thesis as new information emerges.' },
];

const coverageAreas = [
  'Technology & Software',
  'Financial Services',
  'Consumer & Retail',
  'Healthcare & Biotech',
  'Energy & Materials',
  'Industrials',
];

export default function EquityMacroResearchPage() {
  return (
    <>
      <ResearchHero title="Equity & Macro Research" discipline="macro" subtitle="From macroeconomic outlooks to company-specific deep dives." />

      {/* Overview — off-white */}
      <Section id="overview" tone="offwhite" className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
              Equity &amp; Macro Research
            </div>
            <h2 className="font-serif text-4xl md:text-[44px] font-bold">
              Global markets. Individual businesses.
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
              Our Equity & Macro Research division combines traditional fundamental analysis with modern data analytics to generate actionable investment insights across global markets.
            </p>
            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
              We train members in financial modeling, valuation techniques, and macroeconomic analysis—skills essential for careers in equity research, portfolio management, and investment banking.
            </p>
          </div>
        </div>
      </Section>

      {/* Editorial image + content block — photo bleeds full-bleed, text side navy */}
      <div className="grid md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative h-[360px] md:h-auto md:min-h-[420px]"
        >
          <Image
            src="/images/webphotos/mne.jpg"
            alt="Equity & Macro Research Team"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-surface-navy text-white flex flex-col justify-center px-8 py-16 md:px-16"
        >
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-6">
            Generating Investment Insights
          </h3>
          <p className="text-base md:text-[17px] text-white/70 leading-relaxed">
            From macroeconomic outlooks to company-specific deep dives, our research team produces institutional-grade analysis across asset classes and geographies.
          </p>
        </motion.div>
      </div>

      {/* Research Objectives — 3-card grid, white */}
      <Section tone="white" className="!py-12 !md:py-16">
        <SectionHeader
          title="Research Objectives"
          subtitle="Three pillars of our analytical framework"
        />

        <div className="grid md:grid-cols-3 gap-6">
          {objectives.map((objective, index) => (
            <motion.div
              key={objective.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card flat className="h-full">
                <CardHeader className="p-8">
                  <div className="font-serif text-2xl font-semibold text-muted-foreground/60 mb-4">
                    {objective.number}
                  </div>
                  <CardTitle className="text-xl mb-3">{objective.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {objective.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Investment Principles — contrasting blue-grey band, no per-item cards */}
      <Section tone="blue-grey" className="!py-12 !md:py-16">
        <SectionHeader
          title="Investment Principles"
          subtitle="Our disciplined approach to equity investing"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {principles.map((principle, index) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="font-serif text-xl font-semibold">{principle.title}</h3>
              </div>
              <div className="border-t border-surface-border pt-3">
                <p className="text-base text-muted-foreground leading-relaxed">
                  {principle.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Research Process — horizontal timeline on desktop, vertical on mobile, white */}
      <Section tone="white">
        <SectionHeader title="Research Process" />

        <ol className="research-process">
          {processSteps.map(step => <li key={step.number}><span className="process-number">{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}
        </ol>
      </Section>

      {/* Typical Coverage Areas — squared pills, secondary, off-white */}
      <Section tone="offwhite" className="!py-10 !md:py-14">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-5">
          Typical Coverage Areas
        </div>
        <div className="flex flex-wrap gap-3">
          {coverageAreas.map((sector) => (
            <span
              key={sector}
              className="inline-flex items-center border border-surface-border rounded-md px-3.5 py-1.5 text-sm text-muted-foreground bg-white"
            >
              {sector}
            </span>
          ))}
        </div>
      </Section>

      {/* Tools showcase — capability marketing, login-gated CTA, white */}
      <Section tone="white">
        <SectionHeader
          title="Inside the Terminal"
          subtitle="A look at the research infrastructure members use every day"
        />

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {publicShowcaseTools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
            >
              <Card flat className="h-full">
                <CardHeader className="p-8">
                  <tool.icon className="w-5 h-5 text-primary mb-4" />
                  <CardTitle className="text-lg mb-2">{tool.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Log in to explore the full toolkit
            </Link>
          </Button>
        </div>
      </Section>

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
              Ready to Dive Deep?
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Join our equity research team and develop the analytical skills that top investors value.
            </p>
            <Button size="lg" asChild>
              <Link href="/contact">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </Section>
    </>
  );
}
