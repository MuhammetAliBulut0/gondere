import { createHash } from 'node:crypto';
import { AppError } from './logic.ts';

/** İstemcinin IP adresini alır (Vercel x-forwarded-for / x-real-ip başlıklarını doldurur). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '0.0.0.0';
}

/**
 * IP adresi açık hâliyle hiçbir yerde saklanmaz; gizli bir tuzla geri döndürülemez bir özete çevrilir.
 * IPv6 adreslerinde, adres değiştirerek sınırı aşmayı zorlaştırmak için ilk 4 blok (/64) kullanılır.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt && process.env.NODE_ENV === 'production') {
    throw new AppError('NOT_CONFIGURED', 'Sunucu yapılandırması eksik.', 503);
  }
  const key = ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
  return createHash('sha256')
    .update(`${salt || 'dev-salt'}|${key}`)
    .digest('hex');
}

/** Cloudflare Turnstile doğrulaması. Yerel geliştirmede gizli anahtar yoksa atlanır. */
export async function verifyTurnstile(token: unknown, ip: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('NOT_CONFIGURED', 'Sunucu yapılandırması eksik.', 503);
    }
    return;
  }
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) {
    throw new AppError('CAPTCHA_FAILED', 'Güvenlik doğrulaması tamamlanmadı. Lütfen yeniden deneyin.', 403);
  }
  let ok = false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    ok = Boolean(data.success);
  } catch {
    throw new AppError('CAPTCHA_FAILED', 'Güvenlik doğrulaması şu an yapılamıyor. Lütfen biraz sonra yeniden deneyin.', 503);
  }
  if (!ok) throw new AppError('CAPTCHA_FAILED', 'Güvenlik doğrulaması tamamlanmadı. Lütfen yeniden deneyin.', 403);
}

/** POST isteklerinin bu siteden geldiğini kontrol eder (tarayıcılar Origin başlığını gönderir). */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    if (new URL(origin).host !== host) throw new Error('mismatch');
  } catch {
    throw new AppError('BAD_REQUEST', 'Geçersiz istek kaynağı.', 403);
  }
}

export async function readJson(req: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new AppError('BAD_REQUEST', 'İstek çok büyük.', 413);
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not object');
    return data as Record<string, unknown>;
  } catch {
    throw new AppError('BAD_REQUEST', 'Geçersiz istek.');
  }
}
