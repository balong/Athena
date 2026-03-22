export type AnalysisTier = "live" | "short" | "deep";

export type AnalysisFamily =
  | "Readability"
  | "Syntax"
  | "Lexicon"
  | "Repetition"
  | "Rhythm"
  | "Sentiment"
  | "Structure"
  | "Emphasis"
  | "Certainty"
  | "Cohesion";

export type AnalysisUnit = "word" | "sentence" | "paragraph" | "span";

export type Band = -2 | -1 | 0 | 1 | 2;

export type TextChunk = {
  start: number;
  end: number;
  text: string;
};

export type WordToken = TextChunk & {
  normalized: string;
  stem: string;
};

export type RawSpan = {
  start: number;
  end: number;
  rawScore: number;
  explanation: string;
};

export type NormalizedSpan = RawSpan & {
  normalizedScore: number;
  band: Band;
};

export type RawAnalysisResult = {
  algorithmId: string;
  unit: AnalysisUnit;
  spans: RawSpan[];
};

export type NormalizedAnalysisResult = {
  algorithmId: string;
  unit: AnalysisUnit;
  spans: NormalizedSpan[];
  stats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
};

export type AnalysisContext = {
  text: string;
  words: WordToken[];
  sentences: TextChunk[];
  paragraphs: TextChunk[];
};

export type AnalysisDefinition = {
  id: string;
  label: string;
  family: AnalysisFamily;
  tier: AnalysisTier;
  unit: AnalysisUnit;
  description: string;
  helpText: string;
  whyItMatters?: string;
  goodWhen?: string;
  riskyWhen?: string;
  compute: (context: AnalysisContext) => RawAnalysisResult;
};

export type Contributor = {
  algorithmId: string;
  label: string;
  family: AnalysisFamily;
  tier: AnalysisTier;
  band: Band;
  helpText: string;
  whyItMatters?: string;
  goodWhen?: string;
  riskyWhen?: string;
  explanation: string;
  normalizedScore: number;
  rawScore: number;
  meanRawScore: number;
  stdDevRawScore: number;
  percentile: number;
};

export type VisibleSegment = {
  start: number;
  end: number;
  text: string;
  band: Band | null;
  winnerId: string | null;
  overlapCount: number;
  secondaryCount: number;
  contributors: Contributor[];
};

export type AnalysisStatus = "idle" | "loading" | "ready";

export type SummarySignal = {
  algorithmId: string;
  label: string;
  family: AnalysisFamily;
  count: number;
  averageMagnitude: number;
  strongestBand: Band | null;
};

export type SummaryHotspot = {
  segmentIndex: number;
  start: number;
  end: number;
  label: string;
  text: string;
  explanation: string;
  band: Band;
  score: number;
};

export type FocusRequest = {
  start: number;
  end: number;
  token: number;
};
