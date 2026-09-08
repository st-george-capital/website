"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { CampusFeature } from "@/components/campus-feature";
import { VideoHero } from "@/components/video-hero";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/section";
import { ReactNode } from "react";
import { PublicExperience } from "@/components/public-experience";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function AnimatedCounter({
  end,
  duration = 2000,
}: {
  end: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
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
      { threshold: 0.5 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (reduced) {
      setCount(end);
      return;
    }
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
  }, [isVisible, end, duration, reduced]);

  return <div ref={ref}>{count}</div>;
}

export function HomeContent({ research }: { research: ReactNode }) {
  const [settings, setSettings] = useState({
    foundedYear: "2023",
    memberCount: "80",
    projectCount: "50",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          foundedYear: data.foundedYear || "2023",
          memberCount: data.memberCount || "80",
          projectCount: data.projectCount || "50",
        });
      })
      .catch((err) => console.error("Error loading settings:", err));
  }, []);

  return (
    <PublicExperience>
      <Navigation />
      <main id="main-content">
        {/* Video Hero Section */}
        <VideoHero />

        {/* Stats Bar — off-white, breaks the white/navy monotony */}
        <Section tone="offwhite" className="stats-section">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center stats-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="font-serif text-5xl md:text-6xl font-bold mb-2">
                {settings.foundedYear}
              </div>
              <div className="text-muted-foreground text-lg">Year Founded</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="font-serif text-5xl md:text-6xl font-bold mb-2 flex items-center justify-center">
                <AnimatedCounter end={parseInt(settings.memberCount)} />
                <span>+</span>
              </div>
              <div className="text-muted-foreground text-lg">
                Active Members
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="font-serif text-5xl md:text-6xl font-bold mb-2 flex items-center justify-center">
                <AnimatedCounter end={parseInt(settings.projectCount)} />
                <span>+</span>
              </div>
              <div className="text-muted-foreground text-lg">
                Research Projects
              </div>
            </motion.div>
          </div>
        </Section>

        <CampusFeature />

        <Section tone="white" className="division-section">
          <div className="division-intro">
            <p className="eyebrow">02 / What we do</p>
            <h2>
              Research. Test.
              <br />
              Put it into practice.
            </h2>
          </div>
          <div className="division-links">
            {[
              {
                number: "01",
                title: "Quantitative Research",
                href: "/quant-research",
                detail: "Theory, experimentation, and collaborative learning.",
              },
              {
                number: "02",
                title: "Quantitative Trading",
                href: "/quant-trading",
                detail:
                  "Systematic strategies, from research to implementation.",
              },
              {
                number: "03",
                title: "Equity & Macro Research",
                href: "/equity-macro-research",
                detail: "Company fundamentals. A global perspective.",
              },
            ].map((item) => (
              <Link
                href={item.href}
                key={item.number}
                className="division-link"
              >
                <span>{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </Section>

        {/* Latest Research preview — blue-grey band */}
        <Section tone="blue-grey">{research}</Section>

        <section className="people-feature">
          <div className="people-feature-image">
            <Image
              src="/images/webphotos/marketleaders.jpg"
              alt="St. George Capital members"
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="people-feature-content">
            <p className="eyebrow">Our people</p>
            <h2>
              Building Tomorrow's
              <br />
              Market Leaders
            </h2>
            <p>
              Ambitious students developing into the next generation of
              portfolio managers, quantitative researchers, and investment
              professionals.
            </p>
            <Link href="/team" className="text-link">
              Meet the team <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        {/* Community Impact */}
        <Section tone="white">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[400px] rounded-sm overflow-hidden editorial-image"
            >
              <Image
                src="/images/charity/sgcsoccer.jpeg"
                alt="SGC Charity Soccer Event"
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
            >
              <p className="eyebrow mb-6 text-blue-900">Beyond the markets</p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Beyond Financial Excellence
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                As the St. George Capital Educational Society, we engage in
                charitable initiatives that reflect our commitment to the
                broader community. We believe that excellence in finance goes
                hand in hand with social responsibility.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                SGC represents an opportunity to contribute meaningfully while
                developing the skills that define successful careers in
                institutional finance.
              </p>
              <div className="impact-links">
                <Link href="/charity">
                  Our work with SickKids <ArrowRight size={16} />
                </Link>
                <a
                  href="https://www.sickkidsfoundation.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SickKids Foundation ↗
                </a>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* CTA Section */}
        <Section tone="navy">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Interested in Learning More?
              </h2>
              <p className="text-xl text-white/70 mb-10">
                Join Canada's premier quantitative and fundamental research
                organization and begin building your future in institutional
                markets.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  asChild
                >
                  <Link href="/contact">
                    Get In Touch
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link href="/team">Meet The Team</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </Section>
      </main>
      <Footer />
    </PublicExperience>
  );
}
