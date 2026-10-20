import type { Coverage } from '@/lib/api/types';
import { formatIstInstant } from '@/lib/dates';

export function SyncStatusBar({
  coverage,
  error,
}: {
  coverage: Coverage | null;
  error?: string;
}) {
  if (error) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span><strong>Coverage unavailable.</strong> {error}</span>
      </div>
    );
  }
  if (!coverage) return null;

  const typeCount = Object.values(coverage.types).filter((watermark) => watermark !== null).length;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${coverage.hasData ? 'bg-emerald-300 shadow-[0_0_12px_rgba(0,230,163,0.7)]' : 'bg-slate-500'}`} />
        <span className="font-semibold text-white">{coverage.hasData ? 'Data available' : 'Waiting for strap data'}</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        <span>Last ingest <strong className="text-slate-200">{coverage.lastIngestAt === null ? 'never' : formatIstInstant(coverage.lastIngestAt, 'datetime')}</strong></span>
        {coverage.dataThrough === null ? null : (
          <span>Data through <strong className="text-slate-200">{formatIstInstant(coverage.dataThrough, 'datetime')}</strong></span>
        )}
        {typeCount > 0 ? <span>{typeCount} data streams</span> : null}
      </div>
    </div>
  );
}
