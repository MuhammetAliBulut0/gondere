import { getDb } from '@/lib/server/db.ts';
import { submit, AppError } from '@/lib/server/logic.ts';
import { assertSameOrigin, clientIp, hashIp, readJson, verifyTurnstile } from '@/lib/server/guard.ts';
import { json, errorResponse } from '@/lib/server/respond.ts';
import type { SubmitInput } from '@/lib/types.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = await readJson(req);
    const ip = clientIp(req);
    const ipHash = hashIp(ip);
    await verifyTurnstile(body.turnstile, ip);

    let input: SubmitInput;
    if (body.kind === 'hero') input = { kind: 'hero', refId: String(body.refId ?? '') };
    else if (body.kind === 'text') input = { kind: 'text', text: String(body.text ?? ''), consent: body.consent === true };
    else if (body.kind === 'honor')
      input = {
        kind: 'honor',
        formId: String(body.formId ?? ''),
        honorToken: String(body.honorToken ?? ''),
        text: String(body.text ?? ''),
        consent: body.consent === true,
      };
    else throw new AppError('BAD_REQUEST', 'Geçersiz istek.');

    const db = await getDb();
    const result = await submit(db, input, { ipHash });
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
