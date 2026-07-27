'use client';

import { useEffect, useState } from 'react';
import type { Report } from './types';
import { authFetch } from './api-client';

export interface ReportData {
  report: Report | null;
  saved: boolean;
  loading: boolean;
}

/** Module-level de-dupe so the report layout and page share a single fetch per id. */
const cache = new Map<string, Promise<{ report: Report | null; saved: boolean }>>();

function load(id: string) {
  let pending = cache.get(id);
  if (!pending) {
    pending = authFetch(`/api/reports/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) return { report: null, saved: false };
        const data = (await res.json()) as { report?: Report; saved?: boolean };
        return { report: data.report ?? null, saved: Boolean(data.saved) };
      })
      .catch(() => ({ report: null, saved: false }))
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
export function useReportData(reportId: string): ReportData {
  const [fetched, setFetched] = useState<{ id: string; report: Report | null; saved: boolean } | null>(null);

  useEffect(() => {
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
  };
}
