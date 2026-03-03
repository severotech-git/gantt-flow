'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

// Static imports for images to ensure reliable resolution
import logoIcon from '../../../public/logo.png';
import { PASSWORD_RULES, validatePassword } from '@/lib/passwordPolicy';
import { Check, X } from 'lucide-react';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(formData.password);
    if (pwError) { setError(pwError); return; }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Auto-login: the server has set an httpOnly cookie with the bypass token.
      // We pass a sentinel value so the credentials provider knows to read it
      // from the cookie header rather than from the credentials object.
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        bypassToken: '__use_cookie__',
        redirect: false,
      });

      if (signInResult?.ok) {
        if (inviteToken) {
          router.push(`/invite/${inviteToken}?auto=1`);
        } else {
          // Proxy will send unverified users to /verify-email
          router.push('/projects');
        }
      } else if (signInResult?.code === 'MFARequired') {
        // Unlikely (bypassToken expired in <1s), but handle gracefully
        sessionStorage.setItem('mfa_pending_email', formData.email);
        router.push(`/verify-mfa?email=${encodeURIComponent(formData.email)}`);
      } else {
        setError('Registration succeeded, but auto-login failed. Please log in manually.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-2xl font-bold text-foreground mt-4">Create Account</h2>
          {inviteToken && (
            <p className="text-sm text-muted-foreground mt-1">
              Create your account to accept the team invitation.
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Full Name
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setPasswordFocused(true)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
            {(passwordFocused || formData.password.length > 0) && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(formData.password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passed ? <Check size={11} /> : <X size={11} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            {loading ? 'Creating account...' : inviteToken ? 'Create Account & Accept Invite' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link
            href={inviteToken ? `/login?callbackUrl=${encodeURIComponent(`/invite/${inviteToken}`)}` : '/login'}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
