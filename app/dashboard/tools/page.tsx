'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToolsHubReadingGuide } from '@/components/tool-reading-guide';
import { dashboardFadeInUp, staggerContainer } from '@/lib/motion-variants';
import { toolCatalog as tools } from '@/lib/tool-catalog';

export default function ToolsDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Research Tools</h1>
          <p className="text-muted-foreground">
            Pick a tool by the question you are trying to answer — each page now starts with a plain-English summary.
          </p>
        </div>
      </div>

      <ToolsHubReadingGuide />

      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {tools.map((tool) => (
          <motion.div key={tool.id} variants={dashboardFadeInUp}>
          <Card className="hover:shadow-lg transition-shadow">
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
                  {'plainSummary' in tool && tool.plainSummary ? (
                    <p className="mt-2 text-sm font-medium text-slate-700">{tool.plainSummary}</p>
                  ) : null}
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
                <Link href={tool.href}>
                  <Button className="w-full">
                    Open {tool.name}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        ))}

      </motion.div>
    </div>
  );
}
