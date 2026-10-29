import { getDb } from '@/lib/server/db.ts';
import { remember, getRememberCount, AppError } from '@/lib/server/logic.ts';
import { assertSameOrigin, clientIp, hashIp, readJson } from '@/lib/server/guard.ts';
import { json, errorResponse } from '@/lib/server/respond.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

// "Saygıyla an": metre eklemez, yalnızca anma sayacını artırır.
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id') || '';
    if (!/^[ah]:[a-z0-9-]{1,60}$/.test(id)) throw new AppError('BAD_REQUEST', 'Geçersiz istek.');
    const db = await getDb();
    const count = await getRememberCount(db, id);
    return json({ id, count }, { cache: 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = await readJson(req, 512);
    const id = String(body.id ?? '');
    if (!/^[ah]:[a-z0-9-]{1,60}$/.test(id)) throw new AppError('BAD_REQUEST', 'Geçersiz istek.');
    const db = await getDb();
    await remember(db, id, hashIp(clientIp(req)));
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
