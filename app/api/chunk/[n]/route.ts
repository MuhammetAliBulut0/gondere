import { getDb } from '@/lib/server/db.ts';
import { getChunk } from '@/lib/server/logic.ts';
import { json, errorResponse } from '@/lib/server/respond.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

// Dolmuş (mühürlenmiş) parçalar bir daha değişmez; CDN'de süresiz önbellekte kalır.
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  try {
    const { n } = await params;
    const index = Number(n);
    const db = await getDb();
    const chunk = await getChunk(db, index);
    const cache = chunk.sealed
      ? 'public, max-age=31536000, s-maxage=31536000, immutable'
      : 'public, max-age=0, s-maxage=5, stale-while-revalidate=25';
    return json(chunk, { cache });
  } catch (err) {
    return errorResponse(err);
  }
}
