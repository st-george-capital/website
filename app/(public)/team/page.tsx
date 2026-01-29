import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader } from '@/components/card';
import { Button } from '@/components/button';
import Link from 'next/link';
import { Linkedin, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { TeamMemberCard } from '@/components/team-member-card';

// Force dynamic rendering to prevent static generation issues with database calls
export const dynamic = 'force-dynamic';

const divisions = [
  {
    name: 'Quantitative Trading',
    description: 'Systematic strategy development and algorithmic trading',
  },
  {
    name: 'Quantitative Research',
    description: 'Academic research and educational programming',
  },
  {
    name: 'Equity & Macro Research',
    description: 'Fundamental analysis and market research',
  },
  {
    name: 'Technology',
    description: 'Infrastructure, data pipelines, and platform development',
  },
  {
    name: 'Operations',
    description: 'Events, recruitment, and organizational management',
  },
  {
    name: 'Charity & Impact',
    description: 'Community outreach and fundraising initiatives',
  },
];

async function getTeamMembers() {
  const members = await prisma.teamMember.findMany({
    where: { isExecutive: true },
    orderBy: { order: 'asc' },
  });
  return members;
}

export default async function TeamPage() {
  const executiveTeam = await getTeamMembers();

  return (
    <>
      <Hero
        title="Leadership"
        breadcrumb="Who We Are / Leadership"
        height="small"
        align="left"
      />

      {/* Shaping Strategy and Vision */}
      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Shaping Strategy<br />and Vision
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              Our leadership team articulates and communicates our vision and guides our extraordinary people, setting the strategic direction for our team.
            </p>
          </div>
        </div>
      </Section>

      {/* Executive Team */}
      <Section dark>
        <SectionHeader
          title="Executive Team"
          subtitle="Leadership guiding our organization's vision and operations"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {executiveTeam.map((member, index) => (
            <TeamMemberCard key={member.id} member={member} index={index} />
          ))}
        </div>
      </Section>

      {/* Divisions Overview */}
      <Section>
        <SectionHeader
          title="Our Divisions"
          subtitle="Specialized teams working together toward common goals"
          centered
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {divisions.map((division, index) => (
            <Card key={division.name}>
              <CardHeader className="text-center">
                <h3 className="font-serif text-xl font-bold mb-3">{division.name}</h3>
                <p className="text-sm">{division.description}</p>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-4xl font-bold mb-2">2023</div>
              <p className="text-lg">Founded</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">80+</div>
              <p className="text-lg">Members</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <p className="text-lg">Research Projects</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Why Join Section */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            title="Why Join SGC?"
            subtitle="What makes our organization unique"
            centered
          />

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <div className="text-4xl font-bold text-primary mb-4">01</div>
              <h3 className="font-serif text-2xl font-bold mb-3">Hands-On Experience</h3>
              <p className="leading-relaxed">
                Work on real projects using industry-standard tools and methodologies. Build a portfolio that stands out to employers.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-primary mb-4">02</div>
              <h3 className="font-serif text-2xl font-bold mb-3">Mentorship & Learning</h3>
              <p className="leading-relaxed">
                Learn from experienced members and industry professionals through workshops, seminars, and one-on-one guidance.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-primary mb-4">03</div>
              <h3 className="font-serif text-2xl font-bold mb-3">Network & Community</h3>
              <p className="leading-relaxed">
                Connect with like-minded peers, build lasting relationships, and join a network of SGC alumni in top finance roles.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-primary mb-4">04</div>
              <h3 className="font-serif text-2xl font-bold mb-3">Career Preparation</h3>
              <p className="leading-relaxed">
                Develop technical and soft skills that top employers value. Prepare for internships and full-time roles at leading firms.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section dark>
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            Join Canada's Premier Quantitative Finance Organization
          </h2>
          <p className="text-xl mb-10">
            Recruitment opens in September. Connect with us to learn more about joining our team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg bg-[#030116] text-white hover:bg-[#06041f] shadow-lg shadow-primary/20 hover:shadow-primary/30 font-medium transition-all duration-200"
            >
              <span>Get In Touch</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/research" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-lg border-2 border-white/30 text-white hover:bg-white/10 font-medium transition-all duration-200"
            >
              <span>View Our Research</span>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
