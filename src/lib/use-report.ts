'use client';

import { useEffect, useMemo, useState } from 'react';
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
    pending = authFetch(`/api/reports/${id}`)
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

function parseInline(inlineData: string | null): Report | null {
  if (!inlineData) return null;
  try {
    return JSON.parse(decodeURIComponent(inlineData)) as Report;
  } catch {
    return null;
  }
}

/**
 * Resolve a report either from an inline `?data=` param (fresh scan) or by fetching
 * the persisted report by id (History / Saved Reports navigation).
 */
export function useReportData(reportId: string, inlineData: string | null): ReportData {
  // Inline data (fresh scan) resolves synchronously — derived, not stored in state.
  const inline = useMemo(() => parseInline(inlineData), [inlineData]);
  const [fetched, setFetched] = useState<{ id: string; report: Report | null; saved: boolean } | null>(null);

  useEffect(() => {
    if (inline) return; // no fetch needed for inline reports
    let active = true;
    // setState only in the async callback (never synchronously in the effect body).
    load(reportId).then((result) => {
      if (active) setFetched({ id: reportId, ...result });
    });
    return () => {
      active = false;
    };
  }, [reportId, inline]);

  if (inline) return { report: inline, saved: false, loading: false };

  // Only trust a fetched result that belongs to the current id; otherwise we're loading.
  const current = fetched && fetched.id === reportId ? fetched : null;
  return {
    report: current ? current.report : null,
    saved: current ? current.saved : false,
    loading: current === null,
  };
}
