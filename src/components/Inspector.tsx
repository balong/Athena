import type { VisibleSegment } from "../types";

type InspectorProps = {
  segment: VisibleSegment | null;
};

export function Inspector({ segment }: InspectorProps) {
  function bandDescription(value: VisibleSegment["band"]): string {
    if (value === null) {
      return "No visible highlight";
    }

    if (value === -2) {
      return "Much lower than this algorithm usually sees in the document";
    }
    if (value === -1) {
      return "Somewhat lower than usual";
    }
    if (value === 0) {
      return "Near this document's average";
    }
    if (value === 1) {
      return "Somewhat higher than usual";
    }
    return "Much higher than usual";
  }

  return (
    <section className="panel inspector-panel">
      <div className="panel-header">
        <p className="eyebrow">Inspector</p>
        <h3>Current segment</h3>
      </div>

      {segment ? (
        <>
          <blockquote className="segment-quote">{segment.text}</blockquote>
          <div className="inspector-overview">
            <p className="panel-copy">
              Visible band:{" "}
              <strong>
                {segment.band === null ? "None" : `${segment.band > 0 ? "+" : ""}${segment.band}`}
              </strong>
            </p>
            <p className="panel-copy">
              Overlap:{" "}
              <strong>
                {segment.overlapCount} signal{segment.overlapCount === 1 ? "" : "s"}
              </strong>
              {segment.overlapCount > 1
                ? ` with ${segment.secondaryCount} secondary rail${
                    segment.secondaryCount === 1 ? "" : "s"
                  } beneath the main fill.`
                : ""}
            </p>
            <p className="panel-copy">{bandDescription(segment.band)}</p>
          </div>
          <div className="inspector-list">
            {segment.contributors.map((contributor) => (
              <article key={contributor.algorithmId} className="inspector-item">
                <div className="inspector-row">
                  <strong>{contributor.label}</strong>
                  <span className="status-pill status-ready">{contributor.tier}</span>
                </div>
                <p className="inspector-lead">{contributor.helpText}</p>
                <div className="inspector-guidance">
                  <p>
                    <strong>What this shows:</strong> {contributor.explanation}
                  </p>
                  <p>
                    <strong>Why it matters:</strong>{" "}
                    {contributor.whyItMatters ?? contributor.helpText}
                  </p>
                  <p>
                    <strong>Useful when:</strong>{" "}
                    {contributor.goodWhen ??
                      "this pattern supports the tone, pace, or level of precision you want."}
                  </p>
                  <p>
                    <strong>Risky when:</strong>{" "}
                    {contributor.riskyWhen ??
                      "the pattern becomes noticeable enough that readers focus on it instead of the meaning."}
                  </p>
                </div>
                <small>
                  Numeric detail: raw {contributor.rawScore.toFixed(2)} / z{" "}
                  {contributor.normalizedScore.toFixed(2)}
                </small>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="panel-copy">
          Move through the editor or place the caret inside a highlighted range
          to inspect every algorithm affecting that span.
        </p>
      )}
    </section>
  );
}
