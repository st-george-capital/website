'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { FileText, Plus, Eye, Edit, Trash2, Download, TrendingUp, TrendingDown } from 'lucide-react';

interface ResearchReport {
  id: string;
  companyName: string;
  ticker: string;
  sector: string;
  recommendation: string;
  currentPrice: number;
  targetPrice: number;
  impliedUpside: number;
  status: string;
  published: boolean;
  showOnWebsite: boolean;
  updatedAt: string;
  analysts: string[];
}

export default function ResearchDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const url = filter !== 'all' 
        ? `/api/research-reports?status=${filter}` 
        : '/api/research-reports';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/research-reports/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete report');

      setReports(reports.filter(r => r.id !== id));
      alert('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const toggleWebsiteVisibility = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/research-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnWebsite: !currentValue }),
      });

      if (!response.ok) throw new Error('Failed to update report');

      setReports(reports.map(r => r.id === id ? { ...r, showOnWebsite: !currentValue } : r));
      alert(!currentValue ? 'Report added to website' : 'Report removed from website');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'buy': return 'bg-green-100 text-green-800';
      case 'sell': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equity Research Reports</h1>
          <p className="text-muted-foreground">
            Manage institutional-grade equity research reports
          </p>
        </div>
        <Link href="/dashboard/research/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              variant={filter === 'all' ? undefined : 'outline'}
            >
              All Reports
            </Button>
            <Button
              onClick={() => setFilter('draft')}
              className={filter === 'draft' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              variant={filter === 'draft' ? undefined : 'outline'}
            >
              Drafts
            </Button>
            <Button
              onClick={() => setFilter('published')}
              className={filter === 'published' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              variant={filter === 'published' ? undefined : 'outline'}
            >
              Published
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12">Loading reports...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">No reports found</p>
            <Link href="/dashboard/research/new">
              <Button>Create Your First Report</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">
                        {report.companyName} ({report.ticker})
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRecommendationColor(report.recommendation)}`}>
                        {report.recommendation.toUpperCase()}
                      </span>
                      {report.published && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Published
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <div className="text-gray-600">Sector</div>
                        <div className="font-medium">{report.sector}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Current Price</div>
                        <div className="font-medium">${report.currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Target Price</div>
                        <div className="font-medium">${report.targetPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Implied Upside</div>
                        <div className={`font-medium flex items-center ${report.impliedUpside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {report.impliedUpside >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                          {(report.impliedUpside * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      Analysts: {report.analysts.join(', ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(report.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => router.push(`/dashboard/research/${report.id}/preview`)}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Report
                    </Button>
                    <Button
                      onClick={() => router.push(`/dashboard/research/${report.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {report.published && (
                      <>
                        <Button
                          onClick={() => window.open(`/equity-research/${report.ticker}`, '_blank')}
                          variant="outline"
                          size="sm"
                          className="bg-green-50 text-green-700 hover:bg-green-100"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Public
                        </Button>
                        <Button
                          onClick={() => toggleWebsiteVisibility(report.id, report.showOnWebsite)}
                          variant="outline"
                          size="sm"
                          className={report.showOnWebsite ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : ''}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {report.showOnWebsite ? 'On Website' : 'Add to Website'}
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => deleteReport(report.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
