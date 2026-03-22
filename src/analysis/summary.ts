import type {
  AnalysisDefinition,
  NormalizedAnalysisResult,
  SummarySignal,
  VisibleSegment,
  SummaryHotspot,
} from "../types";

function trimExcerpt(text: string, limit = 124): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit - 1).trim()}…`;
}

export function buildSummarySignals(
  enabledIds: Set<string>,
  registry: Record<string, AnalysisDefinition>,
  results: Record<string, NormalizedAnalysisResult>,
): SummarySignal[] {
  const signals: SummarySignal[] = [];

  for (const [algorithmId, result] of Object.entries(results)) {
    if (!enabledIds.has(algorithmId)) {
      continue;
    }

    const definition = registry[algorithmId];
    if (!definition) {
      continue;
    }

    const notable = result.spans.filter(
      (span) => Math.abs(span.normalizedScore) >= 0.75 || span.band !== 0,
    );

    if (notable.length === 0) {
      continue;
    }

    const averageMagnitude =
      notable.reduce((sum, span) => sum + Math.abs(span.normalizedScore), 0) /
      notable.length;
    const strongest = notable.reduce((best, span) =>
      Math.abs(span.normalizedScore) > Math.abs(best.normalizedScore) ? span : best,
    );

    signals.push({
      algorithmId,
      label: definition.label,
      family: definition.family,
      count: notable.length,
      averageMagnitude,
      strongestBand: strongest.band,
    });
  }

  return signals.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return right.averageMagnitude - left.averageMagnitude;
  });
}

export function buildSummaryHotspots(segments: VisibleSegment[]): SummaryHotspot[] {
  return segments
    .map((segment, segmentIndex) => {
      const winner = segment.contributors.find(
        (contributor) => contributor.algorithmId === segment.winnerId,
      );

      if (!winner || segment.band === null || segment.text.trim().length === 0) {
        return null;
      }

      return {
        segmentIndex,
        start: segment.start,
        end: segment.end,
        label: winner.label,
        text: trimExcerpt(segment.text),
        explanation: winner.explanation,
        band: segment.band,
        score: Math.abs(winner.normalizedScore),
      };
    })
    .filter((hotspot): hotspot is SummaryHotspot => hotspot !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}
