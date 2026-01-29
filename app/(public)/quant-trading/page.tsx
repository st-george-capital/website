'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function QuantTradingPage() {
  return (
    <>
      <Hero
        title="Quantitative Trading"
        subtitle="Systematic alpha generation through rigorous modeling and disciplined execution"
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
              Building Production<br />Trading Systems
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              Our quantitative trading division develops systematic strategies across equities, fixed income, and derivatives. We deploy capital based on statistical edge, not speculation.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              Members learn the full stack—from signal research and backtesting to risk management and execution optimization. We use Python, C++, and professional-grade infrastructure.
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
                src="/images/webphotos/quanttrading.jpg"
                alt="Quantitative Trading at SGC"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Strategy Overview */}
      <Section dark>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl font-bold mb-12 text-center">Active Strategies</h2>
          
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="border-l-4 border-white/30 pl-6">
                <div className="text-sm text-white/50 mb-2 uppercase tracking-wider">Statistical Arbitrage</div>
                <h3 className="font-serif text-2xl font-bold mb-3 text-white">Mean Reversion & Pairs Trading</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Exploiting temporary mispricings between correlated securities. Uses cointegration tests, Kalman filters, and regime-switching models.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Python', 'Statsmodels', 'Pandas'].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="border-l-4 border-white/30 pl-6">
                <div className="text-sm text-white/50 mb-2 uppercase tracking-wider">Machine Learning</div>
                <h3 className="font-serif text-2xl font-bold mb-3 text-white">Predictive Signal Generation</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Ensemble models (XGBoost, LSTMs, Transformers) trained on alternative data, sentiment, and price action. Feature engineering for alpha extraction.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['PyTorch', 'Scikit-learn', 'XGBoost'].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="border-l-4 border-white/30 pl-6">
                <div className="text-sm text-white/50 mb-2 uppercase tracking-wider">Market Making</div>
                <h3 className="font-serif text-2xl font-bold mb-3 text-white">Liquidity Provision & Spread Capture</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Quote on both sides of the book, managing inventory risk while capturing bid-ask spreads. Requires low-latency infrastructure and adverse selection modeling.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['C++', 'WebSocket', 'FIX Protocol'].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="border-l-4 border-white/30 pl-6">
                <div className="text-sm text-white/50 mb-2 uppercase tracking-wider">Options Strategies</div>
                <h3 className="font-serif text-2xl font-bold mb-3 text-white">Volatility Arbitrage</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Trading realized vs. implied volatility discrepancies. Delta-hedged portfolios exploiting mispriced options across the surface.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['QuantLib', 'NumPy', 'SciPy'].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Research Process */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-5xl font-bold text-[#030116]/10 mb-4">01</div>
              <h3 className="font-serif text-2xl font-bold mb-4">Research & Hypothesis</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate testable hypotheses from academic literature, market microstructure analysis, or alternative data sources. Document expected edge and risk profile.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="text-5xl font-bold text-[#030116]/10 mb-4">02</div>
              <h3 className="font-serif text-2xl font-bold mb-4">Backtesting & Validation</h3>
              <p className="text-gray-600 leading-relaxed">
                Rigorous out-of-sample testing with realistic transaction costs, slippage, and market impact. Walk-forward optimization to avoid overfitting.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="text-5xl font-bold text-[#030116]/10 mb-4">03</div>
              <h3 className="font-serif text-2xl font-bold mb-4">Production & Monitoring</h3>
              <p className="text-gray-600 leading-relaxed">
                Deploy to paper trading, then live with strict risk limits. Continuous performance monitoring and regime detection. Kill switches for tail events.
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Technical Infrastructure */}
      <Section dark>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Professional Infrastructure
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Data Access</h3>
                <p className="text-white/70">
                  Bloomberg Terminal, Refinitiv Eikon, Quandl, and proprietary web scraping infrastructure. Real-time feeds and historical data back to 2000.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Compute Resources</h3>
                <p className="text-white/70">
                  AWS cloud infrastructure with GPU instances for deep learning. Distributed backtesting across multi-core servers for rapid iteration.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Risk Management</h3>
                <p className="text-white/70">
                  Real-time P&L tracking, VaR calculations, correlation monitoring, and automated position limits. Daily risk reports reviewed by leadership.
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
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="font-serif text-2xl mb-6">Tech Stack</CardTitle>
                <div className="space-y-4">
                  {[
                    { category: 'Languages', tools: 'Python, C++, SQL, R' },
                    { category: 'ML/AI', tools: 'PyTorch, TensorFlow, XGBoost' },
                    { category: 'Data', tools: 'Pandas, NumPy, Polars, DuckDB' },
                    { category: 'Backtesting', tools: 'Zipline, Backtrader, VectorBT' },
                    { category: 'Infra', tools: 'Docker, Kubernetes, Redis, PostgreSQL' },
                    { category: 'Brokers', tools: 'Interactive Brokers, Alpaca API' },
                  ].map((item) => (
                    <div key={item.category} className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="font-semibold text-white">{item.category}</span>
                      <span className="text-white/60 text-sm">{item.tools}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
            </Card>
          </motion.div>
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
              Build Real Trading Systems
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              Join a team where you'll deploy capital, not just theories. Learn by doing with mentorship from experienced quants.
            </p>
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-[#030116] text-white hover:bg-[#06041f] shadow-lg shadow-primary/20 hover:shadow-primary/30 font-medium transition-all duration-200"
            >
              <span>Join Quant Trading</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </Section>
    </>
  );
}
