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
    pending = authFetch(`/api/reports/${id}`)
      .then(async (res) => {
        if (!res.ok) return { report: null, saved: false };
        const data = (await res.json()) as { report?: Report; saved?: boolean };
        return { report: data.report ?? null, saved: Boolean(data.saved) };
      })
      .catch(() => ({ report: null, saved: false }));
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
  const [state, setState] = useState<ReportData>(() => {
    const inline = parseInline(inlineData);
    return inline ? { report: inline, saved: false, loading: false } : { report: null, saved: false, loading: true };
  });

  useEffect(() => {
    const inline = parseInline(inlineData);
    if (inline) {
      setState({ report: inline, saved: false, loading: false });
      return;
    }
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    load(reportId).then((result) => {
      if (active) setState({ ...result, loading: false });
    });
    return () => {
      active = false;
    };
  }, [reportId, inlineData]);

  return state;
}
