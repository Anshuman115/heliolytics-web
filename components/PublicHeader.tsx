import Link from 'next/link';
import { BrandMark } from './BrandMark';

export function PublicHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
      <Link href="/about" aria-label="Heliolytics home" className="rounded-lg">
        <BrandMark />
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/about" className="hidden px-3 py-2 text-slate-400 hover:text-white sm:block">
          How it works
        </Link>
        <Link href="/login" className="button-secondary px-3 py-2 text-xs sm:text-sm">
          Sign in
        </Link>
      </nav>
    </header>
  );
}
