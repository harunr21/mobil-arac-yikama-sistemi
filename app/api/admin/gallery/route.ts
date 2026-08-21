import { env } from 'cloudflare:workers';
import { AdminAccessError, requireAdmin } from '@/app/admin/auth';
import { ensureDatabase, getRawD1 } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const acceptedTypes = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
]);
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    await requireAdmin('/admin');
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'İstek kaynağı doğrulanamadı.' }, { status: 400 });
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > maxBytes + 1024 * 1024) return Response.json({ error: 'Yükleme boyutu sınırı aşıldı.' }, { status: 413 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Bir fotoğraf seçin.' }, { status: 400 });
    const extension = acceptedTypes.get(file.type);
    if (!extension) return Response.json({ error: 'Yalnızca JPG, PNG veya WebP yüklenebilir.' }, { status: 400 });
    if (file.size <= 0 || file.size > maxBytes) return Response.json({ error: 'Fotoğraf en fazla 8 MB olabilir.' }, { status: 400 });
    if (!(await hasValidSignature(file, file.type))) return Response.json({ error: 'Dosya içeriği geçerli bir görsel değil.' }, { status: 400 });

    const title = clean(form.get('title'), 100);
    const district = clean(form.get('district'), 60);
    const completedAt = clean(form.get('completedAt'), 10);
    const altText = clean(form.get('altText'), 180);
    const serviceId = clean(form.get('serviceId'), 100, true) || null;
    if (!title || !district || !altText || !/^\d{4}-\d{2}-\d{2}$/.test(completedAt)) return Response.json({ error: 'Galeri bilgilerini eksiksiz girin.' }, { status: 400 });

    await ensureDatabase();
    if (serviceId) {
      const service = await getRawD1().prepare('SELECT 1 AS ok FROM services WHERE id = ?').bind(serviceId).first<{ ok: number }>();
      if (!service) return Response.json({ error: 'Seçilen hizmet bulunamadı.' }, { status: 400 });
    }
    const runtime = env as unknown as { FILES?: R2Bucket };
    if (!runtime.FILES) throw new Error('R2 FILES binding is not available.');
    const itemId = crypto.randomUUID();
    const imageId = crypto.randomUUID();
    uploadedKey = `gallery/${itemId}/${imageId}.${extension}`;
    await runtime.FILES.put(uploadedKey, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { uploadedBy: 'admin', originalSize: String(file.size) },
    });
    const db = getRawD1();
    await db.batch([
      db.prepare(`INSERT INTO gallery_items (id, title, service_id, district, completed_at, published, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)`).bind(itemId, title, serviceId, district, completedAt, new Date().toISOString()),
      db.prepare(`INSERT INTO gallery_images (id, gallery_item_id, r2_key, alt_text, sort_order)
        VALUES (?, ?, ?, ?, 0)`).bind(imageId, itemId, uploadedKey, altText),
    ]);
    return Response.json({ ok: true, id: itemId });
  } catch (error) {
    if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 403 });
    if (uploadedKey) {
      const runtime = env as unknown as { FILES?: R2Bucket };
      await runtime.FILES?.delete(uploadedKey).catch(() => undefined);
    }
    console.error('Gallery upload failed', error);
    return Response.json({ error: 'Fotoğraf kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}

function clean(value: FormDataEntryValue | null, max: number, optional = false) {
  if (typeof value !== 'string') return '';
  const result = value.trim();
  if ((!optional && !result) || result.length > max) return '';
  return result;
}

async function hasValidSignature(file: File, mime: string) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mime === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}
