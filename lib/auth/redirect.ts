/** Browser and Edge safe: no Node imports, no configuration access. */
export function safeRedirectPath(from: string | null): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return '/';
  return from;
}
