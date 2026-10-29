import { getDb } from '@/lib/server/db.ts';
import { listCitizens } from '@/lib/server/logic.ts';
import { json, errorResponse } from '@/lib/server/respond.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

// "Cumhuriyetin Evlatları" listesi. 1000. katılımcıya kadar kilitlidir.
export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get('cursor');
    const cursor = raw !== null && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
    const db = await getDb();
    const data = await listCitizens(db, cursor);
    return json(data, { cache: 'public, max-age=0, s-maxage=60, stale-while-revalidate=120' });
  } catch (err) {
    return errorResponse(err);
  }
}
