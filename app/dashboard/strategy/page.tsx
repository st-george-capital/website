'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  TrendingUp,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';

interface StrategyDocument {
  id: string;
  type: 'investment_strategy' | 'industry_report';
  title: string;
  year: string;
  content: string;
  executiveSummary?: string;
  industries?: string;
  sectors?: string;
  coverImage?: string;
  documentFile?: string;
  published: boolean;
  publishDate?: string;
  createdAt: string;
}

export default function StrategyDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<StrategyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'investment_strategy' | 'industry_report'>('all');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchDocuments();
  }, [filterType, filterPublished]);

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (filterPublished !== 'all') params.append('published', filterPublished === 'published');

      const response = await fetch(`/api/strategy?${params}`);
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch strategy documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (id: string, currentPublished: boolean) => {
    try {
      const response = await fetch(`/api/strategy/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentPublished }),
      });

      if (response.ok) {
        fetchDocuments(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/strategy/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDocuments(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Strategy Documents</h1>
          <p className="text-muted-foreground">
            Manage investment strategies and industry reports
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/strategy/new?type=investment_strategy">
                <Plus className="w-4 h-4 mr-2" />
                New Strategy
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/strategy/new?type=industry_report">
                <Plus className="w-4 h-4 mr-2" />
                New Industry Report
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="investment_strategy">Investment Strategies</option>
            <option value="industry_report">Industry Reports</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <select
            value={filterPublished}
            onChange={(e) => setFilterPublished(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md text-sm"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="grid gap-6">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {doc.type === 'investment_strategy' ? (
                      <TrendingUp className="w-8 h-8 text-primary" />
                    ) : (
                      <FileText className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{doc.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {doc.type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report'}
                      </Badge>
                      <Badge variant={doc.published ? "default" : "secondary"}>
                        {doc.published ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {doc.year}
                      </span>
                    </div>
                    {doc.executiveSummary && (
                      <p className="text-muted-foreground line-clamp-2">
                        {doc.executiveSummary}
                      </p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(doc.id, doc.published)}
                    >
                      {doc.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/strategy/${doc.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  {doc.industries && (
                    <span>Industries: {doc.industries}</span>
                  )}
                  {doc.sectors && (
                    <span>Sectors: {doc.sectors}</span>
                  )}
                  {doc.publishDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(doc.publishDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {doc.documentFile && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.documentFile} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {documents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground">
              {filterType !== 'all' || filterPublished !== 'all'
                ? 'Try adjusting your filters or create a new document.'
                : 'Get started by creating your first strategy document or industry report.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
