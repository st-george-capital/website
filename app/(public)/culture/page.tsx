import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Users, Coffee, Lightbulb, Target } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function CulturePage() {
  let logos: { id: string; name: string; logoUrl: string; order: number }[] = [];
  try {
    logos = await prisma.employerLogo.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  } catch {
    // table may not exist yet — degrade gracefully
  }
  const values = [
    {
      icon: Target,
      title: 'Excellence',
      description: 'We pursue excellence in everything we do—from rigorous research to precise execution. Our members are committed to continuous learning and pushing boundaries in quantitative finance.',
    },
    {
      icon: Users,
      title: 'Collaboration',
      description: 'We believe the best insights come from diverse perspectives. Our cross-divisional teams work together to solve complex problems and share knowledge across trading, research, and analysis.',
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'We foster a culture of experimentation and creative problem-solving. Whether developing new trading strategies or researching emerging markets, we embrace calculated risk-taking.',
    },
    {
      icon: Coffee,
      title: 'Community',
      description: 'Beyond markets and models, we build lasting relationships. From weekly workshops to social events, SGC is a tight-knit community that supports each member\'s growth.',
    },
  ];

  return (
    <>
      <Hero
        title="Our Culture"
        breadcrumb="What We Do / Culture"
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
              St. George Capital is built on a foundation of excellence, collaboration, and innovation. Our culture rewards intellectual curiosity, quantitative rigor, and entrepreneurial initiative.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              We believe the best insights come from diverse perspectives. Our cross-divisional teams work together to solve complex problems and share knowledge across trading, research, and analysis.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              From weekly workshops to social events, SGC is a tight-knit community that supports each member's growth. Members gain hands-on experience managing a real portfolio, conducting institutional-grade research, and developing sophisticated trading strategies.
            </p>
          </div>
        </div>
      </Section>

      <Section dark className="!py-12 !md:py-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-8 text-center">
            Life at SGC
          </h3>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-lg leading-relaxed">
                St. George Capital offers a unique experience where students passionate about finance can learn, grow, and make an impact. Our members gain hands-on experience managing a real portfolio, conducting institutional-grade research, and developing sophisticated trading strategies.
              </p>
              <p className="text-lg leading-relaxed">
                We meet weekly for educational workshops, guest speaker sessions, and collaborative project work. Members are mentored by senior analysts and have opportunities to present their research to the broader team.
              </p>
              <p className="text-lg leading-relaxed">
                Whether you're interested in quantitative trading, equity research, or macro analysis, SGC provides the resources, mentorship, and community to help you succeed.
              </p>
            </div>

            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/webphotos/culture.jpeg"
                alt="St. George Capital Team Culture"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </div>
        </div>
      </Section>

      {logos.length > 0 && (
        <Section className="!py-16">
          <div className="max-w-5xl mx-auto">
            <h3 className="font-serif text-3xl md:text-4xl font-bold mb-3 text-center">
              Where We Have Worked
            </h3>
            <p className="text-center text-gray-500 mb-12 text-lg">
              SGC members and alumni have gone on to work at leading firms across finance and technology.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-8">
              {logos.map((logo) => (
                <div key={logo.id} className="flex items-center justify-center w-32 h-14">
                  <Image
                    src={logo.logoUrl}
                    alt={logo.name}
                    title={logo.name}
                    width={128}
                    height={56}
                    className="max-h-full max-w-full object-contain grayscale opacity-70 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
                  />
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
