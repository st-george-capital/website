'use client';

import { motion } from 'framer-motion';
import { ResearchHero } from '@/components/research-hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Brain, TrendingUp, Database, LineChart, ArrowRight } from 'lucide-react';

const focusAreas = [
  {
    icon: Brain,
    title: 'Machine Learning & AI',
    description: 'Implementing deep learning models for market prediction, sentiment analysis, and pattern recognition in financial time series data.',
  },
  {
    icon: TrendingUp,
    title: 'High-Frequency Strategy',
    description: 'Developing low-latency trading systems and algorithms for capturing micro-inefficiencies in market microstructure.',
  },
  {
    icon: Database,
    title: 'Portfolio Optimization',
    description: 'Advanced portfolio construction using modern optimization techniques, risk parity, and factor-based allocation strategies.',
  },
  {
    icon: LineChart,
    title: 'Risk Management',
    description: 'Comprehensive risk modeling including VaR, CVaR, stress testing, and real-time portfolio monitoring systems.',
  },
];

const projects = [
  {
    title: 'CVaR Portfolio Optimizer',
    description: 'A historical-scenario optimizer that minimizes portfolio tail risk while enforcing position, sector, region, and factor constraints, with optional turnover limits.',
    tags: ['Linear Programming', 'Historical Scenarios', 'Portfolio Risk'],
  },
  {
    title: 'Macro Research Engine',
    description: 'An integrated workflow for macro data, factor construction, regime analysis, and signal research, with rolling train/test windows and a separate holdout period.',
    tags: ['Regime Analysis', 'Factor Research', 'Walk-Forward Testing'],
  },
  {
    title: 'Trade Radar',
    description: 'A research workspace that brings together watchlists, market signals, and briefing workflows to support the evaluation and monitoring of trade ideas.',
    tags: ['Watchlists', 'Signals', 'Research Briefs'],
  },
  {
    title: 'Portfolio Analytics',
    description: 'A connected portfolio workspace for holdings, trade history, benchmark comparisons, and portfolio snapshots.',
    tags: ['Holdings', 'Benchmarks', 'Trade History'],
  },
];

export default function QuantTradingPage() {
  return (
    <>
      <ResearchHero title="Quantitative Trading" discipline="trading" subtitle="Building systematic strategies. From research to practical implementation." />

      {/* Overview — off-white */}
      <Section id="overview" tone="offwhite" className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
              Quantitative Trading
            </div>
            <h2 className="font-serif text-4xl md:text-[44px] font-bold">
              From research to implementation
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
              Our Quantitative Trading division focuses on developing systematic trading strategies that leverage cutting-edge technology, mathematical models, and data science to identify and capture market opportunities.
            </p>
            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
              We combine rigorous academic research with practical implementation, giving members hands-on experience in building production-grade trading systems.
            </p>
          </div>
        </div>
      </Section>

      {/* Editorial image + content block */}
      <div className="grid md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative h-[360px] md:h-auto md:min-h-[420px]"
        >
          <Image
            src="/images/webphotos/quanttrading.jpg"
            alt="Quantitative Trading Team"
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
            Building Systematic Strategies
          </h3>
          <p className="text-base md:text-[17px] text-white/70 leading-relaxed">
            Our members develop and backtest quantitative strategies, learning the full lifecycle of algorithmic trading from research to production deployment.
          </p>
        </motion.div>
      </div>

      {/* Focus Areas — 4-card grid, white */}
      <Section tone="white" className="!py-12 !md:py-16">
        <SectionHeader
          title="Focus Areas"
          subtitle="Core competencies and research domains"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {focusAreas.map((area, index) => (
            <motion.div
              key={area.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card flat className="h-full">
                <CardHeader className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <area.icon className="w-5 h-5 text-primary" />
                    <div className="font-serif text-lg font-semibold text-muted-foreground/60">
                      0{index + 1}
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-2">{area.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {area.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Featured Projects — blue-grey band, squared tag pills */}
      <Section tone="blue-grey" className="!py-12 !md:py-16">
        <SectionHeader
          title="Built at SGC"
          subtitle="Research tools implemented in our member platform"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card flat className="h-full bg-white">
                <CardHeader className="h-full flex flex-col p-8">
                  <CardTitle className="text-xl mb-3">{project.title}</CardTitle>
                  <CardDescription className="mb-5 flex-grow text-base leading-relaxed">
                    {project.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center border border-surface-border rounded-md px-3 py-1 text-xs text-muted-foreground bg-surface-offwhite"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
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
              Interested in Quantitative Strategies?
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Join our team and work on cutting-edge trading systems with industry-standard tools and methodologies.
            </p>
            <Button size="lg" asChild>
              <Link href="/contact">
                Contact Our Team
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </Section>
    </>
  );
}
