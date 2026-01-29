import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Users, Coffee, Lightbulb, Target } from 'lucide-react';

export default function CulturePage() {
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
      <Section className="pt-32 pb-16" dark>
        <div className="max-w-4xl">
          <SectionHeader
            title="Our Culture"
            subtitle="A community built on excellence, collaboration, and continuous learning"
          />
        </div>
      </Section>

      <Section>
        <div className="max-w-7xl mx-auto">
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-12 text-center">
            What Defines Us
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 bg-[#030116]/10 rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-[#030116]" />
                  </div>
                  <CardTitle className="font-serif text-2xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section dark>
        <div className="max-w-6xl mx-auto">
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-12 text-center">
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
              <img
                src="/images/exec team/webphotos/culture.jpeg"
                alt="St. George Capital Team Culture"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

