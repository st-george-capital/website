'use client';

import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import Link from 'next/link';
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

const partnerships = [
  { name: 'University of Toronto', role: 'Academic Partner' },
  { name: 'Industry Leaders', role: 'Mentorship & Guidance' },
  { name: 'Research Institutions', role: 'Collaboration' },
];

export default function QuantResearchPage() {
  return (
    <>
      <Hero
        title="Quantitative Research"
        breadcrumb="What We Do / Quantitative Research"
        height="small"
        align="left"
      />

      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Overview
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              Our Quantitative Research division is dedicated to advancing the frontiers of financial knowledge through rigorous academic research, practical experimentation, and collaborative learning.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              We provide a structured curriculum and research framework that prepares members for careers in quantitative finance, whether in buy-side research, algorithmic trading, or academic pursuits.
            </p>
          </div>
        </div>
      </Section>

      {/* Image + Content Section */}
      <Section dark>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Advancing Financial Knowledge
            </h3>
            <p className="text-lg text-white/80 leading-relaxed">
              Through workshops, seminars, and collaborative research projects, we cultivate the next generation of quantitative finance professionals.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[400px] rounded-2xl overflow-hidden"
          >
            <img 
              src="/images/webphotos/quantresearch.jpg" 
              alt="Quantitative Research Team" 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>
        </div>
      </Section>

      <Section dark className="!py-12 !md:py-16">
        <SectionHeader
          title="What We Do"
          subtitle="Educational programs and research activities"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <activity.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle>{activity.title}</CardTitle>
                  <CardDescription className="text-base">
                    {activity.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="!py-12 !md:py-16">
        <SectionHeader
          title="Research Excellence"
          subtitle="Our approach to quantitative financial research"
        />

        <div className="grid md:grid-cols-3 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-5xl font-bold text-primary mb-4">01</div>
            <h3 className="font-serif text-2xl font-bold mb-3">Theoretical Foundation</h3>
            <p>
              Ground our strategies in solid mathematical and statistical theory, ensuring robustness and reproducibility.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-5xl font-bold text-primary mb-4">02</div>
            <h3 className="font-serif text-2xl font-bold mb-3">Empirical Testing</h3>
            <p>
              Validate hypotheses through rigorous backtesting, statistical analysis, and out-of-sample verification.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-5xl font-bold text-primary mb-4">03</div>
            <h3 className="font-serif text-2xl font-bold mb-3">Practical Implementation</h3>
            <p>
              Bridge the gap between theory and practice by implementing research findings in real trading systems.
            </p>
          </motion.div>
        </div>
      </Section>

      <Section dark>
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            title="Partnerships & Affiliations"
            subtitle="Collaborating with leading institutions and industry partners"
            centered
          />

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {partnerships.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="h-24 flex items-center justify-center mb-4">
                  <div className="text-4xl font-bold text-white/20">
                    {partner.name.split(' ').map(w => w[0]).join('')}
                  </div>
                </div>
                <h3 className="font-serif text-xl font-bold mb-2">{partner.name}</h3>
                <p>{partner.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="!py-12 !md:py-16">
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
            <p className="text-xl mb-10">
              Collaborate with passionate researchers and build expertise in quantitative finance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-[#030116] text-white hover:bg-[#06041f] shadow-lg shadow-primary/20 hover:shadow-primary/30 font-medium transition-all duration-200"
            >
              <span>Get Involved</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
              <Link 
                href="/research" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-medium transition-all duration-200"
              >
                <span>View Research</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>
    </>
  );
}

