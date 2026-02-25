import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';
import { generateId } from '../utils/ids';
import type { SavedReport, ReportCategory } from '../types';

const REPORTS_KEY = 'vf-saved-reports';

export function useSavedReports() {
  const [reports, setReports] = usePersistedState<SavedReport[]>(REPORTS_KEY, []);

  const addReport = useCallback(
    (opts: {
      name: string;
      category: ReportCategory;
      dataUrl: string;
      summary: string;
    }): SavedReport => {
      const report: SavedReport = {
        id: generateId(),
        name: opts.name,
        category: opts.category,
        createdAt: new Date().toISOString(),
        dataUrl: opts.dataUrl,
        summary: opts.summary,
      };
      setReports((prev) => [report, ...prev]);
      return report;
    },
    [setReports],
  );

  const removeReport = useCallback(
    (id: string) => {
      setReports((prev) => prev.filter((r) => r.id !== id));
    },
    [setReports],
  );

  const removeReports = useCallback(
    (ids: Set<string>) => {
      setReports((prev) => prev.filter((r) => !ids.has(r.id)));
    },
    [setReports],
  );

  return { reports, addReport, removeReport, removeReports };
}
