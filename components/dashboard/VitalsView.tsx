import type { DayMetric, HeartRateSample, SeriesSample, TemperatureSample } from '@/lib/api/types';
import { HeartRateChart } from '@/components/charts/HeartRateChart';
import { TemperatureChart } from '@/components/charts/TemperatureChart';
import { VitalsSeriesChart } from '@/components/charts/VitalsSeriesChart';
import { Chip } from '@/components/ui/Chip';
import { formatNumber } from '@/lib/dashboard';
import { formatDayKey } from '@/lib/dates';

function spo2Chip(day: DayMetric): { value: string | null; detail: string } {
  if (day.spo2Avg !== null) {
    const average = formatNumber(day.spo2Avg, 1);
    const minimum = formatNumber(day.spo2Min, 0);
    return {
      value: average === null ? null : `${average}%`,
      detail: `${day.spo2Samples} valid samples${minimum === null ? '' : ` · min ${minimum}%`}`,
    };
  }
  if (day.spo2Samples > 0) {
    return {
      value: 'Insufficient',
      detail: `${day.spo2Samples} valid sample${day.spo2Samples === 1 ? '' : 's'}, 3 needed for a daily average`,
    };
  }
  return { value: null, detail: 'No SpO\u2082 data for this day' };
}

export function VitalsView({
  dayKey,
  day,
  dayHr,
  series,
  temperature,
}: {
  dayKey: string | null;
  day?: DayMetric;
  dayHr: HeartRateSample[];
  series: SeriesSample[];
  temperature: TemperatureSample[];
}) {
  const spo2 = day ? spo2Chip(day) : null;

  return (
    <>
      <div className="mb-5">
        <p className="eyebrow mb-1">Body signals</p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          {dayKey === null ? 'Know what is changing' : formatDayKey(dayKey, 'long')}
        </h2>
        <p className="mt-1 text-sm text-slate-400">All timestamps are IST. Missing values stay missing.</p>
      </div>

      {day && spo2 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 fade-up sm:grid-cols-3 lg:grid-cols-4">
          <Chip label="HRV" value={formatNumber(day.hrvRmssd, 1)} suffix=" ms" detail="Nightly RMSSD mean" />
          <Chip
            label="Resting HR"
            value={formatNumber(day.restingHr, 1)}
            suffix=" bpm"
            detail="Lowest 5-minute sleeping mean, not a device daily RHR"
          />
          <Chip label="SpO₂ (day)" value={spo2.value} detail={spo2.detail} />
          <Chip
            label="SpO₂ (sleep)"
            value={day.spo2SleepAvg === null ? null : `${formatNumber(day.spo2SleepAvg, 1)}%`}
            detail={day.spo2SleepMin === null ? 'Main sleep window' : `min ${formatNumber(day.spo2SleepMin, 0)}%`}
          />
          <Chip label="Stress" value={formatNumber(day.stressAvg, 1)} detail="Daily mean score" />
          <Chip label="Respiration" value={formatNumber(day.respRate, 1)} suffix="/min" detail="Nightly breaths per minute" />
          <Chip
            label="Nightly skin temperature"
            value={formatNumber(day.skinTempNightC, 2)}
            suffix=" °C"
            detail="On-wrist mean in the main sleep window"
          />
          <Chip
            label="Skin temperature deviation"
            value={formatNumber(day.skinTempDeviationC, 2)}
            suffix=" °C"
            detail="Stored deviation from the personal baseline"
          />
        </div>
      ) : (
        <div className="card mb-5 p-6 text-sm text-slate-400">No daily record for the selected day.</div>
      )}

      <div className="mb-4 fade-up">
        <HeartRateChart dayKey={dayKey} samples={dayHr} />
      </div>
      <div className="grid gap-4 fade-up lg:grid-cols-2">
        <VitalsSeriesChart samples={series} />
        <TemperatureChart samples={temperature} />
      </div>
    </>
  );
}
