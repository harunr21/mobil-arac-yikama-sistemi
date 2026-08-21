import {
  AdminAccessError,
  authenticateAdmin,
  LoginRateLimitError,
  logoutAdmin,
} from '@/app/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    const username = clean(body.username, 40);
    const password = clean(body.password, 128, false);
    if (!username || !password) return Response.json({ error: 'Kullanıcı adı ve şifre gerekli.' }, { status: 400 });

    const clientKey = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'local';
    await authenticateAdmin(username, password, clientKey);
    return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof LoginRateLimitError) {
      return Response.json({ error: error.message }, {
        status: 429,
        headers: { 'retry-after': String(error.retryAfterSeconds), 'cache-control': 'no-store' },
      });
    }
    if (error instanceof AdminAccessError) {
      return Response.json({ error: error.message }, { status: 401, headers: { 'cache-control': 'no-store' } });
    }
    if (error instanceof SyntaxError) return Response.json({ error: 'Geçersiz istek.' }, { status: 400 });
    console.error('Admin login failed', error);
    return Response.json({ error: 'Giriş yapılamadı. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await logoutAdmin();
    return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Çıkış yapılamadı.' }, { status: 400 });
  }
}

function clean(value: unknown, max: number, trim = true): string {
  if (typeof value !== 'string' || value.length > max) return '';
  return trim ? value.trim() : value;
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new Error('İstek kaynağı doğrulanamadı.');
}
