import type { SummaryHotspot, SummarySignal } from "../types";

type SummaryPanelProps = {
  signals: SummarySignal[];
  hotspots: SummaryHotspot[];
  onJumpToHotspot: (hotspot: SummaryHotspot) => void;
};

function bandLabel(band: SummarySignal["strongestBand"]): string {
  if (band === null) {
    return "Balanced";
  }

  if (band === -2) {
    return "Strong low";
  }
  if (band === -1) {
    return "Low";
  }
  if (band === 0) {
    return "Mean";
  }
  if (band === 1) {
    return "High";
  }
  return "Strong high";
}

export function SummaryPanel({
  signals,
  hotspots,
  onJumpToHotspot,
}: SummaryPanelProps) {
  const topSignals = signals.slice(0, 3);
  const familyCounts = [...signals].reduce<Record<string, number>>((accumulator, signal) => {
    accumulator[signal.family] = (accumulator[signal.family] ?? 0) + signal.count;
    return accumulator;
  }, {});
  const topFamilies = Object.entries(familyCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const topHotspot = hotspots[0] ?? null;

  return (
    <section className="panel summary-panel">
      <div className="summary-strip">
        <section className="summary-cluster">
          <p className="eyebrow">Top signals</p>
          {topSignals.length > 0 ? (
            <div className="summary-token-list">
              {topSignals.map((signal) => (
                <article key={signal.algorithmId} className="summary-token">
                  <strong>{signal.label}</strong>
                  <span>
                    {signal.count} hits · {bandLabel(signal.strongestBand)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="panel-copy">Turn on more analyses to build a stronger summary layer.</p>
          )}
        </section>

        <section className="summary-cluster">
          <p className="eyebrow">Active families</p>
          {topFamilies.length > 0 ? (
            <div className="family-chip-list">
              {topFamilies.map(([family, count]) => (
                <span key={family} className="family-chip">
                  {family} · {count}
                </span>
              ))}
            </div>
          ) : (
            <p className="panel-copy">No family pressure yet.</p>
          )}
        </section>

        <section className="summary-cluster summary-cluster--hotspot">
          <p className="eyebrow">Top hotspot</p>
          {topHotspot ? (
            <button
              key={`${topHotspot.segmentIndex}-${topHotspot.label}`}
              type="button"
              className="hotspot-button"
              onClick={() => onJumpToHotspot(topHotspot)}
            >
              <div className="summary-item-row">
                <strong>{topHotspot.label}</strong>
                <span className="status-pill status-loading">
                  z {topHotspot.score.toFixed(2)}
                </span>
              </div>
              <p className="summary-snippet">{topHotspot.text}</p>
            </button>
          ) : (
            <p className="panel-copy">No clear hotspot yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
