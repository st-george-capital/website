'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  X,
  Save,
  FileText,
  EyeIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  content: string;
  order: number;
  published: boolean;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string;
  published: boolean;
  order: number;
  lessons: Lesson[];
}

const EMPTY_LESSON = {
  title: '',
  content: '',
  order: 0,
  published: false,
};

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Course edit state
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '',
    summary: '',
    tags: '',
    published: false,
    order: 0,
  });
  const [savingCourse, setSavingCourse] = useState(false);

  // Lesson form state
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonTab, setLessonTab] = useState<'write' | 'preview'>('write');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetchCourse();
  }, [params.id]);

  useEffect(() => {
    if (searchParams.get('edit') === '1' && course) {
      openEditCourse();
    }
  }, [course, searchParams]);

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/learning/courses/${params.id}`);
      if (!res.ok) { router.push('/dashboard/learning/courses'); return; }
      const data = await res.json();
      setCourse(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openEditCourse = () => {
    if (!course) return;
    setCourseForm({
      title: course.title,
      summary: course.summary,
      tags: course.tags,
      published: course.published,
      order: course.order,
    });
    setEditingCourse(true);
  };

  const saveCourse = async () => {
    if (!course) return;
    setSavingCourse(true);
    try {
      const res = await fetch(`/api/learning/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...courseForm, slug: course.slug }),
      });
      if (res.ok) {
        setEditingCourse(false);
        fetchCourse();
      }
    } finally {
      setSavingCourse(false);
    }
  };

  const openAddLesson = () => {
    setEditingLessonId(null);
    setLessonForm({ ...EMPTY_LESSON, order: (course?.lessons.length ?? 0) });
    setLessonTab('write');
    setShowLessonForm(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      order: lesson.order,
      published: lesson.published,
    });
    setLessonTab('write');
    setShowLessonForm(true);
  };

  const saveLesson = async () => {
    if (!course) return;
    setSavingLesson(true);
    try {
      let res: Response;
      if (editingLessonId) {
        res = await fetch(`/api/learning/lessons/${editingLessonId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonForm),
        });
      } else {
        res = await fetch(`/api/learning/courses/${course.id}/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonForm),
        });
      }
      if (res.ok) {
        setShowLessonForm(false);
        fetchCourse();
      }
    } finally {
      setSavingLesson(false);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    await fetch(`/api/learning/lessons/${id}`, { method: 'DELETE' });
    fetchCourse();
  };

  const toggleLesson = async (lesson: Lesson) => {
    await fetch(`/api/learning/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lesson, published: !lesson.published }),
    });
    fetchCourse();
  };

  if (loading) {
    return <div className="p-6 text-gray-500 text-center">Loading...</div>;
  }

  if (!course) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/learning/courses')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {!course.published && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Draft</span>
            )}
          </div>
          <p className="text-sm text-gray-500">{course.summary}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditCourse}>
              <Pencil className="w-4 h-4 mr-1" /> Edit Course
            </Button>
            <Button onClick={openAddLesson}>
              <Plus className="w-4 h-4 mr-1" /> Add Lesson
            </Button>
          </div>
        )}
      </div>

      {/* Course edit panel */}
      {editingCourse && (
        <Card className="mb-6 border-2 border-primary/30">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Edit Course Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea
                value={courseForm.summary}
                onChange={(e) => setCourseForm({ ...courseForm, summary: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={courseForm.tags}
                  onChange={(e) => setCourseForm({ ...courseForm, tags: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courseForm.published}
                    onChange={(e) => setCourseForm({ ...courseForm, published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Published</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingCourse(false)}>Cancel</Button>
              <Button onClick={saveCourse} disabled={savingCourse}>
                <Save className="w-4 h-4 mr-1" />{savingCourse ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson editor — full screen */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Editor top bar */}
          <div className="flex items-center gap-3 border-b px-6 py-3 bg-white shrink-0">
            <button
              onClick={() => setShowLessonForm(false)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {editingLessonId ? 'Edit Lesson' : 'New Lesson'}
            </span>
            <div className="flex-1" />
            {/* Write / Preview tabs */}
            <div className="flex border rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => setLessonTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  lessonTab === 'write'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Write
              </button>
              <button
                onClick={() => setLessonTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  lessonTab === 'preview'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <EyeIcon className="w-3.5 h-3.5" /> Preview
              </button>
            </div>
            <Button
              onClick={saveLesson}
              disabled={savingLesson || !lessonForm.title.trim()}
              size="sm"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {savingLesson ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 px-6 py-3 border-b bg-gray-50 shrink-0 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
                placeholder="Lesson title…"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-gray-500">Order</label>
              <input
                type="number"
                value={lessonForm.order}
                onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 0 })}
                className="w-16 border rounded-lg px-2 py-2 text-sm text-center"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={lessonForm.published}
                onChange={(e) => setLessonForm({ ...lessonForm, published: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-gray-700">Published</span>
            </label>
          </div>

          {/* Editor / Preview area */}
          <div className="flex-1 overflow-hidden">
            {lessonTab === 'write' ? (
              <textarea
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                className="w-full h-full px-8 py-6 text-sm font-mono resize-none focus:outline-none leading-relaxed"
                placeholder="Write lesson content in Markdown…&#10;&#10;## Heading&#10;**Bold**, *italic*, `code`, - lists, [links](url)"
              />
            ) : (
              <div className="h-full overflow-y-auto px-8 py-6 max-w-3xl mx-auto">
                {lessonForm.content ? (
                  <div className="prose prose-gray prose-lg max-w-none
                    prose-headings:font-semibold
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                    prose-p:leading-relaxed prose-p:text-gray-700
                    prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                    prose-pre:bg-gray-100 prose-pre:border
                    prose-blockquote:border-l-4 prose-blockquote:border-gray-300
                    prose-li:text-gray-700
                    prose-table:text-sm
                    prose-th:bg-gray-50 prose-th:font-semibold
                    prose-hr:border-gray-200
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {lessonForm.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Nothing to preview yet — write some content first.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lessons list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Lessons ({course.lessons.length})
        </h2>

        {course.lessons.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No lessons yet. Add your first lesson above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...course.lessons].sort((a, b) => a.order - b.order).map((lesson, idx) => (
              <Card key={lesson.id} className={!lesson.published ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{lesson.title}</span>
                        {!lesson.published && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {lesson.content.slice(0, 80)}
                        {lesson.content.length > 80 ? '...' : ''}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleLesson(lesson)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          title={lesson.published ? 'Unpublish' : 'Publish'}
                        >
                          {lesson.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => openEditLesson(lesson)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteLesson(lesson.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
