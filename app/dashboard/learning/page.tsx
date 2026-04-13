'use client';

import Link from 'next/link';
import { GraduationCap, BookOpen, Rss, Youtube, ExternalLink, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';

const sections = [
  {
    id: 'curated',
    name: 'Curated Resources',
    description: 'Manage favorite books, newsletters, YouTube channels, and external courses',
    href: '/dashboard/learning/curated',
    icon: BookOpen,
    kinds: ['Books', 'Newsletters', 'YouTube', 'External Courses'],
  },
  {
    id: 'courses',
    name: 'SGC Courses',
    description: 'Build internal lesson-based courses (options, macro, quant, and more)',
    href: '/dashboard/learning/courses',
    icon: GraduationCap,
    kinds: ['Create courses', 'Add lessons', 'Publish to members'],
  },
];

export default function LearningHubPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Learning Tools</h1>
        <p className="text-gray-500 mt-1">
          Curate external resources and build internal courses for SGC members.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.id} href={section.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{section.name}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {section.kinds.map((k) => (
                      <li key={k} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 inline-block" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Members view:</strong> Content published here appears at{' '}
          <span className="font-mono">/learn</span> — accessible only to logged-in SGC members.
        </p>
      </div>
    </div>
  );
}
