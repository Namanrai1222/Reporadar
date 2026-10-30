'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthShell, Field, FormError, SubmitButton } from '@/components/auth/AuthShell';
import { captureOAuthRedirect, fetchSession, setNewPassword } from '@/lib/auth-client';

/**
 * Landing page for the emailed recovery link. SessionBoot exchanges the link's
 * `#access_token` for session cookies; once that session exists, the form can
 * set the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    // Wait for the recovery token to be exchanged before deciding the link is dead.
    captureOAuthRedirect()
      .then(() => fetchSession())
      .then((session) => {
        if (active) setStatus(session.authenticated ? 'ready' : 'expired');
      });
    return () => {
      active = false;
    };
  }, []);

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
      await setNewPassword(password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.');
      setLoading(false);
    }
  }

  const expired = status === 'expired';

  return (
    <AuthShell
      sheet="SHEET 00 — ACCESS"
      title={expired ? 'Link expired.' : 'Set a new password.'}
      subtitle={
        expired
          ? 'This reset link is invalid or has already been used.'
          : 'Choose a new password for your account.'
      }
      footer="Static analysis only · Source code is never stored."
    >
      {expired ? (
        <Link
          href="/forgot-password"
          className="flex w-full items-center justify-center gap-2 border border-[var(--bp-line)] px-6 py-3 bp-mono text-[12.5px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
        >
          REQUEST A NEW LINK
        </Link>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            id="password"
            label="New password"
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
          <SubmitButton loading={loading || status === 'checking'}>
            UPDATE PASSWORD
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
