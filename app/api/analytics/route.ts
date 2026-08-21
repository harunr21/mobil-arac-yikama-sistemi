import { NextResponse } from 'next/server';
import { ensureDatabase, getRawD1 } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const allowedEvents = new Set([
  'page_view',
  'booking_start',
  'booking_submit',
  'booking_confirmed',
  'whatsapp_click',
]);

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 2_048) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response(null, { status: 400 });
  const payload = body as Record<string, unknown>;
  if (typeof payload.event !== 'string' || !allowedEvents.has(payload.event)) {
    return new Response(null, { status: 400 });
  }
  const route = normalizeRoute(payload.route);
  if (!route) return new Response(null, { status: 400 });

  try {
    await ensureDatabase();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
    await getRawD1().prepare(`INSERT INTO analytics_daily (date, event, route, count) VALUES (?, ?, ?, 1)
      ON CONFLICT(date, event, route) DO UPDATE SET count = count + 1`)
      .bind(date, payload.event, route).run();
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('analytics_increment_failed', error);
    return new Response(null, { status: 202 });
  }
}

function normalizeRoute(value: unknown) {
  if (typeof value !== 'string' || value.length > 120 || !value.startsWith('/')) return null;
  try {
    const parsed = new URL(value, 'https://site.local');
    if (parsed.origin !== 'https://site.local') return null;
    return parsed.pathname.replace(/\/+/g, '/');
  } catch {
    return null;
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
}
