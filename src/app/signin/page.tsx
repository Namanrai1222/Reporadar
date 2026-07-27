'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthShell, Field, FormError, SubmitButton, OAuthButtons } from '@/components/auth/AuthShell';
import { signIn } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setLoading(false);
    }
  }

  return (
    <AuthShell
      sheet="SHEET 00 — ACCESS"
      title="Sign in."
      subtitle="Pick up your saved reports and scan history."
      footer="Static analysis only · Source code is never stored."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <OAuthButtons onError={setError} />

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-[var(--bp-line-faint)]" />
          <span className="bp-mono text-[10px] text-[var(--bp-ink-dim)]">OR</span>
          <span className="h-px flex-1 bg-[var(--bp-line-faint)]" />
        </div>

        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />

        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <FormError message={error} />

        <SubmitButton loading={loading}>
          SIGN IN
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </SubmitButton>

        <p className="mt-2 bp-mono text-[11.5px] text-[var(--bp-ink-dim)]">
          No account?{' '}
          <Link href="/signup" className="text-[var(--bp-line)] underline-offset-4 hover:underline">
            Create one
          </Link>
          {' · '}
          {/* Scanning a real repository requires an account (the server rejects
              anonymous scans), so this offers the seeded demo instead of a
              dashboard that would only produce a 401. */}
          <Link href="/report/demo" className="text-[var(--bp-ink-dim)] underline-offset-4 hover:text-[var(--bp-ink)] hover:underline">
            View a sample report
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
