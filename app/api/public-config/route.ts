import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

export function GET() {
  const runtime = env as unknown as { TURNSTILE_SITE_KEY?: string };
  const siteKey = runtime.TURNSTILE_SITE_KEY?.trim() || '';
  return Response.json({ turnstile: siteKey ? { siteKey } : null }, { headers: { 'cache-control': 'public, max-age=300' } });
}
