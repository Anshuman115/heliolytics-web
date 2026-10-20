import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';

export const metadata = { title: 'Your health, clearly' };

const METRICS: [string, string][] = [
  ['Readiness', 'A stored score built from nightly HRV, sleeping heart rate, sleep, skin temperature, respiration and load against your own baseline.'],
  ['Sleep', 'The main session and any naps, with stored stages, wake minutes and a truncation warning when the stage timeline is incomplete.'],
  ['Activity', 'Recorded workouts and automatic movement detected from sustained step and heart-rate minutes.'],
  ['Vitals', 'HRV, resting heart rate, SpO₂ with its sample count, stress, respiration and on-wrist skin temperature.'],
];

const LIMITS: [string, string][] = [
  ['No invented values', 'A missing measurement stays missing. The dashboard shows n/a or an explicit insufficient-data note; it never fills a gap with zero or a stale day.'],
  ['No medical claim', 'Readiness v1 is a research-informed product score. It is not a diagnosis, not medical advice and not a validated industry standard.'],
  ['No vendor cloning', 'Automatic movement is a heuristic, not a decoded vendor sport. Values are not claimed to match any other platform.'],
];

export default function AboutPage() {
  return (
    <main className="public-shell">
      <PublicHeader />
      <section className="py-14 lg:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow mb-4 text-emerald-200">A private health console</p>
          <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl">
            Understand your day before it runs away.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            Heliolytics turns raw band data into a quiet, useful picture of your recovery, sleep, movement, and body signals.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="button-primary">Open my console <span className="ml-2">→</span></Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">Your private console stays behind your password.</p>
        </div>
      </section>

      <section className="border-t border-white/10 py-12 sm:py-16">
        <div className="mb-7 max-w-xl">
          <p className="eyebrow mb-2">The flow</p>
          <h2 className="text-3xl font-black tracking-tight text-white">From strap to signal.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">The phone moves the data. Your server does the thinking.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <FlowStep n="01" title="Sync" copy="The phone reads band data over Bluetooth." />
          <FlowStep n="02" title="Upload" copy="A signed session and its raw type files reach your API." />
          <FlowStep n="03" title="Parse" copy="The server decodes each type into samples, sleep sessions and activities." />
          <FlowStep n="04" title="See" copy="The dashboard renders the stored daily values." />
        </div>
      </section>

      <section className="grid gap-8 border-t border-white/10 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow mb-2">What you get</p>
          <h2 className="text-3xl font-black tracking-tight text-white">Less dashboard. More direction.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {METRICS.map(([title, copy]) => <Metric key={title} title={title} copy={copy} />)}
        </div>
      </section>

      <section className="grid gap-8 border-t border-white/10 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow mb-2">What it will not do</p>
          <h2 className="text-3xl font-black tracking-tight text-white">Honest about the gaps.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {LIMITS.map(([title, copy]) => <Metric key={title} title={title} copy={copy} />)}
        </div>
      </section>

      <footer className="flex flex-col gap-4 border-t border-white/10 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Built for people who want their own health data.</p>
        <div className="flex gap-4 text-sm"><Link href="/login" className="font-semibold text-slate-300 hover:text-white">Sign in</Link></div>
      </footer>
    </main>
  );
}

function FlowStep({ n, title, copy }: { n: string; title: string; copy: string }) {
  return <div className="card p-5"><span className="text-xs font-black text-emerald-200">{n}</span><h3 className="mt-8 text-lg font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p></div>;
}

function Metric({ title, copy }: { title: string; copy: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><h3 className="font-bold text-white">{title}</h3><p className="mt-1 text-sm text-slate-400">{copy}</p></div>;
}
