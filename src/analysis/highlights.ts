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

function sameSegmentMeta(left: VisibleSegment, right: VisibleSegment): boolean {
  return (
    left.band === right.band &&
    left.winnerId === right.winnerId &&
    left.overlapCount === right.overlapCount &&
    left.secondaryCount === right.secondaryCount &&
    sameContributorSet(left.contributors, right.contributors)
  );
}

function pushSegment(
  segments: VisibleSegment[],
  segment: VisibleSegment,
  text: string,
): void {
  if (segment.end <= segment.start) {
    return;
  }

  const nextSegment = {
    ...segment,
    text: text.slice(segment.start, segment.end),
  };

  const previous = segments[segments.length - 1];
  if (previous && previous.end === nextSegment.start && sameSegmentMeta(previous, nextSegment)) {
    previous.end = nextSegment.end;
    previous.text = text.slice(previous.start, previous.end);
    return;
  }

  segments.push(nextSegment);
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

    const sortedScores = result.spans
      .map((span) => span.rawScore)
      .sort((left, right) => left - right);

    for (const span of result.spans) {
      if (span.end <= span.start) {
        continue;
      }

      const rank = sortedScores.filter((score) => score <= span.rawScore).length;
      const percentile =
        sortedScores.length === 0 ? 50 : (rank / sortedScores.length) * 100;

      contributors.push({
        start: span.start,
        end: span.end,
        algorithmId,
        label: definition.label,
        family: definition.family,
        tier: definition.tier,
        band: span.band,
        helpText: definition.helpText,
        whyItMatters: definition.whyItMatters,
        goodWhen: definition.goodWhen,
        riskyWhen: definition.riskyWhen,
        explanation: span.explanation,
        normalizedScore: span.normalizedScore,
        rawScore: span.rawScore,
        meanRawScore: result.stats.mean,
        stdDevRawScore: result.stats.stdDev,
        percentile,
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
        const magnitudeDifference =
          Math.abs(right.normalizedScore) - Math.abs(left.normalizedScore);
        if (magnitudeDifference !== 0) {
          return magnitudeDifference;
        }
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
      overlapCount: active.length,
      secondaryCount: Math.max(0, active.length - 1),
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

export function projectVisibleSegments(
  previousSegments: VisibleSegment[],
  previousText: string,
  nextText: string,
): VisibleSegment[] {
  if (previousText === nextText) {
    return previousSegments;
  }

  if (previousSegments.length === 0) {
    return [
      {
        start: 0,
        end: nextText.length,
        text: nextText,
        band: null,
        winnerId: null,
        overlapCount: 0,
        secondaryCount: 0,
        contributors: [],
      },
    ];
  }

  let prefix = 0;
  const maxPrefix = Math.min(previousText.length, nextText.length);
  while (prefix < maxPrefix && previousText[prefix] === nextText[prefix]) {
    prefix += 1;
  }

  let previousSuffixIndex = previousText.length - 1;
  let nextSuffixIndex = nextText.length - 1;
  while (
    previousSuffixIndex >= prefix &&
    nextSuffixIndex >= prefix &&
    previousText[previousSuffixIndex] === nextText[nextSuffixIndex]
  ) {
    previousSuffixIndex -= 1;
    nextSuffixIndex -= 1;
  }

  const previousChangedEnd = previousSuffixIndex + 1;
  const nextChangedEnd = nextSuffixIndex + 1;
  const delta = nextText.length - previousText.length;
  const projected: VisibleSegment[] = [];

  for (const segment of previousSegments) {
    if (segment.end <= prefix) {
      pushSegment(projected, segment, nextText);
      continue;
    }

    if (segment.start >= previousChangedEnd) {
      pushSegment(
        projected,
        {
          ...segment,
          start: segment.start + delta,
          end: segment.end + delta,
        },
        nextText,
      );
      continue;
    }

    if (segment.start < prefix) {
      pushSegment(
        projected,
        {
          ...segment,
          end: prefix,
        },
        nextText,
      );
    }

    if (segment.end > previousChangedEnd) {
      const rightLength = segment.end - previousChangedEnd;
      pushSegment(
        projected,
        {
          ...segment,
          start: nextChangedEnd,
          end: nextChangedEnd + rightLength,
        },
        nextText,
      );
    }
  }

  pushSegment(
    projected,
    {
      start: prefix,
      end: nextChangedEnd,
      text: "",
      band: null,
      winnerId: null,
      overlapCount: 0,
      secondaryCount: 0,
      contributors: [],
    },
    nextText,
  );

  return projected.sort((left, right) => left.start - right.start);
}
