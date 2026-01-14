'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Presentation, Plus, Edit, Trash2, FileText, Download, Building } from 'lucide-react';

interface InvestmentPitch {
  id: string;
  title: string;
  company?: string;
  sector: 'macro' | 'equity';
  subcategory?: string;
  pitchDate: string;
  description?: string;
  documentFile?: string;
  published: boolean;
  publishDate?: string;
  createdAt: string;
}

export default function InvestmentPitchesDashboardPage() {
  const { data: session } = useSession();
  const [pitches, setPitches] = useState<InvestmentPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterPublished, setFilterPublished] = useState<string>('all');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchPitches();
  }, [filterSector, filterSubcategory, filterPublished]);

  const fetchPitches = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSector !== 'all') params.append('sector', filterSector);
      if (filterSubcategory !== 'all') params.append('subcategory', filterSubcategory);
      if (filterPublished !== 'all') params.append('published', filterPublished);

      const response = await fetch(`/api/pitches?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPitches(data);
      }
    } catch (error) {
      console.error('Error fetching investment pitches:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePitch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment pitch?')) return;

    try {
      const response = await fetch(`/api/pitches/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPitches(pitches.filter(pitch => pitch.id !== id));
      } else {
        alert('Failed to delete investment pitch');
      }
    } catch (error) {
      console.error('Error deleting investment pitch:', error);
      alert('Failed to delete investment pitch');
    }
  };

  const getSubcategories = (sector: string) => {
    if (sector === 'macro') {
      return ['financials', 'consumer', 'energy', 'healthcare', 'macro_technology'];
    } else if (sector === 'equity') {
      return ['financials', 'consumer', 'energy', 'healthcare', 'technology'];
    }
    return [];
  };

  const getUniqueSubcategories = (): string[] => {
    const subcategories = pitches.map(pitch => pitch.subcategory).filter((sub): sub is string => sub !== null && sub !== undefined);
    return [...new Set(subcategories)].sort();
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investment Pitches</h1>
          <p className="text-muted-foreground">
            Manage investment pitch documents and presentations
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/pitches/new" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            New Pitch
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sector</label>
              <select
                value={filterSector}
                onChange={(e) => {
                  setFilterSector(e.target.value);
                  setFilterSubcategory('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Sectors</option>
                <option value="macro">Macro</option>
                <option value="equity">Equity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subcategory</label>
              <select
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Subcategories</option>
                {(filterSector !== 'all' ? getSubcategories(filterSector) : getUniqueSubcategories()).map(sub => (
                  <option key={sub} value={sub}>{sub.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filterPublished}
                onChange={(e) => setFilterPublished(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pitches List */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Pitches ({pitches.length})</CardTitle>
          <CardDescription>
            {filterSector === 'all' ? 'All sectors' : `${filterSector.charAt(0).toUpperCase() + filterSector.slice(1)} sector`}
            {filterSubcategory !== 'all' && ` • ${filterSubcategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pitches.length === 0 ? (
            <div className="text-center py-8">
              <Presentation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No investment pitches found</h3>
              <p className="text-muted-foreground">
                {filterSector !== 'all' || filterSubcategory !== 'all' || filterPublished !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Get started by creating your first investment pitch.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pitches.map((pitch) => (
                <div key={pitch.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium">{pitch.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          pitch.sector === 'macro'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {pitch.sector}
                        </span>
                        {pitch.subcategory && (
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                            {pitch.subcategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded ${
                          pitch.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {pitch.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {pitch.company && `${pitch.company} • `}
                        {new Date(pitch.pitchDate).toLocaleDateString()}
                        {pitch.publishDate && ` • Published ${new Date(pitch.publishDate).toLocaleDateString()}`}
                      </p>
                      {pitch.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {pitch.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {pitch.documentFile && (
                      <a
                        href={pitch.documentFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    {isAdmin && (
                      <>
                        <Link
                          href={`/dashboard/pitches/${pitch.id}/edit`}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deletePitch(pitch.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
