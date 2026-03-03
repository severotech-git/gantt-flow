'use client';

import { useState, Suspense, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

// Static imports for images to ensure reliable resolution
import logoIcon from '../../../public/icon.png';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  MFARequired: 'Verification code required.',
  OAuthSignin: 'Could not sign in with that provider. Please try again.',
  OAuthCallback: 'Could not sign in with that provider. Please try again.',
  OAuthCreateAccount: 'Could not create account with that provider.',
  EmailCreateAccount: 'Could not create account. Please try again.',
  Callback: 'Sign-in callback failed. Please try again.',
  OAuthAccountNotLinked: 'This email is already registered with a different sign-in method.',
  SessionRequired: 'Please sign in to continue.',
  Default: 'An error occurred. Please try again.',
};

function friendlyAuthError(code: string | null | undefined): string {
  if (!code) return '';
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('callbackUrl') || '/projects';
  const callbackUrl = raw.startsWith('/') ? raw : '/projects';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(friendlyAuthError(errorParam));
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/projects');
    }
  }, [status, session, router]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.code === 'MFARequired') {
        sessionStorage.setItem('mfa_pending_email', email);
        router.push(`/verify-mfa?email=${encodeURIComponent(email)}`);
      } else if (result?.error) {
        setError(friendlyAuthError(result.error));
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Image
              src={logoIcon}
              alt="GanttFlow Logo"
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            GanttFlow
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
          >
            GitHub
          </Button>
        </div>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don&apos;t have an account? </span>
          <Link href="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
