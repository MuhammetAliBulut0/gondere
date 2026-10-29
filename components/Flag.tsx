'use client';

const SLICES = 24;

/** Dalgalanan Türk Bayrağı. Bayrak dikey dilimlere bölünür; her dilim gönderden uzaklaştıkça daha çok dalgalanır. */
export function Flag({ width, bottom }: { width: number; bottom: number }) {
  const height = Math.round(width / 1.5);
  const sliceW = width / SLICES;
  return (
    <div className="flag grow" style={{ width, height, bottom }} role="img" aria-label="Türk Bayrağı">
      {Array.from({ length: SLICES }, (_, i) => (
        <div
          key={i}
          className="flag-slice"
          style={
            {
              width: sliceW + 0.6,
              marginRight: -0.6,
              backgroundSize: `${width}px ${height}px`,
              backgroundPosition: `${-i * sliceW}px 0`,
              animationDelay: `${-i * 0.11}s`,
              '--a': `${(i / SLICES) * Math.max(3, width * 0.022)}px`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="flag-shade" />
    </div>
  );
}
