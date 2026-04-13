'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import { Plus, Pencil, Trash2, ArrowLeft, GraduationCap, Eye, EyeOff, BookOpen } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string;
  published: boolean;
  order: number;
  lessons?: { id: string; published: boolean }[];
}

export default function CoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/learning/courses?lessons=true');
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (course: Course) => {
    await fetch(`/api/learning/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...course, published: !course.published }),
    });
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course and all its lessons?')) return;
    await fetch(`/api/learning/courses/${id}`, { method: 'DELETE' });
    fetchCourses();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/learning')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">SGC Courses</h1>
          <p className="text-sm text-gray-500">Internal lesson-based courses for members</p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push('/dashboard/learning/courses/new')}>
            <Plus className="w-4 h-4 mr-1" /> New Course
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">No courses yet</p>
          {isAdmin && (
            <Button onClick={() => router.push('/dashboard/learning/courses/new')}>
              <Plus className="w-4 h-4 mr-1" /> Create your first course
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const lessonCount = course.lessons?.length ?? 0;
            const publishedCount = course.lessons?.filter((l) => l.published).length ?? 0;
            return (
              <Card key={course.id} className={!course.published ? 'opacity-70' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900">{course.title}</h3>
                        {!course.published && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.summary}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {lessonCount} lesson{lessonCount !== 1 ? 's' : ''} ({publishedCount} published)
                        </span>
                        {course.tags && (
                          <span className="text-primary/70">{course.tags}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/dashboard/learning/courses/${course.id}`}>
                        <Button variant="outline" size="sm">
                          Manage Lessons
                        </Button>
                      </Link>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => togglePublish(course)}
                            className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title={course.published ? 'Unpublish' : 'Publish'}
                          >
                            {course.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/learning/courses/${course.id}?edit=1`)}
                            className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
