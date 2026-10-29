const FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/**
 * Karşılaştırma için metni sadeleştirir:
 * Türkçe küçük harfe çevirir, Türkçe karakterleri ASCII'ye katlar,
 * harf ve boşluk dışındaki her şeyi atar, fazla boşlukları teke indirir.
 * "  Gazi Mustafa KEMAL Atatürk " -> "gazi mustafa kemal ataturk"
 */
export function fold(input: string): string {
  return input
    .normalize('NFC')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (c) => FOLD[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Boşluksuz sade hâl: "o r o s p u" gibi aralıklı yazımları da yakalamak için */
export function foldCompact(input: string): string {
  return fold(input).replace(/\s+/g, '');
}

/** Fazla boşlukları temizler (görünen metin için) */
export function cleanSpaces(input: string): string {
  return input.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** "ahmet YILMAZ" -> "Ahmet Yılmaz" (Türkçe büyük/küçük harf kurallarıyla) */
export function toTitleCaseTr(input: string): string {
  return cleanSpaces(input)
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => {
          if (!part) return part;
          const lower = part.toLocaleLowerCase('tr-TR');
          return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
        })
        .join('-'),
    )
    .join(' ');
}

const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** 12350 cm -> "123,5" */
export function cmToMetersText(cm: number): string {
  return nf1.format(cm / 100);
}

export function formatInt(n: number): string {
  return nf0.format(n);
}
