import type {
  AnalysisDefinition,
  Contributor,
  NormalizedAnalysisResult,
  VisibleSegment,
} from "../types";

function sameContributorSet(left: Contributor[], right: Contributor[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index].algorithmId !== right[index].algorithmId || left[index].band !== right[index].band) {
      return false;
    }
  }

  return true;
}

export function buildVisibleSegments(
  text: string,
  enabledIds: Set<string>,
  registry: Record<string, AnalysisDefinition>,
  results: Record<string, NormalizedAnalysisResult>,
): VisibleSegment[] {
  if (text.length === 0) {
    return [];
  }

  const contributors: Array<Contributor & { start: number; end: number }> = [];

  for (const [algorithmId, result] of Object.entries(results)) {
    if (!enabledIds.has(algorithmId)) {
      continue;
    }

    const definition = registry[algorithmId];
    if (!definition) {
      continue;
    }

    for (const span of result.spans) {
      if (span.end <= span.start) {
        continue;
      }

      contributors.push({
        start: span.start,
        end: span.end,
        algorithmId,
        label: definition.label,
        family: definition.family,
        tier: definition.tier,
        band: span.band,
        explanation: span.explanation,
        normalizedScore: span.normalizedScore,
        rawScore: span.rawScore,
      });
    }
  }

  const boundaries = new Set<number>([0, text.length]);
  for (const contributor of contributors) {
    boundaries.add(contributor.start);
    boundaries.add(contributor.end);
  }

  const ordered = [...boundaries].sort((left, right) => left - right);
  const segments: VisibleSegment[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index];
    const end = ordered[index + 1];

    if (end <= start) {
      continue;
    }

    const active = contributors
      .filter((contributor) => contributor.start <= start && contributor.end >= end)
      .sort((left, right) => {
        if (left.band !== right.band) {
          return left.band - right.band;
        }
        return left.algorithmId.localeCompare(right.algorithmId);
      });

    const winner = active[0];
    const nextSegment: VisibleSegment = {
      start,
      end,
      text: text.slice(start, end),
      band: winner?.band ?? null,
      winnerId: winner?.algorithmId ?? null,
      contributors: active,
    };

    const previous = segments[segments.length - 1];
    if (
      previous &&
      previous.band === nextSegment.band &&
      previous.winnerId === nextSegment.winnerId &&
      sameContributorSet(previous.contributors, nextSegment.contributors)
    ) {
      previous.end = nextSegment.end;
      previous.text += nextSegment.text;
      continue;
    }

    segments.push(nextSegment);
  }

  return segments;
}
