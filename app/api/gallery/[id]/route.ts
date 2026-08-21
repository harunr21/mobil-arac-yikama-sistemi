import { env } from 'cloudflare:workers';
import { ensureDatabase, getRawD1 } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{20,80}$/.test(id)) return new Response('Not found', { status: 404 });
  await ensureDatabase();
  const image = await getRawD1().prepare(`SELECT i.r2_key FROM gallery_images i
    JOIN gallery_items g ON g.id = i.gallery_item_id WHERE i.id = ? AND g.published = 1`).bind(id).first<{ r2_key: string }>();
  if (!image) return new Response('Not found', { status: 404 });
  const bucket = (env as unknown as { FILES?: R2Bucket }).FILES;
  const object = await bucket?.get(image.r2_key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}
