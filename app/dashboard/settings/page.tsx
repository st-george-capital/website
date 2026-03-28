'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Save, Trash2, Upload, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployerLogo {
  id: string;
  name: string;
  logoUrl: string;
  order: number;
}

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
  const [logos, setLogos] = useState<EmployerLogo[]>([]);
  const [logoName, setLogoName] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (!isAdmin && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    fetchSettings();
    fetchLogos();
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

  const fetchLogos = async () => {
    try {
      const res = await fetch('/api/employer-logos');
      if (res.ok) setLogos(await res.json());
    } catch (error) {
      console.error('Error fetching logos:', error);
    }
  };

  const handleLogoUpload = async () => {
    const file = logoFileRef.current?.files?.[0];
    if (!file || !logoName.trim()) {
      alert('Please provide a company name and select a logo image.');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }
      const { url } = await uploadRes.json();

      const createRes = await fetch('/api/employer-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: logoName.trim(), logoUrl: url, order: logos.length }),
      });
      if (!createRes.ok) throw new Error('Failed to save logo');

      setLogoName('');
      if (logoFileRef.current) logoFileRef.current.value = '';
      await fetchLogos();
    } catch (error: any) {
      alert(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async (id: string) => {
    if (!confirm('Remove this logo?')) return;
    try {
      await fetch('/api/employer-logos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchLogos();
    } catch (error) {
      console.error('Error deleting logo:', error);
    }
  };

  const handleMoveLogo = async (index: number, direction: 'left' | 'right') => {
    const newLogos = [...logos];
    const swapIndex = direction === 'left' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newLogos.length) return;
    [newLogos[index], newLogos[swapIndex]] = [newLogos[swapIndex], newLogos[index]];
    setLogos(newLogos); // optimistic update
    try {
      await fetch('/api/employer-logos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newLogos.map((l) => l.id) }),
      });
    } catch (error) {
      console.error('Error reordering logos:', error);
      await fetchLogos(); // revert on error
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

      {/* Employer Logos */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Where We Have Worked — Company Logos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Upload new logo */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Company Name</label>
                <input
                  type="text"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Goldman Sachs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Logo Image</label>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">PNG, JPG, WebP, or SVG. Use a transparent-background logo for best results.</p>
              </div>
              <Button
                onClick={handleLogoUpload}
                disabled={uploadingLogo}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingLogo ? 'Uploading...' : 'Add Logo'}
              </Button>
            </div>

            {/* Existing logos */}
            {logos.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3 text-gray-700">{logos.length} logo{logos.length !== 1 ? 's' : ''} saved</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {logos.map((logo, index) => (
                    <div key={logo.id} className="relative group border border-gray-200 rounded-lg p-3 flex flex-col items-center gap-2 bg-gray-50">
                      <img
                        src={logo.logoUrl}
                        alt={logo.name}
                        className="h-10 w-full object-contain"
                      />
                      <p className="text-xs text-gray-600 text-center truncate w-full">{logo.name}</p>
                      {/* Order controls */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveLogo(index, 'left')}
                          disabled={index === 0}
                          className="p-1 bg-white rounded shadow text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move left"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveLogo(index, 'right')}
                          disabled={index === logos.length - 1}
                          className="p-1 bg-white rounded shadow text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move right"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteLogo(logo.id)}
                          className="p-1 bg-white rounded shadow text-red-500 hover:text-red-700"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {logos.length === 0 && (
              <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
                <Building2 className="w-8 h-8" />
                <p className="text-sm">No logos yet. Add the first one above.</p>
              </div>
            )}
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
