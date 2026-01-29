'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import Link from 'next/link';
import { Globe, Building2, TrendingUp, Shield, ArrowRight } from 'lucide-react';

const objectives = [
  {
    icon: Globe,
    number: '01',
    title: 'Market Outlook',
    description: 'Comprehensive analysis of global macroeconomic trends, central bank policies, and their implications for asset allocation across equity, fixed income, and commodity markets.',
  },
  {
    icon: Building2,
    number: '02',
    title: 'Industry Deep Dives',
    description: 'Sector-specific research covering competitive dynamics, regulatory landscape, technological disruption, and long-term structural trends shaping industry profitability.',
  },
  {
    icon: TrendingUp,
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

export default function EquityMacroResearchPage() {
  return (
    <>
      <Hero
        title="Equity & Macro Research"
        subtitle="Fundamental analysis meets market intelligence"
        height="medium"
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Deep Fundamental Analysis
            </h2>
            <p className="text-xl leading-relaxed mb-6">
              Our Equity & Macro Research division combines traditional fundamental analysis with modern data analytics to generate actionable investment insights across global markets.
            </p>
            <p className="text-xl leading-relaxed">
              We train members in financial modeling, valuation techniques, and macroeconomic analysis—skills essential for careers in equity research, portfolio management, and investment banking.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/webphotos/mne.jpg"
                alt="Equity & Macro Research at SGC"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </Section>

      <Section dark>
        <SectionHeader
          title="Research Objectives"
          subtitle="Three pillars of our analytical framework"
        />

        <div className="space-y-8">
          {objectives.map((objective, index) => (
            <motion.div
              key={objective.title}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="md:flex md:flex-row md:items-start md:space-x-6">
                  <div className="flex items-center space-x-4 md:space-x-0 md:flex-col md:items-center mb-4 md:mb-0">
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <objective.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-4xl font-bold text-primary/40 md:mt-4">
                      {objective.number}
                    </div>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="mb-3">{objective.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {objective.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="Investment Principles"
          subtitle="Our disciplined approach to equity investing"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {principles.map((principle, index) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <CardTitle className="text-xl">{principle.title}</CardTitle>
                  </div>
                  <CardDescription>
                    {principle.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section dark>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/webphotos/dash.jpg"
                alt="Research Tools and Resources"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Research Process
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">1. Idea Generation</h3>
                <p>
                  Screen for opportunities using quantitative metrics and qualitative insights.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">2. Due Diligence</h3>
                <p>
                  Build financial models, analyze industry dynamics, assess management quality.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">3. Thesis Development</h3>
                <p>
                  Articulate investment rationale, target price, risks, and catalysts.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">4. Monitoring & Updates</h3>
                <p>
                  Track performance, update models, reassess thesis as new information emerges.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="font-serif text-2xl mb-6 text-center">Typical Coverage Areas</CardTitle>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  'Technology & Software',
                  'Financial Services',
                  'Consumer & Retail',
                  'Healthcare & Biotech',
                  'Energy & Materials',
                  'Industrials',
                ].map((sector) => (
                  <div key={sector} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-lg">{sector}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>
        </div>
      </Section>

      <Section>
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
            <p className="text-xl mb-10">
              Join our equity research team and develop the analytical skills that top investors value.
            </p>
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-[#030116] text-white hover:bg-[#06041f] shadow-lg shadow-primary/20 hover:shadow-primary/30 font-medium transition-all duration-200"
            >
              <span>Get Started</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </Section>
    </>
  );
}

