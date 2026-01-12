'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

// Mock data - would come from API
const articles = [
  {
    id: '1',
    title: 'Machine Learning Applications in Portfolio Optimization',
    slug: 'ml-portfolio-optimization',
    category: 'Quant Trading',
    author: 'John Smith',
    publishedAt: '2026-01-05',
    featured: true,
    status: 'published',
  },
  {
    id: '2',
    title: 'Central Bank Policy and Fixed Income Markets',
    slug: 'central-bank-policy',
    category: 'Equity & Macro',
    author: 'Sarah Johnson',
    publishedAt: '2025-12-20',
    featured: true,
    status: 'published',
  },
  {
    id: '3',
    title: 'Statistical Arbitrage in Cryptocurrency Markets',
    slug: 'stat-arb-crypto',
    category: 'Quant Research',
    author: 'Michael Chen',
    publishedAt: null,
    featured: false,
    status: 'draft',
  },
];

export default function ResearchDashboardPage() {
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const filteredArticles = articles.filter((article) => {
    if (filter === 'all') return true;
    return article.status === filter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Research Articles</h1>
          <p className="text-muted-foreground">Create and manage your research content</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({articles.length})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'published'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Published ({articles.filter((a) => a.status === 'published').length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'draft'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Drafts ({articles.filter((a) => a.status === 'draft').length})
        </button>
      </div>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
          <CardDescription>Manage your research publications</CardDescription>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Author</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Published</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="border-b border-border">
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{article.title}</span>
                        {article.featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {article.category}
                      </span>
                    </td>
                    <td className="py-4">{article.author}</td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          article.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/research/${article.slug}`}
                          target="_blank"
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Eye size={16} />
                        </Link>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No articles found. Create your first article to get started.
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-3xl">12,543</CardTitle>
            <p className="text-sm text-green-600">+23% this month</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg. Reading Time</CardDescription>
            <CardTitle className="text-3xl">8.5 min</CardTitle>
            <p className="text-sm text-muted-foreground">Across all articles</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Engagement Rate</CardDescription>
            <CardTitle className="text-3xl">67%</CardTitle>
            <p className="text-sm text-green-600">+5% this month</p>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

