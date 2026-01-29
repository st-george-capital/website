'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function EquityMacroResearchPage() {
  return (
    <>
      <Hero
        title="Equity & Macro Research"
        subtitle="Fundamental analysis driving conviction-based investing"
        height="medium"
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-5xl font-bold mb-8 leading-tight">
              Bottom-Up Meets<br />Top-Down
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              Our fundamental research division combines deep company analysis with macro context. We build detailed financial models, assess competitive positioning, and identify multi-year investment themes.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              Members produce institutional-quality research reports, pitch ideas to portfolio managers, and track their theses over time. Learn valuation, financial statement analysis, and industry dynamics.
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

      {/* Research Approach */}
      <Section dark>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">Our Research Framework</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full bg-white/5 border-white/10">
                <CardHeader>
                  <div className="text-sm text-white/50 mb-3 uppercase tracking-wider">Macro Context</div>
                  <CardTitle className="text-white text-2xl mb-4">Top-Down Analysis</CardTitle>
                  <CardDescription className="text-white/70 leading-relaxed">
                    <p className="mb-4">
                      Start with the big picture. Where are we in the economic cycle? What's the Fed doing? Which sectors benefit from current macro conditions?
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>GDP growth, inflation expectations, yield curve dynamics</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Central bank policy trajectory and market implications</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Geopolitical risks and commodity price impacts</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Sector rotation based on business cycle positioning</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="h-full bg-white/5 border-white/10">
                <CardHeader>
                  <div className="text-sm text-white/50 mb-3 uppercase tracking-wider">Company Analysis</div>
                  <CardTitle className="text-white text-2xl mb-4">Bottom-Up Fundamentals</CardTitle>
                  <CardDescription className="text-white/70 leading-relaxed">
                    <p className="mb-4">
                      Deep dive into individual companies. Build three-statement models, assess competitive moats, and value the business using DCF, comps, and precedent transactions.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Revenue drivers, margin analysis, and growth sustainability</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Balance sheet quality, FCF generation, capital allocation</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Management track record and governance structure</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 mt-1">•</span>
                        <span>Industry position, competitive advantages, and threats</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Current Coverage */}
      <Section>
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
            <h2 className="font-serif text-4xl font-bold mb-6">
              Active Coverage Universe
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Technology & Software</h3>
                <p className="text-gray-600">
                  Cloud infrastructure, SaaS business models, semiconductor cycles, and AI/ML infrastructure plays. Analyzing ARR growth, net retention, and unit economics.
                </p>
              </div>
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Healthcare & Biotech</h3>
                <p className="text-gray-600">
                  Pharmaceutical pipelines, medical device innovation, and healthcare services. Understanding FDA approval pathways, patent cliffs, and reimbursement dynamics.
                </p>
              </div>
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Financials</h3>
                <p className="text-gray-600">
                  Banks, asset managers, insurance, and fintech. Net interest margin sensitivity, credit quality metrics, and the impact of regulatory changes.
                </p>
              </div>
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Consumer & Retail</h3>
                <p className="text-gray-600">
                  Brand strength, pricing power, and omnichannel strategies. Tracking same-store sales, customer acquisition costs, and e-commerce penetration.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Research Process */}
      <Section dark>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">From Idea to Investment Thesis</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-5xl font-bold text-white/10 mb-4">01</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Screening</h3>
              <p className="text-white/70">
                Use quantitative screens (valuation multiples, growth rates, quality metrics) to generate initial idea list. Read industry reports and competitive analysis.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="text-5xl font-bold text-white/10 mb-4">02</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Modeling</h3>
              <p className="text-white/70">
                Build detailed three-statement model projecting 5 years forward. Sensitivity analysis on key assumptions. Multiple valuation methodologies (DCF, comps, sum-of-parts).
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="text-5xl font-bold text-white/10 mb-4">03</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Due Diligence</h3>
              <p className="text-white/70">
                Read 10-Ks, 10-Qs, proxy statements, and earnings call transcripts. Analyze competitor strategies, customer reviews, and industry expert calls.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="text-5xl font-bold text-white/10 mb-4">04</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Pitching</h3>
              <p className="text-white/70">
                Present investment thesis to team with clear bull/bear cases, catalysts, risks, and price targets. Defend assumptions and respond to challenges.
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Tools & Training */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">Tools & Development</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl mb-4">Data & Platforms</CardTitle>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Bloomberg Terminal</span>
                      <span className="text-gray-400">Market Data</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">CapIQ / FactSet</span>
                      <span className="text-gray-400">Financials</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Koyfin / TradingView</span>
                      <span className="text-gray-400">Charting</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Excel / Python</span>
                      <span className="text-gray-400">Modeling</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl mb-4">Training Program</CardTitle>
                  <div className="space-y-3">
                    <div className="border-l-4 border-[#030116] pl-3">
                      <div className="font-medium mb-1">Week 1-2</div>
                      <p className="text-sm text-gray-600">Financial statement analysis and accounting fundamentals</p>
                    </div>
                    <div className="border-l-4 border-[#030116] pl-3">
                      <div className="font-medium mb-1">Week 3-4</div>
                      <p className="text-sm text-gray-600">Valuation methodologies and Excel modeling</p>
                    </div>
                    <div className="border-l-4 border-[#030116] pl-3">
                      <div className="font-medium mb-1">Week 5-8</div>
                      <p className="text-sm text-gray-600">Industry analysis and competitive positioning</p>
                    </div>
                    <div className="border-l-4 border-[#030116] pl-3">
                      <div className="font-medium mb-1">Week 9+</div>
                      <p className="text-sm text-gray-600">Independent coverage and pitch presentations</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl mb-4">Recent Pitches</CardTitle>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">NVDA</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">LONG</span>
                      </div>
                      <p className="text-xs text-gray-600">AI infrastructure buildout, data center demand</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">META</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">LONG</span>
                      </div>
                      <p className="text-xs text-gray-600">Ad platform efficiency, AI monetization, Reels growth</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Regional Bank Basket</span>
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">SHORT</span>
                      </div>
                      <p className="text-xs text-gray-600">CRE exposure, deposit flight risk, margin compression</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section dark>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Become a Sector Expert
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Learn the skills that drive careers at Goldman Sachs, Blackstone, and leading buy-side firms. Fundamental research is the foundation of investing.
            </p>
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-white text-[#030116] hover:bg-white/90 shadow-lg font-medium transition-all duration-200"
            >
              <span>Join Equity Research</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </Section>
    </>
  );
}
