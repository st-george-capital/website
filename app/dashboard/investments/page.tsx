'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface Investment {
  id: string;
  type: 'thesis' | 'outlook';
  title: string;
  company?: string;
  ticker?: string;
  year: number;
  season: string;
  content: string;
  thesis?: string;
  entryDate?: string;
  priceAtEntry?: number;
  initialTarget?: number;
  currentTarget?: number;
  tags: string;
  published: boolean;
  createdAt: string;
}

export default function InvestmentsDashboardPage() {
  const { data: session } = useSession();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPublished, setFilterPublished] = useState<string>('all');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (filterPublished !== 'all') params.append('published', filterPublished === 'published' ? 'true' : 'false');

      const response = await fetch(`/api/investments?${params}`);
      const data = await response.json();
      setInvestments(data);
    } catch (error) {
      console.error('Failed to fetch investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (id: string, currentPublished: boolean) => {
    try {
      const response = await fetch(`/api/investments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentPublished }),
      });

      if (response.ok) {
        setInvestments(investments.map(inv =>
          inv.id === id ? { ...inv, published: !currentPublished } : inv
        ));
      }
    } catch (error) {
      console.error('Failed to toggle published status:', error);
    }
  };

  const deleteInvestment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;

    try {
      const response = await fetch(`/api/investments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvestments(investments.filter(inv => inv.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete investment:', error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const getTagsArray = (tags: string) => {
    return tags ? tags.split(',').map(tag => tag.trim()) : [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading investments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Investment Research</h1>
          <p className="text-muted-foreground">Manage investment theses and market outlooks</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/investments/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Investment
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 overflow-x-auto pb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Type:</span>
          {['all', 'thesis', 'outlook'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                filterType === type
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Status:</span>
            {['all', 'published', 'draft'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterPublished(status)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  filterPublished === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Investments Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments.map((investment) => (
          <Card key={investment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={investment.type === 'thesis' ? 'default' : 'secondary'}>
                      {investment.type === 'thesis' ? 'Thesis' : 'Outlook'}
                    </Badge>
                    {!investment.published && (
                      <Badge variant="outline" className="text-orange-600">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mb-1">{investment.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {investment.year} • {investment.season}
                    {investment.company && ` • ${investment.company}`}
                    {investment.ticker && ` (${investment.ticker})`}
                  </CardDescription>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  {investment.type === 'thesis' ? (
                    <div className="w-6 h-6 bg-primary rounded"></div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-primary rounded"></div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {investment.type === 'thesis' && (
                  <div className="text-sm">
                    <div className="font-medium text-muted-foreground">Entry Price:</div>
                    <div>{formatCurrency(investment.priceAtEntry)}</div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {getTagsArray(investment.tags).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/investments/${investment.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublished(investment.id, investment.published)}
                      >
                        {investment.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInvestment(investment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Link href={`/investments/${investment.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {investments.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <CardTitle className="mb-2">No investments found</CardTitle>
            <CardDescription>
              {filterType !== 'all' || filterPublished !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first investment thesis or outlook'
              }
            </CardDescription>
            {isAdmin && (
              <Link href="/dashboard/investments/new" className="inline-block mt-4">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investment
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
