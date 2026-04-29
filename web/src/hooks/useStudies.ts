import { useState, useEffect, useCallback } from 'react';
import { fetchStudies, fetchSeriesByStudyId } from '../lib/api';
import type { Study, Series } from '../types';

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudies();
      setStudies(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load studies';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSeries = useCallback(async (studyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSeriesByStudyId(studyId);
      setSeries(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load series';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  return {
    studies,
    series,
    loading,
    error,
    refresh: loadStudies,
    loadSeries,
  };
}
