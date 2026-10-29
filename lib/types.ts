// Direkteki her kaydın tipi:
// H = kahraman / şehit (listeden seçilir), V = vatandaş (kendi adıyla), A = Ulu Önderimizin adlarından biri
export type EntryKind = 'H' | 'V' | 'A';

/** Direğe eklenen tek bir kayıt. Yükseklik santimetre (cm) olarak tutulur; ondalık hatası olmaz. */
export interface PoleEntry {
  /** Genel sıra numarası (0'dan başlar). Direkteki yeri bu sıraya göre belirlenir. */
  i: number;
  k: EntryKind;
  /** H için kahraman kimliği, A için ünvan formu kimliği */
  r?: string;
  /** Direkte görünen ad. Vatandaş kayıtlarında boştur (isimler 1000. katılımcıda ayrı bölümde açılır). */
  n?: string;
  /** Bu kaydın bayrağa kazandırdığı yükseklik (cm) */
  cm: number;
  /** Oluşturulma zamanı (ms) */
  ts: number;
}

export interface Honor {
  formId: string;
  name: string;
}

export interface MetaState {
  totalCm: number;
  count: number;
  citizenCount: number;
  chunkCount: number;
  honors: Honor[];
  v: number;
  updatedAt: number;
}

export interface LiveResponse {
  state: MetaState;
  lastChunk: { index: number; entries: PoleEntry[] } | null;
  serverTime: number;
}

export interface ChunkResponse {
  index: number;
  sealed: boolean;
  entries: PoleEntry[];
}

export type SubmitInput =
  | { kind: 'hero'; refId: string }
  | { kind: 'text'; text: string; consent?: boolean }
  | { kind: 'honor'; formId: string; honorToken: string; text: string; consent?: boolean };

export type SubmitResult =
  | {
      ok: true;
      result: 'ADDED';
      entry: PoleEntry;
      state: MetaState;
    }
  | {
      ok: true;
      result: 'ATATURK_FIRST';
      entry: PoleEntry;
      state: MetaState;
      formId: string;
      honorToken: string;
    }
  | {
      ok: true;
      result: 'ALREADY';
      refKind: 'H' | 'A';
      refId: string;
      entryIndex: number;
    }
  | {
      ok: false;
      code: ErrorCode;
      message: string;
      hint?: string;
    };

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'INVALID_NAME'
  | 'CONSENT_REQUIRED'
  | 'ATATURK_HINT'
  | 'DUPLICATE'
  | 'RATE_LIMITED'
  | 'CAPTCHA_FAILED'
  | 'HONOR_INVALID'
  | 'BUSY'
  | 'NOT_CONFIGURED'
  | 'SERVER_ERROR';

export interface CitizenListResponse {
  locked: boolean;
  citizenCount: number;
  revealAt: number;
  honors: Honor[];
  names: { i: number; name: string }[];
  nextCursor: number | null;
}
