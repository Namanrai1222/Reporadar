'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, MailCheck } from 'lucide-react';
import { AuthShell, Field, FormError, SubmitButton, OAuthButtons } from '@/components/auth/AuthShell';
import { signUp } from '@/lib/auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const active = await signUp(email, password);
      if (active) {
        router.push('/dashboard');
      } else {
        setConfirmSent(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
      setLoading(false);
    }
  }

  if (confirmSent) {
    return (
      <AuthShell
        sheet="SHEET 00 — ACCESS"
        title="Check your inbox."
        subtitle={`We sent a confirmation link to ${email}. Open it to activate your account.`}
        footer="Static analysis only · Source code is never stored."
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 border border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-line)_8%,transparent)] px-4 py-3.5">
            <MailCheck className="mt-px h-4 w-4 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
            <p className="bp-mono text-[11.5px] leading-relaxed text-[var(--bp-ink-dim)]">
              Confirmation pending. The link expires in 24 hours.
            </p>
          </div>
          <Link
            href="/signin"
            className="flex w-full items-center justify-center gap-2 border border-[var(--bp-line)] px-6 py-3 bp-mono text-[12.5px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
          >
            BACK TO SIGN IN
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sheet="SHEET 00 — ACCESS"
      title="Create an account."
      subtitle="Save reports, keep scan history, and revisit any repository."
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
          hint="min 8 characters"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        <FormError message={error} />

        <SubmitButton loading={loading}>
          CREATE ACCOUNT
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </SubmitButton>

        <p className="mt-2 bp-mono text-[11.5px] text-[var(--bp-ink-dim)]">
          Already registered?{' '}
          <Link href="/signin" className="text-[var(--bp-line)] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
