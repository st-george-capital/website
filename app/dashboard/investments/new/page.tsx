'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewInvestmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'thesis',
    title: '',
    company: '',
    ticker: '',
    year: new Date().getFullYear(),
    season: 'Fall',
    content: '',
    thesis: '',
    entryDate: '',
    priceAtEntry: '',
    initialTarget: '',
    currentTarget: '',
    tags: 'Equity',
    published: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard/investments');
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Failed to create investment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/investments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Investment</h1>
          <p className="text-muted-foreground">Create a new investment thesis or market outlook</p>
        </div>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
                required
              >
                <option value="thesis">Investment Thesis</option>
                <option value="outlook">Market Outlook</option>
              </select>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., Long Position - Loblaws"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., Loblaw Companies Limited"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ticker</label>
                <input
                  type="text"
                  name="ticker"
                  value={formData.ticker}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., L"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value={2023}>2023</option>
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Season</label>
                  <select
                    name="season"
                    value={formData.season}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="Fall">Fall</option>
                    <option value="Winter">Winter</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Thesis-specific fields */}
            {formData.type === 'thesis' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Investment Thesis</label>
                  <textarea
                    name="thesis"
                    value={formData.thesis}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="Why we should invest..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Date</label>
                    <input
                      type="date"
                      name="entryDate"
                      value={formData.entryDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Price at Entry ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="priceAtEntry"
                      value={formData.priceAtEntry}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="129.82"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Initial Target ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="initialTarget"
                      value={formData.initialTarget}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="150.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Current Target ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="currentTarget"
                    value={formData.currentTarget}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="155.00"
                  />
                </div>
              </>
            )}

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {formData.type === 'thesis' ? 'Full Analysis' : 'Market Outlook'}
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={10}
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder={formData.type === 'thesis'
                  ? "Detailed analysis, valuation, risks, catalysts..."
                  : "Market outlook, economic analysis, sector views..."
                }
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <select
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="Equity">Equity</option>
                <option value="Macro">Macro</option>
                <option value="Investment Strategy">Investment Strategy</option>
              </select>
            </div>

            {/* Publish */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                name="published"
                checked={formData.published}
                onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="published" className="text-sm font-medium">
                Publish immediately
              </label>
            </div>

            {/* Submit */}
            <div className="flex space-x-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Investment'}
              </Button>
              <Link href="/dashboard/investments">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
