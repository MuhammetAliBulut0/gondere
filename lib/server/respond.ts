import { AppError } from './logic.ts';
import { ConfigError } from './db.ts';

export function json(data: unknown, init: { status?: number; cache?: string } = {}): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
  // Vercel CDN'i, s-maxage içeren yanıtları kenar sunucularda önbelleğe alır; böylece binlerce ziyaretçi
  // aynı birkaç saniyelik veriyi paylaşır ve Firestore okuma kotası korunur.
  headers['Cache-Control'] = init.cache ?? 'no-store';
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return json({ ok: false, code: err.code, message: err.message, hint: err.hint }, { status: err.status });
  }
  if (err instanceof ConfigError) {
    return json({ ok: false, code: 'NOT_CONFIGURED', message: 'Site şu an bakımda. Lütfen biraz sonra yeniden deneyin.' }, { status: 503 });
  }
  const e = err as { code?: number | string; message?: string };
  // Firestore yoğunluk / çakışma hataları (ABORTED = 10, RESOURCE_EXHAUSTED = 8)
  if (e && (e.code === 10 || e.code === 8 || e.code === 'aborted' || e.code === 'resource-exhausted')) {
    return json({ ok: false, code: 'BUSY', message: 'Şu an çok yoğunuz. Lütfen birkaç saniye sonra yeniden deneyin.' }, { status: 503 });
  }
  console.error('[gondere] beklenmeyen hata', err);
  return json({ ok: false, code: 'SERVER_ERROR', message: 'Bir sorun oluştu. Lütfen yeniden deneyin.' }, { status: 500 });
}
