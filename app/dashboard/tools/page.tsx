'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Calculator, TrendingUp, BarChart3 } from 'lucide-react';

const tools = [
  {
    id: 'dcf',
    name: 'DCF Valuation Tool',
    description: 'Interactive Discounted Cash Flow valuation model for equity research and analysis',
    icon: Calculator,
    features: [
      'Free Cash Flow projections',
      'WACC calculation',
      'Terminal value estimation',
      'Sensitivity analysis',
      'Professional charts',
    ],
  },
  // Future tools can be added here
  // {
  //   id: 'relative-valuation',
  //   name: 'Relative Valuation Tool',
  //   description: 'Multiples-based valuation using comparable companies',
  //   icon: BarChart3,
  // },
];

export default function ToolsDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Research Tools</h1>
          <p className="text-muted-foreground">
            Professional valuation and analysis tools for equity research
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <tool.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {tool.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {tool.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={`/dashboard/tools/${tool.id}`}>
                  <Button className="w-full">
                    Open {tool.name}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Coming Soon Placeholder */}
        <Card className="border-dashed border-2">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Coming Soon</CardTitle>
                <CardDescription>
                  More research tools in development
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Additional valuation tools and analysis features are being developed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}