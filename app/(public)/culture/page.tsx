'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';

export default function CulturePage() {
  return (
    <>
      <Hero
        title="Our Culture"
        subtitle="Performance-driven excellence meets collaborative innovation"
        height="medium"
      />

      {/* Main Values Section */}
      <Section>
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-5xl font-bold mb-8 leading-tight">
              Where Talent<br />Meets Opportunity
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              St. George Capital operates at the intersection of academic rigor and market reality. Our culture rewards intellectual curiosity, quantitative excellence, and entrepreneurial initiative.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              We don't just teach finance—we live it. Members manage real capital, build production systems, and produce institutional-grade research that stands up to professional scrutiny.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="border-l-4 border-[#030116] pl-6">
              <h3 className="font-serif text-2xl font-bold mb-3">Meritocratic Advancement</h3>
              <p className="text-gray-600 leading-relaxed">
                Your impact determines your trajectory. High-performers move quickly into leadership roles, managing teams and strategy regardless of tenure.
              </p>
            </div>
            <div className="border-l-4 border-[#030116] pl-6">
              <h3 className="font-serif text-2xl font-bold mb-3">Continuous Learning</h3>
              <p className="text-gray-600 leading-relaxed">
                From stochastic calculus to machine learning, we invest heavily in developing technical depth. Weekly workshops, guest speakers, and peer-led sessions keep the bar high.
              </p>
            </div>
            <div className="border-l-4 border-[#030116] pl-6">
              <h3 className="font-serif text-2xl font-bold mb-3">Real Accountability</h3>
              <p className="text-gray-600 leading-relaxed">
                Trading strategies are live-tested. Research is peer-reviewed. Models are stress-tested. We maintain institutional standards because our reputation depends on it.
              </p>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Life at SGC Section */}
      <Section dark>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              The Daily Experience
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Monday Market Open</h3>
                <p className="text-white/70">
                  Team briefs on weekend developments, portfolio positioning, and week-ahead catalysts. Traders adjust algorithms while analysts finalize research notes.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Wednesday Deep Dives</h3>
                <p className="text-white/70">
                  Technical workshops on everything from options pricing theory to NLP for sentiment analysis. Guest speakers from buy-side firms and tech companies share real-world insights.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Friday Reviews</h3>
                <p className="text-white/70">
                  Portfolio performance review, strategy presentations, and peer feedback sessions. High performers present their work to the broader team.
                </p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/webphotos/culture.jpeg"
                alt="St. George Capital Team Culture"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* What Sets Us Apart */}
      <Section>
        <SectionHeader
          title="What Sets Us Apart"
          subtitle="The competitive advantages that define SGC"
          centered
        />

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="text-6xl font-bold text-[#030116]/10 mb-4">80+</div>
            <h3 className="font-serif text-xl font-bold mb-3">Active Members</h3>
            <p className="text-gray-600">
              Selective recruitment from UofT's top programs: Engineering, Mathematics, Computer Science, Economics, and Finance.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center"
          >
            <div className="text-6xl font-bold text-[#030116]/10 mb-4">$50K</div>
            <h3 className="font-serif text-xl font-bold mb-3">Technology Stack</h3>
            <p className="text-gray-600">
              Bloomberg Terminal access, Python/C++ infrastructure, cloud computing credits, and professional data feeds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <div className="text-6xl font-bold text-[#030116]/10 mb-4">95%</div>
            <h3 className="font-serif text-xl font-bold mb-3">Placement Rate</h3>
            <p className="text-gray-600">
              Alumni at Goldman Sachs, Citadel, Jane Street, Two Sigma, and top Canadian banks. Buy-side, sell-side, and tech.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* Values Grid */}
      <Section dark>
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">Core Principles</h2>
          
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            <div>
              <div className="text-4xl font-bold text-white/20 mb-3">01</div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-white">Intellectual Honesty</h3>
              <p className="text-white/70 leading-relaxed">
                We admit when we're wrong. Models fail, trades lose money, and theses break. What matters is learning from mistakes and improving our process.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-white/20 mb-3">02</div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-white">Data-Driven Decisions</h3>
              <p className="text-white/70 leading-relaxed">
                Opinions without evidence don't fly. Every investment thesis is backed by quantitative analysis, backtested strategies, and robust statistical validation.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-white/20 mb-3">03</div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-white">Cross-Division Collaboration</h3>
              <p className="text-white/70 leading-relaxed">
                Quant traders work with fundamental analysts. Researchers collaborate with portfolio managers. The best insights come from diverse perspectives.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-white/20 mb-3">04</div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-white">Long-Term Orientation</h3>
              <p className="text-white/70 leading-relaxed">
                We're building careers, not padding résumés. Members who invest deeply in learning and contribute meaningfully build the foundation for decades of success.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
