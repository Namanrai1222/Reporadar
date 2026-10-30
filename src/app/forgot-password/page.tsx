'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, MailCheck } from 'lucide-react';
import { AuthShell, Field, FormError, SubmitButton } from '@/components/auth/AuthShell';
import { requestPasswordReset } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      sheet="SHEET 00 — ACCESS"
      title={sent ? 'Check your inbox.' : 'Reset password.'}
      subtitle={
        sent
          ? `If an account exists for ${email}, a reset link is on its way.`
          : 'Enter your account email and we will send you a link to set a new password.'
      }
      footer="Static analysis only · Source code is never stored."
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 border border-[var(--bp-line-soft)] bg-[color-mix(in_oklab,var(--bp-line)_8%,transparent)] px-4 py-3.5">
            <MailCheck className="mt-px h-4 w-4 shrink-0 text-[var(--bp-line)]" strokeWidth={1.5} />
            <p className="bp-mono text-[11.5px] leading-relaxed text-[var(--bp-ink-dim)]">
              Open the link on this device. It works once and expires after an hour.
            </p>
          </div>
          <Link
            href="/signin"
            className="flex w-full items-center justify-center gap-2 border border-[var(--bp-line)] px-6 py-3 bp-mono text-[12.5px] tracking-wide text-[var(--bp-ink)] transition-colors hover:bg-[var(--bp-line)] hover:text-[var(--bp-ground)]"
          >
            BACK TO SIGN IN
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <FormError message={error} />
          <SubmitButton loading={loading}>
            SEND RESET LINK
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </SubmitButton>
          <p className="mt-2 bp-mono text-[11.5px] text-[var(--bp-ink-dim)]">
            Remembered it?{' '}
            <Link href="/signin" className="text-[var(--bp-line)] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
