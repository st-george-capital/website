'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { BookOpen, Plus, Edit, Trash2, FileText, Download, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WeeklyContent {
  id: string;
  title: string;
  category: 'news' | 'learning';
  year: string;
  season: string;
  week: number;
  description?: string;
  contentType?: 'pdf' | 'markdown';
  content?: string;
  documentFile?: string;
  published: boolean;
  publishDate?: string;
  createdAt: string;
}

export default function WeeklyContentDashboardPage() {
  const { data: session } = useSession();
  const [weeklyContent, setWeeklyContent] = useState<WeeklyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [filterPublished, setFilterPublished] = useState<string>('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<WeeklyContent | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchWeeklyContent();
  }, [filterCategory, filterYear, filterSeason, filterPublished]);

  const fetchWeeklyContent = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterYear !== 'all') params.append('year', filterYear);
      if (filterSeason !== 'all') params.append('season', filterSeason);
      if (filterPublished !== 'all') params.append('published', filterPublished);

      const response = await fetch(`/api/weekly?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setWeeklyContent(data);
      }
    } catch (error) {
      console.error('Error fetching weekly content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = (content: WeeklyContent) => {
    setSelectedContent(content);
    setShowViewModal(true);
  };

  const deleteWeeklyContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weekly content?')) return;

    try {
      const response = await fetch(`/api/weekly/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWeeklyContent(weeklyContent.filter(item => item.id !== id));
      } else {
        alert('Failed to delete weekly content');
      }
    } catch (error) {
      console.error('Error deleting weekly content:', error);
      alert('Failed to delete weekly content');
    }
  };

  const getUniqueYears = () => {
    const years = weeklyContent.map(item => item.year);
    return [...new Set(years)].sort().reverse();
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Weekly Content</h1>
          <p className="text-muted-foreground">
            Manage weekly news and learning materials
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/weekly/new" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            New Weekly Content
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="news">News</option>
                <option value="learning">Learning</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Years</option>
                {getUniqueYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Season</label>
              <select
                value={filterSeason}
                onChange={(e) => setFilterSeason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Seasons</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
                <option value="summer">Summer</option>
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

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Content ({weeklyContent.length})</CardTitle>
          <CardDescription>
            {filterCategory === 'all' ? 'All categories' : `${filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)} only`}
            {filterYear !== 'all' && ` • ${filterYear}`}
            {filterSeason !== 'all' && ` • ${filterSeason}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyContent.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No weekly content found</h3>
              <p className="text-muted-foreground">
                {filterCategory !== 'all' || filterYear !== 'all' || filterSeason !== 'all' || filterPublished !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Get started by creating your first weekly content item.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeklyContent.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      {item.category === 'news' ? (
                        <FileText className="w-5 h-5 text-primary" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium">{item.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.category === 'news'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {item.category}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.year} • {item.season} • Week {item.week}
                        {item.publishDate && ` • Published ${new Date(item.publishDate).toLocaleDateString()}`}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewContent(item)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      title="View content"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {item.documentFile && (
                      <a
                        href={item.documentFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    {isAdmin && (
                      <>
                        <Link
                          href={`/dashboard/weekly/${item.id}/edit`}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit content"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteWeeklyContent(item.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete content"
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

      {/* View Content Modal */}
      {showViewModal && selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedContent.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      selectedContent.category === 'news'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedContent.category}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedContent.year} • {selectedContent.season} • Week {selectedContent.week}
                    </span>
                    {selectedContent.contentType && (
                      <span className="text-sm text-muted-foreground">
                        • {selectedContent.contentType === 'pdf' ? 'PDF Document' : 'Markdown Content'}
                      </span>
                    )}
                  </div>
                  {selectedContent.description && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedContent.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {selectedContent.contentType === 'pdf' && selectedContent.documentFile ? (
                <div className="p-6">
                  <iframe
                    src={selectedContent.documentFile}
                    className="w-full h-[600px] border border-border rounded-lg"
                    title={selectedContent.title}
                  />
                </div>
              ) : selectedContent.contentType === 'markdown' && selectedContent.content ? (
                <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{selectedContent.content}</ReactMarkdown>
                </div>
              ) : selectedContent.documentFile ? (
                <div className="p-6">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">PDF Document</h4>
                    <p className="text-muted-foreground mb-4">
                      This content is available as a PDF document.
                    </p>
                    <a
                      href={selectedContent.documentFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Open PDF
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>No content available to display.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
