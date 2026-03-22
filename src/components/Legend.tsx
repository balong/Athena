export function Legend() {
  return (
    <section className="panel legend-panel">
      <div className="panel-header">
        <p className="eyebrow">Color key</p>
        <h3>Five-band map</h3>
      </div>
      <div className="legend-scale">
        <div className="legend-band">
          <span className="legend-swatch band--2" />
          <span>-2 sigma</span>
        </div>
        <div className="legend-band">
          <span className="legend-swatch band--1" />
          <span>-1 sigma</span>
        </div>
        <div className="legend-band">
          <span className="legend-swatch band-0" />
          <span>Mean</span>
        </div>
        <div className="legend-band">
          <span className="legend-swatch band-1" />
          <span>+1 sigma</span>
        </div>
        <div className="legend-band">
          <span className="legend-swatch band-2" />
          <span>+2 sigma</span>
        </div>
      </div>
      <div className="legend-overlap-key">
        <div className="legend-band">
          <span className="legend-overlap-sample">Sample</span>
          <span>Fill = strongest signal, rails = extra overlapping signals</span>
        </div>
      </div>
      <p className="panel-copy">
        The background color is the main signal winning that span. The thin
        colored rails at the bottom are additional signals layered underneath.
      </p>
    </section>
  );
}
