'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  division: string;
  published: boolean;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function ArticlesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setArticles(articles.filter((a) => a.id !== id));
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
    } finally {
      setDeleting(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Research Articles</h1>
          <p className="text-gray-600">
            {isAdmin ? 'Manage research publications and articles' : 'View research publications'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/articles/new">
            <Button className="inline-flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </Link>
        )}
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <CardTitle>No Articles Yet</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Create your first research article to get started.'
                : 'No research articles have been published yet.'}
            </CardDescription>
            {isAdmin && (
              <Link href="/dashboard/articles/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Article
                </Button>
              </Link>
            )}
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <CardTitle className="text-xl">{article.title}</CardTitle>
                      {article.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Featured
                        </span>
                      )}
                      {article.published ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded inline-flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded inline-flex items-center">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Draft
                        </span>
                      )}
                    </div>
                    <CardDescription className="mb-4 line-clamp-2">{article.excerpt}</CardDescription>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>By {article.author}</span>
                      <span>•</span>
                      <span>{article.division}</span>
                      {article.publishedAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {article.published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/research/${article.slug}`, '_blank')}
                        title="View on website"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/articles/${article.id}/edit`)}
                          title="Edit article"
                          className="hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(article.id)}
                          disabled={deleting === article.id}
                          title="Delete article"
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

