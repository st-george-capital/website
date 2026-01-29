'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function QuantResearchPage() {
  return (
    <>
      <Hero
        title="Quantitative Research"
        subtitle="Academic rigor meets market application"
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
              From Theory<br />to Alpha
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              Our research division bridges cutting-edge academic finance with practical trading applications. We study market microstructure, factor models, and behavioral anomalies—then build strategies to exploit them.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              Members publish research papers, contribute to open-source quant libraries, and develop proprietary models that enter production. Your thesis could become tomorrow's trading strategy.
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
                src="/images/webphotos/quantresearch.jpg"
                alt="Quantitative Research at SGC"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Research Areas */}
      <Section dark>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">Active Research Domains</h2>
          
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start gap-6">
                    <div className="text-4xl font-bold text-white/20">01</div>
                    <div className="flex-1">
                      <CardTitle className="text-white mb-3">Factor Investing & Smart Beta</CardTitle>
                      <CardDescription className="text-white/70 text-base leading-relaxed mb-4">
                        Decomposing returns into systematic factors (value, momentum, quality, low volatility). Building multi-factor portfolios with optimal weights. Analyzing factor timing and regime shifts.
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {['Fama-French', 'PCA', 'Risk Parity', 'Hierarchical Clustering'].map(tag => (
                          <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70">
                            {tag}
                          </span>
                        ))}
                      </div>
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
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start gap-6">
                    <div className="text-4xl font-bold text-white/20">02</div>
                    <div className="flex-1">
                      <CardTitle className="text-white mb-3">Market Microstructure</CardTitle>
                      <CardDescription className="text-white/70 text-base leading-relaxed mb-4">
                        Order book dynamics, price impact models, and optimal execution algorithms. Study of liquidity provision, adverse selection, and informed trading patterns.
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {['Limit Order Books', 'VWAP', 'Implementation Shortfall', 'Kyle Model'].map(tag => (
                          <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70">
                            {tag}
                          </span>
                        ))}
                      </div>
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
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start gap-6">
                    <div className="text-4xl font-bold text-white/20">03</div>
                    <div className="flex-1">
                      <CardTitle className="text-white mb-3">Alternative Data & NLP</CardTitle>
                      <CardDescription className="text-white/70 text-base leading-relaxed mb-4">
                        Mining alpha from unconventional sources—satellite imagery, credit card transactions, social media sentiment, and earnings call transcripts. NLP pipelines for real-time information extraction.
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {['BERT', 'FinBERT', 'Sentiment Analysis', 'Event Studies'].map(tag => (
                          <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start gap-6">
                    <div className="text-4xl font-bold text-white/20">04</div>
                    <div className="flex-1">
                      <CardTitle className="text-white mb-3">Derivatives & Fixed Income</CardTitle>
                      <CardDescription className="text-white/70 text-base leading-relaxed mb-4">
                        Options pricing beyond Black-Scholes—stochastic volatility models, jump diffusion, and local volatility surfaces. Term structure modeling and credit spread analysis.
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {['Heston', 'SABR', 'Vasicek', 'Monte Carlo'].map(tag => (
                          <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Research Process */}
      <Section>
        <div className="grid md:grid-cols-2 gap-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl font-bold mb-6">
              How Research Works
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Literature Review</h3>
                <p className="text-gray-600">
                  Start with top journals (Journal of Finance, RFS, JFE). Identify gaps, replication opportunities, or extensions. Build a hypothesis.
                </p>
              </div>
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Data Collection & Cleaning</h3>
                <p className="text-gray-600">
                  Source data from CRSP, Compustat, FRED, or alternative providers. Clean, normalize, and handle survivorship bias. Document your process.
                </p>
              </div>
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Empirical Testing</h3>
                <p className="text-gray-600">
                  Run regressions, construct portfolios, and perform statistical tests. Check robustness across time periods, sectors, and market regimes.
                </p>
              </div>
              <div className="border-l-4 border-[#030116] pl-6">
                <h3 className="text-xl font-semibold mb-2">Peer Review & Iteration</h3>
                <p className="text-gray-600">
                  Present findings to the research team. Defend methodology, address edge cases, and incorporate feedback. Iterate until bulletproof.
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
            <Card className="h-full bg-gradient-to-br from-[#030116] to-[#06041f] border-[#030116]">
              <CardHeader>
                <CardTitle className="font-serif text-2xl mb-6 text-white">Past Research Projects</CardTitle>
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-white/50 mb-1">Winter 2025</div>
                    <h4 className="font-semibold text-white mb-2">Crypto Market Microstructure</h4>
                    <p className="text-white/70 text-sm">
                      Analysis of order book imbalances and their predictive power for short-term price movements on Binance and Coinbase.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm text-white/50 mb-1">Fall 2024</div>
                    <h4 className="font-semibold text-white mb-2">Earnings Surprise Alpha</h4>
                    <p className="text-white/70 text-sm">
                      Machine learning models predicting post-earnings announcement drift using historical financials and sentiment features.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm text-white/50 mb-1">Summer 2024</div>
                    <h4 className="font-semibold text-white mb-2">Volatility Risk Premium</h4>
                    <p className="text-white/70 text-sm">
                      Systematic harvesting of volatility risk premium through options strategies. Regime-dependent sizing and hedging.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm text-white/50 mb-1">Spring 2024</div>
                    <h4 className="font-semibold text-white mb-2">ESG Factor Performance</h4>
                    <p className="text-white/70 text-sm">
                      Empirical study of ESG scores as a return predictor across global equities. Controlling for traditional factors.
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </Section>

      {/* Tools & Resources */}
      <Section dark>
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">Research Resources</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-white/10 mb-4">DATA</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Premium Datasets</h3>
              <p className="text-white/70">
                Bloomberg, Refinitiv, WRDS (CRSP/Compustat), Quandl, and proprietary alternative data partnerships.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-white/10 mb-4">COMPUTE</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Cloud Infrastructure</h3>
              <p className="text-white/70">
                AWS EC2 instances with GPUs for deep learning research. Distributed computing for large-scale backtests.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-white/10 mb-4">LIBRARY</div>
              <h3 className="font-serif text-xl font-bold mb-3 text-white">Academic Access</h3>
              <p className="text-white/70">
                Full access to SSRN, arXiv, university library databases. Weekly journal clubs discussing recent papers.
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Contribute to Financial Science
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              Join researchers pushing the boundaries of quantitative finance. Your work could appear in journals or production systems.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/contact" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-[#030116] text-white hover:bg-[#06041f] shadow-lg shadow-primary/20 hover:shadow-primary/30 font-medium transition-all duration-200"
              >
                <span>Join Research Team</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="/research" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-medium transition-all duration-200"
              >
                <span>View Publications</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>
    </>
  );
}
