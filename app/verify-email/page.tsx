'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';

function VerifyEmailContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setLoading(false);
      setError('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030116] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/5 border-white/10">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#030116] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center">Email Verified!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white/80 mb-6">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <Link href="/login">
              <Button variant="primary">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030116] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-red-400 text-center">Verification Failed</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-white/80 mb-6">
            {error || 'Unable to verify your email. The link may have expired.'}
          </p>
          <Link href="/register">
            <Button variant="primary">Try Again</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030116] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/5 border-white/10">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
