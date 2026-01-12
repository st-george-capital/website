import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { TrendingUp, Shield, FileText } from 'lucide-react';

export default function FundPage() {
  return (
    <>
      <Hero
        title="The Fund"
        subtitle="Educational portfolio management and research"
        height="medium"
      />

      {/* Investment Philosophy */}
      <Section className="pt-16" dark>
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            title="Our Investment Philosophy"
            subtitle="How we approach portfolio management and research"
            centered
          />

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-serif text-xl mb-3 text-white">Systematic Process</CardTitle>
                <CardDescription className="text-white/80">
                  Combining quantitative models with fundamental analysis for robust decision-making and learning.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-serif text-xl mb-3 text-white">Risk Management</CardTitle>
                <CardDescription className="text-white/80">
                  Rigorous position sizing and portfolio-level risk controls as part of our educational framework.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-serif text-xl mb-3 text-white">Continuous Learning</CardTitle>
                <CardDescription className="text-white/80">
                  Regular strategy reviews and adaptation based on market conditions and performance analysis.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </Section>

      {/* Approach */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            title="Our Approach"
            subtitle="Student-led portfolio management and research"
            centered
          />

          <div className="space-y-8 mt-12">
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="font-serif text-2xl font-bold mb-4">Educational Focus</h3>
              <p className="text-lg leading-relaxed">
                St. George Capital operates as an educational organization where students learn 
                portfolio management, quantitative analysis, and fundamental research. Our fund 
                serves as a practical learning environment for developing real-world investment skills.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="font-serif text-2xl font-bold mb-4">Research-Driven</h3>
              <p className="text-lg leading-relaxed">
                Every investment decision is backed by thorough research and analysis. Our team 
                conducts fundamental analysis, builds financial models, and develops quantitative 
                strategies to understand market dynamics and identify opportunities.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="font-serif text-2xl font-bold mb-4">Collaborative Learning</h3>
              <p className="text-lg leading-relaxed">
                Members work in cross-functional teams, combining expertise from quantitative trading, 
                fundamental research, and risk management. This collaborative approach mirrors 
                real-world institutional investment processes.
              </p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-blue-50 border-l-4 border-primary rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-2">Educational Disclaimer</p>
                <p className="text-sm text-gray-700">
                  St. George Capital is a student-run educational organization. Our activities are 
                  designed for learning purposes and should not be considered investment advice. 
                  All research and analysis is conducted as part of our educational mission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
