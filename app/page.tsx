'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Hero } from '@/components/hero';
import { Button } from '@/components/button';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { ArrowRight, TrendingUp, Users, LineChart, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return <div ref={ref}>{count}</div>;
}

export default function HomePage() {
  const [settings, setSettings] = useState({
    foundedYear: '2023',
    memberCount: '80',
    projectCount: '50',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings({
          foundedYear: data.foundedYear || '2023',
          memberCount: data.memberCount || '80',
          projectCount: data.projectCount || '50',
        });
      })
      .catch(err => console.error('Error loading settings:', err));
  }, []);

  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <Hero
        title={
          <>
            <div>Where Ambition</div>
            <div>Meets Quantitative</div>
            <div>Excellence</div>
          </>
        }
        subtitle="Canada's premier student-led quantitative and fundamental research organization. Empowering the next generation of market leaders at the University of Toronto."
      >
        <div className="mt-8 mb-2">
          <div className="text-white/40 text-xs uppercase tracking-[0.3em] mb-4">
            Our Motto
          </div>
          <div className="font-serif text-white text-2xl md:text-3xl font-semibold tracking-wide">
            <span className="inline-block mx-2">Improvidus</span>
            <span className="text-white/30">·</span>
            <span className="inline-block mx-2">Apto</span>
            <span className="text-white/30">·</span>
            <span className="inline-block mx-2">Quod Victum</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            href="/research"
            className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-[#030116] text-white hover:bg-[#06041f] shadow-lg shadow-primary/20 hover:shadow-primary/30 font-medium transition-all duration-200"
          >
            <span>Explore Research</span>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg border-2 border-white/30 text-white hover:bg-white/10 font-medium transition-all duration-200"
          >
            Join Our Team
          </Link>
        </div>
      </Hero>

      {/* Stats Bar */}
      <Section dark className="py-16 border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-5xl md:text-6xl font-bold text-white mb-2">
              {settings.foundedYear}
            </div>
            <div className="text-white/60 text-lg">Year Founded</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-5xl md:text-6xl font-bold text-white mb-2 flex items-center justify-center">
              <AnimatedCounter end={parseInt(settings.memberCount)} />
              <span>+</span>
            </div>
            <div className="text-white/60 text-lg">Active Members</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-5xl md:text-6xl font-bold text-white mb-2 flex items-center justify-center">
              <AnimatedCounter end={parseInt(settings.projectCount)} />
              <span>+</span>
            </div>
            <div className="text-white/60 text-lg">Research Projects</div>
          </motion.div>
        </div>
      </Section>

      {/* Mission Section */}
      <Section>
        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Engineered @ UofT<br />For UofT
            </h2>
            <p className="text-xl leading-relaxed mb-6">
              St. George Capital is Canada's premier student-led quantitative and fundamental research organization at the University of Toronto.
            </p>
            <p className="text-xl leading-relaxed text-gray-600">
              We develop tomorrow's market leaders through rigorous training, cutting-edge research, and real-world market experience.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/webphotos/engineeredatuoft.jpg"
                alt="SGC Team at University of Toronto"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </motion.div>
        </div>
        

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex"
          >
            <Card className="flex flex-col flex-1">
              <CardHeader className="flex-1 flex flex-col">
                <div className="w-12 h-12 bg-[#030116]/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-[#030116]" />
                </div>
                <CardTitle>Research-Driven Strategies</CardTitle>
                <CardDescription className="flex-1">
                  Institutional-grade research forms the foundation of our approach. We deploy sophisticated quantitative models and fundamental analysis to identify systematic market inefficiencies and generate alpha.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex"
          >
            <Card className="flex flex-col flex-1">
              <CardHeader className="flex-1 flex flex-col">
                <div className="w-12 h-12 bg-[#030116]/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-[#030116]" />
                </div>
                <CardTitle>Meritocratic Excellence</CardTitle>
                <CardDescription className="flex-1">
                  Members drive their own development through high-impact projects. Our performance-driven culture rewards initiative and results, fostering the entrepreneurial mindset essential for success in competitive markets.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex"
          >
            <Card className="flex flex-col flex-1">
              <CardHeader className="flex-1 flex flex-col">
                <div className="w-12 h-12 bg-[#030116]/10 rounded-lg flex items-center justify-center mb-4">
                  <LineChart className="w-6 h-6 text-[#030116]" />
                </div>
                <CardTitle>Integrated Investment Framework</CardTitle>
                <CardDescription className="flex-1">
                  Our multi-strategy approach combines quantitative modeling with fundamental analysis, systematic trading with discretionary research—preparing members for diverse roles across the investment landscape.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </Section>

      {/* Vision Section */}
      <Section dark>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              Building Tomorrow's<br />
              Market Leaders
            </h2>
            <p className="text-xl text-white/70 leading-relaxed">
              Our vision is to establish the preeminent student-led investment organization in Canada—recognized for producing exceptional talent, pioneering quantitative and fundamental research, and maintaining institutional-grade standards. We cultivate a culture of excellence where ambitious students develop into the next generation of portfolio managers, quantitative researchers, and investment professionals.
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
                src="/images/webphotos/market leaders.jpg"
                alt="St. George Capital Leadership"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Community Impact */}
      <Section>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[400px] rounded-2xl overflow-hidden"
          >
            <img 
              src="/images/charity/sgcsoccer.jpeg" 
              alt="SGC Charity Soccer Event" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-16 h-16 bg-[#030116]/10 rounded-lg flex items-center justify-center mb-6">
              <Heart className="w-8 h-8 text-[#030116]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Beyond Financial Excellence
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              As the St. George Capital Educational Society, we engage in charitable initiatives that reflect our commitment to the broader community. We believe that excellence in finance goes hand in hand with social responsibility.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              SGC represents an opportunity to contribute meaningfully while developing the skills that define successful careers in institutional finance.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section dark>
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Interested in Learning More?
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Join Canada's premier quantitative and fundamental research organization and begin building your future in institutional markets.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 font-medium transition-all duration-200"
              >
                Get In Touch
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/team"
                className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg border-2 border-white/30 text-white hover:bg-white/10 font-medium transition-all duration-200"
              >
                Meet The Team
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>

      <Footer />
    </>
  );
}
