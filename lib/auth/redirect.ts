/** Browser and Edge safe: no Node imports, no configuration access. */
export function safeRedirectPath(from: string | null): string {
  if (!from || !from.startsWith('/')) return '/';
  try {
    const parsed = new URL(from, 'http://localhost');
    if (parsed.origin !== 'http://localhost') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}
