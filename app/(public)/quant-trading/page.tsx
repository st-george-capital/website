'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import Link from 'next/link';
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
    title: 'Statistical Arbitrage Engine',
    description: 'Pairs trading system using cointegration and mean reversion strategies across equity markets.',
    tags: ['Python', 'TensorFlow', 'Time Series'],
  },
  {
    title: 'Options Pricing Model',
    description: 'Advanced options pricing and Greeks calculation using Monte Carlo simulation and finite difference methods.',
    tags: ['C++', 'NumPy', 'Quantlib'],
  },
  {
    title: 'Sentiment Analysis Pipeline',
    description: 'NLP-based sentiment extraction from news, social media, and earnings calls for alpha generation.',
    tags: ['Python', 'NLP', 'BERT'],
  },
  {
    title: 'Portfolio Backtesting Framework',
    description: 'High-performance backtesting engine with realistic transaction costs and slippage modeling.',
    tags: ['Python', 'Pandas', 'Backtrader'],
  },
];

export default function QuantTradingPage() {
  return (
    <>
      <Hero
        title="Quantitative Trading"
        subtitle="Systematic alpha generation through advanced modeling and execution"
        height="medium"
      />

      <Section>
        <div className="max-w-4xl">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            Building Tomorrow's Trading Systems
          </h2>
          <p className="text-xl leading-relaxed mb-6">
            Our Quantitative Trading division focuses on developing systematic trading strategies that leverage cutting-edge technology, mathematical models, and data science to identify and capture market opportunities.
          </p>
          <p className="text-xl leading-relaxed">
            We combine rigorous academic research with practical implementation, giving members hands-on experience in building production-grade trading systems.
          </p>
        </div>
      </Section>

      <Section dark>
        <SectionHeader
          title="Focus Areas"
          subtitle="Core competencies and research domains"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {focusAreas.map((area, index) => (
            <motion.div
              key={area.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <area.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-lg font-semibold text-primary mb-2">
                    0{index + 1}
                  </div>
                  <CardTitle>{area.title}</CardTitle>
                  <CardDescription className="text-base">
                    {area.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="Featured Projects"
          subtitle="Recent and ongoing research initiatives"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader className="h-full flex flex-col">
                  <CardTitle className="mb-3">{project.title}</CardTitle>
                  <CardDescription className="mb-4 flex-grow">
                    {project.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full"
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

      <Section dark>
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
            <p className="text-xl mb-10">
              Join our team and work on cutting-edge trading systems with industry-standard tools and methodologies.
            </p>
            <Button size="lg" asChild>
              <Link href="/contact" className="inline-flex items-center">
                <span>Contact Our Team</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </Section>
    </>
  );
}

