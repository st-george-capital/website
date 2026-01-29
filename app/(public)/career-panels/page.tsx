import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Briefcase, Users, Calendar, Award } from 'lucide-react';
import { Button } from '@/components/button';
import Link from 'next/link';

export default function CareerPanelsPage() {
  const firms = [
    {
      name: 'Goldman Sachs',
      description: 'Global investment banking, securities and investment management',
      topics: ['Investment Banking', 'Trading', 'Asset Management'],
    },
    {
      name: 'Optiver',
      description: 'Leading global market maker and proprietary trading firm',
      topics: ['Market Making', 'Quantitative Trading', 'Technology'],
    },
    {
      name: 'Ontario Teachers\' Pension Plan (OTPP)',
      description: 'One of Canada\'s largest institutional investors',
      topics: ['Pension Management', 'Alternative Investments', 'Public Equities'],
    },
    {
      name: 'Canada Pension Plan Investment Board (CPPIB)',
      description: 'Professional investment management organization',
      topics: ['Global Investing', 'Portfolio Management', 'Private Equity'],
    },
    {
      name: 'RBC Capital Markets',
      description: 'Corporate and investment banking services',
      topics: ['Capital Markets', 'Research', 'Corporate Banking'],
    },
    {
      name: 'TD Securities',
      description: 'Wholesale banking arm of TD Bank Group',
      topics: ['Fixed Income', 'Equity Markets', 'Derivatives'],
    },
    {
      name: 'Jump Trading',
      description: 'Research-driven trading firm at the forefront of technology',
      topics: ['High-Frequency Trading', 'Quantitative Research', 'Technology Infrastructure'],
    },
  ];

  return (
    <>
      <Hero
        title="Career Panels"
        breadcrumb="What We Do / Career Panels"
        height="small"
        align="left"
      />

      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Industry Connections
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              St. George Capital hosts exclusive career panel events featuring professionals from top-tier financial institutions. These intimate sessions provide members with direct access to industry leaders, offering insights into career paths, recruitment processes, and the day-to-day realities of working in quantitative finance.
            </p>
          </div>
        </div>
      </Section>

      <Section dark>
        <div className="max-w-6xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {firms.map((firm, index) => (
            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="font-serif text-xl mb-2">{firm.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mb-4">
                  {firm.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {firm.topics.map((topic, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-[#030116]/10 text-[#030116] text-xs rounded-full font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </Section>

      <Section dark className="!py-12 !md:py-16">
        <div className="max-w-7xl mx-auto">
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-8 text-center">
            What to Expect
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-white/5 border-white/10 text-center">
              <CardHeader>
                <Briefcase className="w-10 h-10 mx-auto mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Career Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Learn about diverse career paths in trading, research, investment banking, 
                  and asset management.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-center">
              <CardHeader>
                <Users className="w-10 h-10 mx-auto mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Networking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Connect directly with professionals and build relationships that extend 
                  beyond the panel.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-center">
              <CardHeader>
                <Calendar className="w-10 h-10 mx-auto mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Regular Events</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Multiple panel sessions throughout the academic year, covering various 
                  firms and specializations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-center">
              <CardHeader>
                <Award className="w-10 h-10 mx-auto mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Exclusive Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  SGC members gain privileged access to industry professionals and 
                  recruitment opportunities.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      <Section className="!py-12 !md:py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-6 text-center">
            Past Panel Topics
          </h3>
          
          <div className="space-y-6 mb-12">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Breaking into Quantitative Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Professionals from Optiver and Jump Trading discussed technical interview preparation, 
                  essential skills in mathematics and programming, and what it's like to work at a 
                  high-frequency trading firm.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Institutional Asset Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Portfolio managers from OTPP and CPPIB shared insights on managing large-scale 
                  investment portfolios, evaluating alternative investments, and the unique challenges 
                  of pension fund management.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Investment Banking & Capital Markets</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Analysts and associates from Goldman Sachs, RBC, and TD Securities discussed deal 
                  execution, client relationships, and building a career in investment banking.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-lg mb-6">
              Interested in attending our next career panel or bringing your firm to SGC?
            </p>
            <Link href="/contact">
              <Button variant="primary" size="lg">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}

