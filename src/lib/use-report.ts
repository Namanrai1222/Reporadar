'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Report } from './types';
import { authFetch } from './api-client';

/** Why a report could not be shown: signed out, or no report the user can see. */
export type ReportProblem = 'auth' | 'missing' | null;

export interface ReportData {
  report: Report | null;
  saved: boolean;
  loading: boolean;
  problem: ReportProblem;
}

type Loaded = { report: Report | null; saved: boolean; problem: ReportProblem };

/** Module-level de-dupe so the report layout and page share a single fetch per id. */
const cache = new Map<string, Promise<Loaded>>();

function load(id: string) {
  let pending = cache.get(id);
  if (!pending) {
    pending = authFetch(`/api/reports/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (res.status === 401) return { report: null, saved: false, problem: 'auth' as const };
        if (!res.ok) return { report: null, saved: false, problem: 'missing' as const };
        const data = (await res.json()) as { report?: Report; saved?: boolean };
        return { report: data.report ?? null, saved: Boolean(data.saved), problem: data.report ? null : ('missing' as const) };
      })
      .catch(() => ({ report: null, saved: false, problem: 'missing' as const }))
      .finally(() => {
        // De-dupe only concurrent in-flight callers; later mounts must re-fetch
        // so failures can recover and saved-state changes aren't served stale.
        cache.delete(id);
      });
    cache.set(id, pending);
  }
  return pending;
}

/**
 * Resolve a report by id from the server.
 *
 * Reports are always fetched — never read from the URL. An earlier version
 * accepted the entire report as a `?data=` parameter to save a round-trip after a
 * fresh scan, which leaked findings and masked secrets into browser history,
 * access logs and `Referer` headers, and let the contents be rewritten by editing
 * the address bar.
 */
export function useFetchedReport(reportId: string | null): ReportData {
  const [fetched, setFetched] = useState<({ id: string } & Loaded) | null>(null);

  useEffect(() => {
    if (!reportId) return;
    let active = true;
    // setState only in the async callback (never synchronously in the effect body).
    load(reportId).then((result) => {
      if (active) setFetched({ id: reportId, ...result });
    });
    return () => {
      active = false;
    };
  }, [reportId]);

  // Only trust a fetched result that belongs to the current id; otherwise we're loading.
  const current = fetched && fetched.id === reportId ? fetched : null;
  return {
    report: current ? current.report : null,
    saved: current ? current.saved : false,
    loading: current === null,
    problem: current ? current.problem : null,
  };
}

/** Provided by the report layout so every tab reads one fetch instead of its own. */
export const ReportContext = createContext<({ id: string } & ReportData) | null>(null);

export function useReportData(reportId: string): ReportData {
  const shared = useContext(ReportContext);
  const own = useFetchedReport(shared?.id === reportId ? null : reportId);
  return shared?.id === reportId ? shared : own;
}
