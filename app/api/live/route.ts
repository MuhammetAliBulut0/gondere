import { getDb } from '@/lib/server/db.ts';
import { getLive } from '@/lib/server/logic.ts';
import { json, errorResponse } from '@/lib/server/respond.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

// Canlı durum: toplam yükseklik + son veri parçası. CDN'de 5 sn önbellekte tutulur.
export async function GET() {
  try {
    const db = await getDb();
    const live = await getLive(db);
    return json(live, { cache: 'public, max-age=0, s-maxage=5, stale-while-revalidate=25' });
  } catch (err) {
    return errorResponse(err);
  }
}
