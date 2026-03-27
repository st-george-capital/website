'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    charityTotal: '3000',
    foundedYear: '2023',
    memberCount: '80+',
    projectCount: '50+',
    initialCash: '100000',
    riskFreeRate: '0.045',
    benchmarkTicker: 'SPY',
  });

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (!isAdmin && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          charityTotal: data.charityTotal || '3000',
          foundedYear: data.foundedYear || '2023',
          memberCount: data.memberCount || '80+',
          projectCount: data.projectCount || '50+',
          initialCash: data.initialCash || '100000',
          riskFreeRate: data.riskFreeRate || '0.045',
          benchmarkTicker: data.benchmarkTicker || 'SPY',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each setting
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
          })
        )
      );

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Site Settings</h1>
        <p className="text-gray-600">
          Update homepage statistics and other site-wide settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Homepage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Founded Year */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Founded Year
              </label>
              <input
                type="text"
                value={settings.foundedYear}
                onChange={(e) => setSettings({ ...settings, foundedYear: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="2023"
              />
              <p className="text-sm text-gray-500 mt-1">
                Displays on homepage as "Founded"
              </p>
            </div>

            {/* Member Count */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Member Count
              </label>
              <input
                type="text"
                value={settings.memberCount}
                onChange={(e) => setSettings({ ...settings, memberCount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="80+"
              />
              <p className="text-sm text-gray-500 mt-1">
                Displays on homepage as "Active Members"
              </p>
            </div>

            {/* Project Count */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Research Projects
              </label>
              <input
                type="text"
                value={settings.projectCount}
                onChange={(e) => setSettings({ ...settings, projectCount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="50+"
              />
              <p className="text-sm text-gray-500 mt-1">
                Displays on homepage as "Research Projects"
              </p>
            </div>

            {/* Charity Total */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Charity Total Raised ($)
              </label>
              <input
                type="text"
                value={settings.charityTotal}
                onChange={(e) => setSettings({ ...settings, charityTotal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="3000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Displays on charity page (just the number, no $ sign)
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Configuration */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Portfolio Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Initial Cash Balance ($)
              </label>
              <input
                type="number"
                step="1000"
                value={settings.initialCash}
                onChange={(e) => setSettings({ ...settings, initialCash: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="100000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Starting cash balance for the portfolio simulation (default: $100,000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Risk-Free Rate (annual, decimal)
              </label>
              <input
                type="number"
                step="0.001"
                value={settings.riskFreeRate}
                onChange={(e) => setSettings({ ...settings, riskFreeRate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.045"
              />
              <p className="text-sm text-gray-500 mt-1">
                Used for Sharpe ratio calculation (e.g., 0.045 = 4.5%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Benchmark Ticker
              </label>
              <input
                type="text"
                value={settings.benchmarkTicker}
                onChange={(e) => setSettings({ ...settings, benchmarkTicker: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="SPY"
              />
              <p className="text-sm text-gray-500 mt-1">
                Benchmark ticker for comparison chart (default: SPY)
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
