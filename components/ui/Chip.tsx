type ChipProps = {
  label: string;
  value?: number | string | null;
  suffix?: string;
  detail?: string;
};

/** A null value is missing, printed as n/a; a real 0 is shown as 0. */
export function Chip({ label, value, suffix = '', detail }: ChipProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-elevated px-3 py-2">
      <p className="label">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-white">
        {value === null || value === undefined ? 'n/a' : `${value}${suffix}`}
      </p>
      {detail ? <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{detail}</p> : null}
    </div>
  );
}
