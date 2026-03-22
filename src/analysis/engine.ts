import type {
  AnalysisContext,
  AnalysisDefinition,
  NormalizedAnalysisResult,
} from "../types";
import { average, standardDeviation, tokenizeParagraphs, tokenizeSentences, tokenizeWords } from "./text";

function buildContext(text: string): AnalysisContext {
  return {
    text,
    words: tokenizeWords(text),
    sentences: tokenizeSentences(text),
    paragraphs: tokenizeParagraphs(text),
  };
}

function toBand(value: number): -2 | -1 | 0 | 1 | 2 {
  if (value <= -1.5) {
    return -2;
  }
  if (value <= -0.5) {
    return -1;
  }
  if (value < 0.5) {
    return 0;
  }
  if (value < 1.5) {
    return 1;
  }
  return 2;
}

function normalizeResult(
  result: ReturnType<AnalysisDefinition["compute"]>,
): NormalizedAnalysisResult {
  const values = result.spans.map((span) => span.rawScore);
  const mean = average(values);
  const stdDev = standardDeviation(values, mean);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  return {
    algorithmId: result.algorithmId,
    unit: result.unit,
    spans: result.spans.map((span) => {
      const normalizedScore = stdDev === 0 ? 0 : (span.rawScore - mean) / stdDev;
      return {
        ...span,
        normalizedScore,
        band: toBand(normalizedScore),
      };
    }),
    stats: {
      mean,
      stdDev,
      min,
      max,
    },
  };
}

export function runAnalyses(
  text: string,
  definitions: AnalysisDefinition[],
): Record<string, NormalizedAnalysisResult> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {};
  }

  const context = buildContext(text);
  const results: Record<string, NormalizedAnalysisResult> = {};

  for (const definition of definitions) {
    results[definition.id] = normalizeResult(definition.compute(context));
  }

  return results;
}
