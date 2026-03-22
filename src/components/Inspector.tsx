import type { VisibleSegment } from "../types";

type InspectorProps = {
  segment: VisibleSegment | null;
};

export function Inspector({ segment }: InspectorProps) {
  return (
    <section className="panel inspector-panel">
      <div className="panel-header">
        <p className="eyebrow">Inspector</p>
        <h3>Current segment</h3>
      </div>

      {segment ? (
        <>
          <blockquote className="segment-quote">{segment.text}</blockquote>
          <p className="panel-copy">
            Visible band:{" "}
            <strong>{segment.band === null ? "None" : `${segment.band > 0 ? "+" : ""}${segment.band}`}</strong>
          </p>
          <div className="inspector-list">
            {segment.contributors.map((contributor) => (
              <article key={contributor.algorithmId} className="inspector-item">
                <div className="inspector-row">
                  <strong>{contributor.label}</strong>
                  <span className="status-pill status-ready">{contributor.tier}</span>
                </div>
                <p>{contributor.explanation}</p>
                <small>
                  Raw {contributor.rawScore.toFixed(2)} / z{" "}
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
