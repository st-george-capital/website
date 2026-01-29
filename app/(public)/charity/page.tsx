import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Heart, Users, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/button';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

// Force dynamic rendering to prevent static generation issues with database calls
export const dynamic = 'force-dynamic';

async function getCharityAmount() {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'charityTotal' },
    });
    return setting?.value || '3000';
  } catch (error) {
    return '3000';
  }
}

export default async function CharityPage() {
  const charityAmount = await getCharityAmount();

  return (
    <>
      <Hero
        title="Charity & Impact"
        breadcrumb="What We Do / Charity & Impact"
        height="small"
        align="left"
      />

      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Registered Not-for-Profit Organization
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              St. George Capital is proud to operate as a registered not-for-profit organization. Beyond developing expertise in quantitative finance, we're committed to creating positive impact in our community through strategic charitable initiatives.
            </p>
          </div>
        </div>
      </Section>

      <Section dark className="!py-12 !md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/10 rounded-2xl px-8 py-6 mb-8">
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-5xl md:text-6xl font-bold text-white">
                  ${Number(charityAmount).toLocaleString()}
                </span>
              </div>
              <p className="text-lg mt-2 text-white/80">Total Raised for SickKids</p>
            </div>
          </div>

          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-12 text-center">
            Our Partnership with SickKids Foundation
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <p className="text-lg leading-relaxed mb-6">
                We've established a meaningful partnership with The Hospital for Sick Children (SickKids Foundation), 
                one of the world's foremost pediatric health-care institutions. Through collaborative 
                fundraising events, we support SickKids' mission to provide the best in complex and 
                specialized care.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                Our fundraising initiatives bring together the SGC community, University of Toronto students, 
                and the broader finance community to make a tangible difference in the lives of children 
                and their families.
              </p>
              <a 
                href="https://www.sickkidsfoundation.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button variant="primary" size="lg" className="inline-flex items-center">
                  <span>Learn More About SickKids Foundation</span>
                </Button>
              </a>
            </div>
            
            <div className="relative h-96 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl overflow-hidden">
              <img 
                src="/images/charity/sgcsoccer.jpeg" 
                alt="SGC SickKids Charity Event"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <Calendar className="w-8 h-8 mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Annual Events</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  We organize multiple fundraising events throughout the year, including charity galas, 
                  sports tournaments, and community drives.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <Users className="w-8 h-8 mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Community Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Our members volunteer time and expertise, engaging directly with SickKids Foundation initiatives 
                  and spreading awareness across campus.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <TrendingUp className="w-8 h-8 mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">Growing Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Year over year, we're expanding our fundraising efforts and deepening our partnership
                  to maximize our collective impact.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <DollarSign className="w-8 h-8 mb-4 text-white" />
                <CardTitle className="font-serif text-xl text-white">SGC Charity Fund</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Our dedicated charity fund accepts donations and invests them using our quantitative
                  investment philosophy. A percentage of returns is donated yearly to causes our team
                  holds dear, creating sustainable impact through strategic finance.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      <Section className="!py-12 !md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-6">
            Get Involved
          </h3>
          <p className="text-lg leading-relaxed mb-8">
            Interested in supporting our charitable initiatives? Whether you're an SGC member, 
            UofT student, or community partner, there are many ways to contribute to our mission 
            of giving back while building expertise in finance.
          </p>
          <Link href="/contact">
            <Button variant="primary" size="lg" className="inline-flex items-center">
              <span>Contact Us</span>
            </Button>
          </Link>
        </div>
      </Section>
    </>
  );
}
