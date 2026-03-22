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
      <p className="panel-copy">
        When algorithms overlap, Devious only paints the lowest active band on
        the shared span. Hidden contributors still appear in the inspector.
      </p>
    </section>
  );
}
