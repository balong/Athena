import type {
  AnalysisDefinition,
  AnalysisFamily,
  AnalysisStatus,
  AnalysisTier,
} from "../types";

type Group = {
  family: AnalysisFamily;
  definitions: AnalysisDefinition[];
};

type ControlRailProps = {
  groups: Group[];
  enabledIds: Set<string>;
  statuses: Record<string, AnalysisStatus>;
  onToggleAlgorithm: (id: string) => void;
  onToggleFamily: (family: AnalysisFamily) => void;
  onQuickFilter: (filter: AnalysisTier | "essential" | "clear") => void;
};

const TIER_LABELS: Record<AnalysisTier, string> = {
  live: "Live",
  short: "Short",
  deep: "Deep",
};

export function ControlRail({
  groups,
  enabledIds,
  statuses,
  onToggleAlgorithm,
  onToggleFamily,
  onQuickFilter,
}: ControlRailProps) {
  return (
    <aside className="control-rail">
      <div className="rail-section">
        <p className="eyebrow">Switchboard</p>
        <h2>Algorithm families</h2>
        <p className="rail-copy">
          Toggle layers by family or one by one. Overlaps collapse to the lowest
          visible band.
        </p>
      </div>

      <div className="quick-filters rail-section">
        <button type="button" onClick={() => onQuickFilter("essential")}>
          Essential
        </button>
        <button type="button" onClick={() => onQuickFilter("live")}>
          Live only
        </button>
        <button type="button" onClick={() => onQuickFilter("short")}>
          Short only
        </button>
        <button type="button" onClick={() => onQuickFilter("deep")}>
          Deep only
        </button>
        <button type="button" onClick={() => onQuickFilter("clear")}>
          Hide all
        </button>
      </div>

      {groups.map((group) => {
        const enabledCount = group.definitions.filter((definition) =>
          enabledIds.has(definition.id),
        ).length;

        return (
          <section key={group.family} className="rail-section family-group">
            <div className="family-header">
              <div>
                <p className="family-name">{group.family}</p>
                <span className="family-meta">
                  {enabledCount}/{group.definitions.length} active
                </span>
              </div>
              <button type="button" onClick={() => onToggleFamily(group.family)}>
                {enabledCount === group.definitions.length ? "Mute" : "Arm"}
              </button>
            </div>

            <div className="algorithm-list">
              {group.definitions.map((definition) => {
                const enabled = enabledIds.has(definition.id);
                const status = statuses[definition.id] ?? "idle";

                return (
                  <div
                    key={definition.id}
                    className={`algorithm-row ${enabled ? "enabled" : ""}`}
                  >
                    <button
                      type="button"
                      className={`algorithm-toggle ${enabled ? "enabled" : ""}`}
                      onClick={() => onToggleAlgorithm(definition.id)}
                    >
                      <span className="toggle-dot" aria-hidden="true" />
                      <span className="algorithm-copy">
                        <span className="algorithm-header">
                          <span className="algorithm-label">{definition.label}</span>
                          <span
                            className="help-anchor"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span
                              className="help-icon"
                              aria-label={`What ${definition.label} means`}
                              role="img"
                              tabIndex={0}
                            >
                              ?
                            </span>
                            <span className="help-tooltip" role="tooltip">
                              {definition.helpText}
                            </span>
                          </span>
                        </span>
                        <span className="algorithm-description">
                          {definition.description}
                        </span>
                      </span>
                      <span className={`algorithm-meta tier-${definition.tier}`}>
                        {TIER_LABELS[definition.tier]}
                      </span>
                      <span className={`status-pill status-${status}`}>{status}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
