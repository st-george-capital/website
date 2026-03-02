'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Trash2, Users, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

interface ResumeSubmission {
  id: string;
  name: string;
  email: string;
  faculty: string;
  subfaculty: string | null;
  internshipCount: number;
  internshipFields: string[];
  resumeFile: string;
  createdAt: string;
}

const FACULTY_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  arts_science: 'Arts & Science',
  rotman: 'Rotman Commerce',
};

const SUBFACULTY_LABELS: Record<string, string> = {
  electrical_engineering: 'Electrical Engineering',
  mechanical_engineering: 'Mechanical Engineering',
  industrial_engineering: 'Industrial Engineering',
  engineering_science: 'Engineering Science',
  chemical_engineering: 'Chemical Engineering',
  materials_engineering: 'Materials Engineering',
  civil_engineering: 'Civil Engineering',
  economics: 'Economics',
  philosophy: 'Philosophy',
  marketing: 'Marketing',
  mathematics: 'Mathematics',
  computer_science: 'Computer Science',
};

const FIELD_LABELS: Record<string, string> = {
  finance: 'Finance',
  tech: 'Technology',
  research: 'Research',
  other: 'Other',
};

const FACULTY_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b'];
const SUB_COLORS = ['#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#e0e7ff', '#c7d2fe', '#a5b4fc'];
const FIELD_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
const INTERNSHIP_COLORS = ['#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ResumeBookPage() {
  const { data: session } = useSession();
  const [submissions, setSubmissions] = useState<ResumeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillFaculty, setDrillFaculty] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => { if (isAdmin) fetchSubmissions(); }, [isAdmin]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/resume-book');
      if (res.ok) setSubmissions(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume submission?')) return;
    try {
      const res = await fetch(`/api/resume-book/${id}`, { method: 'DELETE' });
      if (res.ok) setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Chart data ──────────────────────────────────────────────────────
  const facultyData = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s => { counts[s.faculty] = (counts[s.faculty] || 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({
      name: FACULTY_LABELS[key] || key,
      value,
      key,
    }));
  }, [submissions]);

  const subfacultyData = useMemo(() => {
    if (!drillFaculty) return [];
    const counts: Record<string, number> = {};
    submissions
      .filter(s => s.faculty === drillFaculty)
      .forEach(s => {
        const k = s.subfaculty || 'Unspecified';
        counts[k] = (counts[k] || 0) + 1;
      });
    return Object.entries(counts).map(([key, value]) => ({
      name: SUBFACULTY_LABELS[key] || key,
      value,
    }));
  }, [submissions, drillFaculty]);

  const fieldData = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s =>
      s.internshipFields.forEach(f => { counts[f] = (counts[f] || 0) + 1; })
    );
    return Object.entries(counts).map(([key, value]) => ({
      name: FIELD_LABELS[key] || key,
      value,
    }));
  }, [submissions]);

  const internshipCountData = useMemo(() => {
    const counts: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
    submissions.forEach(s => {
      const k = s.internshipCount >= 5 ? '5+' : String(s.internshipCount);
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  // ── Filtered list ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (FACULTY_LABELS[s.faculty] || s.faculty).toLowerCase().includes(q)
    );
  }, [submissions, search]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" className="text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Resume Book</h1>
            <p className="text-muted-foreground">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
            <p className="text-muted-foreground">Resumes will appear here once members submit them.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Demographics Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Faculty Pie – drillable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {drillFaculty ? (
                    <>
                      <button
                        onClick={() => setDrillFaculty(null)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-normal"
                      >
                        <ArrowLeft className="w-3 h-3" /> All Faculties
                      </button>
                      <span>{FACULTY_LABELS[drillFaculty]} Programs</span>
                    </>
                  ) : (
                    <span>Faculty Distribution <span className="text-xs text-muted-foreground font-normal ml-1">(click to drill down)</span></span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  {drillFaculty ? (
                    <PieChart>
                      <Pie data={subfacultyData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {subfacultyData.map((_, i) => <Cell key={i} fill={SUB_COLORS[i % SUB_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={facultyData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        onClick={(entry) => setDrillFaculty(entry.key)}
                        style={{ cursor: 'pointer' }}
                      >
                        {facultyData.map((_, i) => <Cell key={i} fill={FACULTY_COLORS[i % FACULTY_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  )}
                </ResponsiveContainer>
                {!drillFaculty && (
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {facultyData.map((d, i) => (
                      <button key={d.key} onClick={() => setDrillFaculty(d.key)} className="flex items-center gap-1.5 text-xs hover:underline">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: FACULTY_COLORS[i % FACULTY_COLORS.length] }} />
                        {d.name} ({d.value})
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internship count bar */}
            <Card>
              <CardHeader>
                <CardTitle>Internship Count Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={internshipCountData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Students" radius={[4, 4, 0, 0]}>
                      {internshipCountData.map((_, i) => <Cell key={i} fill={INTERNSHIP_COLORS[i % INTERNSHIP_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Internship fields */}
            <Card>
              <CardHeader>
                <CardTitle>Internship Fields</CardTitle>
                <CardDescription>Fields selected by submitters (multi-select)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={fieldData} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={70} />
                    <Tooltip />
                    <Bar dataKey="value" name="Students" radius={[0, 4, 4, 0]}>
                      {fieldData.map((_, i) => <Cell key={i} fill={FIELD_COLORS[i % FIELD_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary stats */}
            <Card>
              <CardHeader>
                <CardTitle>Summary Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-700">{submissions.length}</div>
                    <div className="text-sm text-blue-600 mt-1">Total Submissions</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-700">
                      {submissions.length > 0 ? (submissions.reduce((a, b) => a + b.internshipCount, 0) / submissions.length).toFixed(1) : '—'}
                    </div>
                    <div className="text-sm text-green-600 mt-1">Avg. Internships</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-700">
                      {submissions.filter(s => s.internshipCount >= 1).length}
                    </div>
                    <div className="text-sm text-purple-600 mt-1">Have Experience</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-700">
                      {facultyData.length > 0
                        ? FACULTY_LABELS[facultyData.reduce((a, b) => a.value > b.value ? a : b).key] || '—'
                        : '—'}
                    </div>
                    <div className="text-sm text-orange-600 mt-1">Top Faculty</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Submissions List ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Submissions</CardTitle>
                  <CardDescription>Download resumes and view profiles</CardDescription>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, faculty…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filtered.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium">{s.name}</span>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {FACULTY_LABELS[s.faculty] || s.faculty}
                          </Badge>
                          {s.subfaculty && (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                              {SUBFACULTY_LABELS[s.subfaculty] || s.subfaculty}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{s.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {s.internshipCount} internship{s.internshipCount !== 1 ? 's' : ''}
                          </span>
                          {s.internshipFields.map(f => (
                            <span key={f} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              {FIELD_LABELS[f] || f}
                            </span>
                          ))}
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={s.resumeFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-blue-600 transition-colors"
                        title="Download resume"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete submission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No results for &ldquo;{search}&rdquo;</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
