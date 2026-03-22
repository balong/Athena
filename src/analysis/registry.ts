import type {
  AnalysisContext,
  AnalysisDefinition,
  RawSpan,
  TextChunk,
  WordToken,
} from "../types";
import {
  countMatches,
  countSyllables,
  countWords,
  lexicalOverlap,
  ratio,
} from "./text";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "with",
  "you",
]);

const PRONOUNS = new Set([
  "i",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "they",
  "them",
  "their",
  "theirs",
  "it",
  "its",
]);

const HEDGE_WORDS = [
  "maybe",
  "perhaps",
  "possibly",
  "might",
  "could",
  "seems",
  "appear",
  "arguably",
  "fairly",
  "rather",
  "somewhat",
];

const CERTAINTY_WORDS = [
  "always",
  "never",
  "clearly",
  "obviously",
  "definitely",
  "certainly",
  "undeniably",
  "must",
  "prove",
];

const TRANSITION_WORDS = [
  "however",
  "therefore",
  "meanwhile",
  "instead",
  "moreover",
  "thus",
  "because",
  "although",
  "finally",
  "otherwise",
];

const CLICHES = [
  "at the end of the day",
  "needless to say",
  "crystal clear",
  "think outside the box",
  "low-hanging fruit",
  "in order to",
];

const POSITIVE_WORDS = [
  "good",
  "strong",
  "clear",
  "sharp",
  "precise",
  "beautiful",
  "useful",
  "confident",
  "vivid",
];

const NEGATIVE_WORDS = [
  "bad",
  "weak",
  "unclear",
  "muddy",
  "cruel",
  "dull",
  "confused",
  "vague",
  "flat",
];

const EMOTION_WORDS = [
  "love",
  "hate",
  "fear",
  "joy",
  "anger",
  "panic",
  "thrill",
  "grief",
  "delight",
  "worry",
];

const ABSTRACT_WORDS = [
  "idea",
  "system",
  "concept",
  "meaning",
  "theory",
  "logic",
  "strategy",
  "process",
  "identity",
  "structure",
];

const CONCRETE_WORDS = [
  "stone",
  "paper",
  "table",
  "window",
  "hand",
  "voice",
  "street",
  "page",
  "knife",
  "door",
];

const GENERIC_VERBS = new Set([
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "done",
  "make",
  "makes",
  "made",
  "get",
  "gets",
  "got",
  "gotten",
  "go",
  "goes",
  "went",
  "gone",
  "come",
  "comes",
  "came",
  "put",
  "puts",
  "set",
  "sets",
  "seem",
  "seems",
  "seemed",
  "become",
  "becomes",
  "became",
  "feel",
  "feels",
  "felt",
  "show",
  "shows",
  "showed",
  "shown",
  "give",
  "gives",
  "gave",
  "given",
  "take",
  "takes",
  "took",
  "taken",
]);

const LIKELY_VERBS = new Set([
  ...GENERIC_VERBS,
  "say",
  "says",
  "said",
  "think",
  "thinks",
  "thought",
  "know",
  "knows",
  "knew",
  "known",
  "watch",
  "watches",
  "watched",
  "turn",
  "turns",
  "turned",
  "move",
  "moves",
  "moved",
  "walk",
  "walks",
  "walked",
  "write",
  "writes",
  "wrote",
  "written",
  "read",
  "reads",
  "build",
  "builds",
  "built",
  "tell",
  "tells",
  "told",
  "find",
  "finds",
  "found",
  "leave",
  "leaves",
  "left",
  "keep",
  "keeps",
  "kept",
  "run",
  "runs",
  "ran",
  "work",
  "works",
  "worked",
]);

const VAGUE_TERMS = [
  "very",
  "really",
  "quite",
  "pretty",
  "some",
  "many",
  "various",
  "a lot",
  "kind of",
  "sort of",
  "things",
  "stuff",
  "somehow",
  "somewhat",
  "basically",
  "generally",
];

const ADJECTIVE_HINTS = new Set([
  "new",
  "old",
  "big",
  "small",
  "clear",
  "simple",
  "strong",
  "weak",
  "direct",
  "complex",
  "major",
  "minor",
  "early",
  "late",
  "full",
  "empty",
]);

const ARTICLES = new Set(["a", "an", "the", "this", "that", "these", "those"]);
const PREPOSITIONS = new Set([
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "from",
  "to",
  "into",
  "over",
  "under",
  "through",
  "across",
  "between",
  "among",
]);

function sentenceWords(sentence: TextChunk, words: WordToken[]): WordToken[] {
  return words.filter((word) => word.start >= sentence.start && word.end <= sentence.end);
}

function paragraphWords(paragraph: TextChunk, words: WordToken[]): WordToken[] {
  return words.filter((word) => word.start >= paragraph.start && word.end <= paragraph.end);
}

function toSentenceSpans(
  context: AnalysisContext,
  score: (sentence: TextChunk, index: number) => { value: number; explanation: string },
): RawSpan[] {
  return context.sentences.map((sentence, index) => {
    const result = score(sentence, index);
    return {
      start: sentence.start,
      end: sentence.end,
      rawScore: result.value,
      explanation: result.explanation,
    };
  });
}

function toParagraphSpans(
  context: AnalysisContext,
  score: (paragraph: TextChunk, index: number) => { value: number; explanation: string },
): RawSpan[] {
  return context.paragraphs.map((paragraph, index) => {
    const result = score(paragraph, index);
    return {
      start: paragraph.start,
      end: paragraph.end,
      rawScore: result.value,
      explanation: result.explanation,
    };
  });
}

function toWordSpans(
  context: AnalysisContext,
  score: (word: WordToken, index: number) => { value: number; explanation: string },
): RawSpan[] {
  return context.words.map((word, index) => {
    const result = score(word, index);
    return {
      start: word.start,
      end: word.end,
      rawScore: result.value,
      explanation: result.explanation,
    };
  });
}

function fleschReadingEase(sentence: TextChunk, context: AnalysisContext): number {
  const words = sentenceWords(sentence, context.words);
  const wordCount = words.length;
  const syllables = words.reduce((sum, word) => sum + countSyllables(word.text), 0);

  if (wordCount === 0) {
    return 0;
  }

  return 206.835 - 1.015 * wordCount - 84.6 * ratio(syllables, wordCount);
}

function fleschKincaid(sentence: TextChunk, context: AnalysisContext): number {
  const words = sentenceWords(sentence, context.words);
  const wordCount = words.length;
  const syllables = words.reduce((sum, word) => sum + countSyllables(word.text), 0);

  if (wordCount === 0) {
    return 0;
  }

  return 0.39 * wordCount + 11.8 * ratio(syllables, wordCount) - 15.59;
}

function isLikelyVerb(word: WordToken): boolean {
  return (
    LIKELY_VERBS.has(word.normalized) ||
    /(ed|ing)$/.test(word.normalized)
  );
}

function isSubjectCandidate(word: WordToken): boolean {
  return !ARTICLES.has(word.normalized) && !PREPOSITIONS.has(word.normalized);
}

function isAdjectiveLike(word: WordToken): boolean {
  return (
    ADJECTIVE_HINTS.has(word.normalized) ||
    /(ous|ful|ive|al|ic|less|able|ible|ary|ory|ish|like)$/.test(word.normalized)
  );
}

export const ANALYSIS_REGISTRY: AnalysisDefinition[] = [
  {
    id: "sentence-length",
    label: "Sentence length",
    family: "Readability",
    tier: "live",
    unit: "sentence",
    description: "Words per sentence.",
    helpText:
      "Shows how long each sentence is. Very long sentences can feel heavy or hard to follow, while very short ones can feel sharp, abrupt, or simplistic depending on context.",
    compute: (context) => ({
      algorithmId: "sentence-length",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = countWords(sentence.text);
        return {
          value: words,
          explanation: `${words} words in this sentence.`,
        };
      }),
    }),
  },
  {
    id: "word-length",
    label: "Word length",
    family: "Readability",
    tier: "live",
    unit: "word",
    description: "Letters per word.",
    helpText:
      "Shows where you are using unusually short or unusually long words. Longer words can make writing feel more formal or dense; shorter words usually feel faster and clearer.",
    compute: (context) => ({
      algorithmId: "word-length",
      unit: "word",
      spans: toWordSpans(context, (word) => ({
        value: word.text.length,
        explanation: `${word.text.length} letters in "${word.text}".`,
      })),
    }),
  },
  {
    id: "syllables-per-word",
    label: "Syllables per word",
    family: "Readability",
    tier: "live",
    unit: "word",
    description: "Estimated syllables in each word.",
    helpText:
      "Highlights words that sound simpler or more complex when spoken aloud. Words with more syllables often slow the reading pace and can make a passage feel more academic or abstract.",
    compute: (context) => ({
      algorithmId: "syllables-per-word",
      unit: "word",
      spans: toWordSpans(context, (word) => {
        const syllables = countSyllables(word.text);
        return {
          value: syllables,
          explanation: `${syllables} estimated syllables in "${word.text}".`,
        };
      }),
    }),
  },
  {
    id: "flesch-reading-ease",
    label: "Flesch reading ease",
    family: "Readability",
    tier: "live",
    unit: "sentence",
    description: "Reading ease per sentence.",
    helpText:
      "Estimates how easy a sentence is to read at a glance. Higher difficulty does not always mean bad writing, but it can signal places where readers may need more effort.",
    compute: (context) => ({
      algorithmId: "flesch-reading-ease",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const score = fleschReadingEase(sentence, context);
        return {
          value: score,
          explanation: `Estimated reading ease: ${score.toFixed(1)}.`,
        };
      }),
    }),
  },
  {
    id: "flesch-kincaid-grade",
    label: "Flesch-Kincaid grade",
    family: "Readability",
    tier: "short",
    unit: "sentence",
    description: "Estimated grade level per sentence.",
    helpText:
      "Estimates how advanced the sentence feels in school-grade terms. This helps spot passages that may be harder or easier for a general reader than you intended.",
    compute: (context) => ({
      algorithmId: "flesch-kincaid-grade",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const score = fleschKincaid(sentence, context);
        return {
          value: score,
          explanation: `Estimated grade level: ${score.toFixed(1)}.`,
        };
      }),
    }),
  },
  {
    id: "stopword-density",
    label: "Stop-word density",
    family: "Lexicon",
    tier: "live",
    unit: "sentence",
    description: "Share of common function words.",
    helpText:
      "Shows how much of a sentence is made of very common glue words like 'the,' 'and,' or 'of.' Too much can make a sentence feel bland or indirect; too little can make it sound clipped or unnatural.",
    compute: (context) => ({
      algorithmId: "stopword-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const count = words.filter((word) => STOP_WORDS.has(word.normalized)).length;
        const density = ratio(count, words.length);
        return {
          value: density,
          explanation: `${count} stop words across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "type-token-ratio",
    label: "Type-token ratio",
    family: "Lexicon",
    tier: "live",
    unit: "paragraph",
    description: "Lexical variety per paragraph.",
    helpText:
      "Shows how much a paragraph repeats the same vocabulary versus introducing fresh wording. High variety can feel lively; low variety can signal repetition, fixation, or deliberate emphasis.",
    compute: (context) => ({
      algorithmId: "type-token-ratio",
      unit: "paragraph",
      spans: toParagraphSpans(context, (paragraph) => {
        const words = paragraphWords(paragraph, context.words);
        const types = new Set(words.map((word) => word.stem).filter(Boolean));
        const score = ratio(types.size, words.length);
        return {
          value: score,
          explanation: `${types.size} unique stems across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "adverb-density",
    label: "Adverb density",
    family: "Syntax",
    tier: "live",
    unit: "sentence",
    description: "Share of adverb-like words.",
    helpText:
      "Looks for words like 'quickly' or 'carefully' that modify how something happens. A few can help, but overuse can make writing feel padded when a stronger verb might do the job.",
    compute: (context) => ({
      algorithmId: "adverb-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const count = words.filter((word) => word.normalized.endsWith("ly")).length;
        return {
          value: ratio(count, words.length),
          explanation: `${count} adverb-like words across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "adjective-density",
    label: "Adjective density",
    family: "Syntax",
    tier: "live",
    unit: "sentence",
    description: "Share of adjective-like endings.",
    helpText:
      "Looks for descriptive words that add qualities to nouns. This can show where a sentence is vivid and detailed, or where it may be leaning too hard on description instead of action.",
    compute: (context) => ({
      algorithmId: "adjective-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const count = words.filter((word) =>
          /(ous|ful|ive|al|ic|less|able|ible|ary)$/.test(word.normalized),
        ).length;
        return {
          value: ratio(count, words.length),
          explanation: `${count} adjective-like words across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "pronoun-density",
    label: "Pronoun density",
    family: "Syntax",
    tier: "live",
    unit: "sentence",
    description: "Pronouns per sentence.",
    helpText:
      "Shows how much a sentence relies on words like 'he,' 'she,' 'they,' or 'it.' Too many can make a passage vague if the reader has to keep guessing who or what is being referenced.",
    compute: (context) => ({
      algorithmId: "pronoun-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const count = words.filter((word) => PRONOUNS.has(word.normalized)).length;
        return {
          value: ratio(count, words.length),
          explanation: `${count} pronouns across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "passive-voice",
    label: "Passive voice heuristic",
    family: "Syntax",
    tier: "live",
    unit: "sentence",
    description: "Flags likely passive constructions.",
    helpText:
      "Looks for places where the action feels indirect, like when something 'was done' instead of saying who did it. This is not always wrong, but it can make prose feel less direct or less energetic.",
    compute: (context) => ({
      algorithmId: "passive-voice",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const phrase = sentence.text.toLowerCase();
        const score = /\b(am|is|are|was|were|be|been|being)\b\s+\w+(ed|en)\b/.test(phrase)
          ? 1
          : 0;
        return {
          value: score,
          explanation:
            score === 1
              ? "Contains a likely passive construction."
              : "No likely passive construction detected.",
        };
      }),
    }),
  },
  {
    id: "subject-verb-distance",
    label: "Subject-verb distance",
    family: "Structure",
    tier: "live",
    unit: "sentence",
    description: "Distance between who acts and the main action.",
    helpText:
      "Shows sentences where the main action arrives late. When too much material gets wedged between the starting idea and what it actually does, readers often lose the thread.",
    compute: (context) => ({
      algorithmId: "subject-verb-distance",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const subjectIndex = words.findIndex(isSubjectCandidate);
        const verbIndex = words.findIndex(
          (word, index) => index > Math.max(subjectIndex, 0) && isLikelyVerb(word),
        );
        const distance =
          subjectIndex === -1 || verbIndex === -1 ? 0 : Math.max(0, verbIndex - subjectIndex - 1);
        return {
          value: distance,
          explanation:
            distance === 0
              ? "The action arrives quickly after the sentence opens."
              : `${distance} words sit between the sentence opener and the main action.`,
        };
      }),
    }),
  },
  {
    id: "punctuation-density",
    label: "Punctuation density",
    family: "Rhythm",
    tier: "live",
    unit: "sentence",
    description: "Punctuation marks per character.",
    helpText:
      "Shows where punctuation is doing a lot of work. Heavy punctuation can create texture and rhythm, but it can also signal sentences that are overpacked or overly interrupted.",
    compute: (context) => ({
      algorithmId: "punctuation-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const matches = sentence.text.match(/[,:;.!?—-]/g) ?? [];
        const score = ratio(matches.length, sentence.text.length);
        return {
          value: score,
          explanation: `${matches.length} punctuation marks across ${sentence.text.length} characters.`,
        };
      }),
    }),
  },
  {
    id: "verb-strength",
    label: "Verb strength",
    family: "Lexicon",
    tier: "live",
    unit: "sentence",
    description: "How much the sentence leans on generic verbs.",
    helpText:
      "Highlights sentences that depend on broad, low-energy verbs like 'is,' 'have,' or 'make.' These are sometimes fine, but overuse can make prose feel flat when a more specific action could carry the line.",
    compute: (context) => ({
      algorithmId: "verb-strength",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const genericCount = words.filter((word) => GENERIC_VERBS.has(word.normalized)).length;
        return {
          value: ratio(genericCount, words.length),
          explanation: `${genericCount} generic verbs across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "question-exclaim",
    label: "Question / exclaim intensity",
    family: "Emphasis",
    tier: "live",
    unit: "sentence",
    description: "Highlights emphatic punctuation.",
    helpText:
      "Flags sentences that lean on question marks or exclamation points for force. That can create urgency or voice, but too much can make the tone feel loud or overstated.",
    compute: (context) => ({
      algorithmId: "question-exclaim",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const matches = sentence.text.match(/[!?]/g) ?? [];
        return {
          value: matches.length,
          explanation: `${matches.length} emphatic punctuation marks.`,
        };
      }),
    }),
  },
  {
    id: "all-caps",
    label: "All-caps emphasis",
    family: "Emphasis",
    tier: "live",
    unit: "word",
    description: "Flags all-caps words.",
    helpText:
      "Marks words written in full capitals. This usually reads as shouting, labeling, or dramatic emphasis, so it stands out strongly even in small doses.",
    compute: (context) => ({
      algorithmId: "all-caps",
      unit: "word",
      spans: toWordSpans(context, (word) => {
        const score =
          word.text.length > 1 && word.text === word.text.toUpperCase() ? 1 : 0;
        return {
          value: score,
          explanation:
            score === 1 ? "All-caps emphasis detected." : "Not set in all caps.",
        };
      }),
    }),
  },
  {
    id: "hedge-density",
    label: "Hedge density",
    family: "Certainty",
    tier: "live",
    unit: "sentence",
    description: "Measures hedging language.",
    helpText:
      "Looks for softening language like 'maybe,' 'perhaps,' or 'seems.' This can make writing thoughtful and careful, but too much can make claims feel timid or slippery.",
    compute: (context) => ({
      algorithmId: "hedge-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const count = countMatches(sentence.text, HEDGE_WORDS);
        const words = sentenceWords(sentence, context.words);
        return {
          value: ratio(count, words.length),
          explanation: `${count} hedge signals across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "precision-vagueness",
    label: "Precision / vagueness",
    family: "Lexicon",
    tier: "live",
    unit: "sentence",
    description: "How much the sentence relies on vague wording.",
    helpText:
      "Looks for wording that sounds fuzzy instead of specific, like 'very,' 'some,' 'a lot,' or 'kind of.' This helps find places where the idea may need sharper detail or stronger commitment.",
    compute: (context) => ({
      algorithmId: "precision-vagueness",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const vagueMatches = countMatches(sentence.text, VAGUE_TERMS);
        const words = sentenceWords(sentence, context.words);
        return {
          value: ratio(vagueMatches, words.length),
          explanation: `${vagueMatches} vague terms or phrases across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "certainty-density",
    label: "Certainty density",
    family: "Certainty",
    tier: "live",
    unit: "sentence",
    description: "Measures forceful certainty words.",
    helpText:
      "Looks for words that sound absolute or forceful, like 'clearly,' 'definitely,' or 'never.' This can make prose feel confident, but it can also make it feel overstated or rigid.",
    compute: (context) => ({
      algorithmId: "certainty-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const count = countMatches(sentence.text, CERTAINTY_WORDS);
        const words = sentenceWords(sentence, context.words);
        return {
          value: ratio(count, words.length),
          explanation: `${count} certainty signals across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "transition-density",
    label: "Transition density",
    family: "Structure",
    tier: "live",
    unit: "sentence",
    description: "Counts connective transitions.",
    helpText:
      "Shows where you use linking words like 'however,' 'therefore,' or 'meanwhile.' These can improve flow and logic, but too many can make the writing feel signposted or mechanical.",
    compute: (context) => ({
      algorithmId: "transition-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const count = countMatches(sentence.text, TRANSITION_WORDS);
        const words = sentenceWords(sentence, context.words);
        return {
          value: ratio(count, words.length),
          explanation: `${count} transition terms across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "repeated-word-proximity",
    label: "Repeated word proximity",
    family: "Repetition",
    tier: "live",
    unit: "word",
    description: "Highlights repeated stems in a short window.",
    helpText:
      "Flags words that repeat close together. Sometimes repetition adds emphasis, but often it shows you are leaning on the same wording without meaning to.",
    compute: (context) => ({
      algorithmId: "repeated-word-proximity",
      unit: "word",
      spans: toWordSpans(context, (word, index) => {
        const window = context.words.slice(Math.max(0, index - 6), index + 7);
        const repeats = window.filter(
          (candidate) => candidate.stem !== "" && candidate.stem === word.stem,
        ).length;
        return {
          value: repeats - 1,
          explanation: `${Math.max(0, repeats - 1)} nearby repeated stems for "${word.text}".`,
        };
      }),
    }),
  },
  {
    id: "repeated-phrase-proximity",
    label: "Repeated phrase proximity",
    family: "Repetition",
    tier: "live",
    unit: "sentence",
    description: "Repeated two-word phrases across the document.",
    helpText:
      "Looks for small phrase patterns that keep coming back. This can reveal accidental habits in your phrasing or places where you are repeating a rhetorical move on autopilot.",
    compute: (context) => {
      const bigrams = new Map<string, number>();
      for (let index = 0; index < context.words.length - 1; index += 1) {
        const bigram = `${context.words[index].stem} ${context.words[index + 1].stem}`.trim();
        if (bigram.length < 3) {
          continue;
        }
        bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
      }

      return {
        algorithmId: "repeated-phrase-proximity",
        unit: "sentence",
        spans: toSentenceSpans(context, (sentence) => {
          const words = sentenceWords(sentence, context.words);
          let repeated = 0;
          for (let index = 0; index < words.length - 1; index += 1) {
            const bigram = `${words[index].stem} ${words[index + 1].stem}`.trim();
            if ((bigrams.get(bigram) ?? 0) > 1) {
              repeated += 1;
            }
          }
          return {
            value: repeated,
            explanation: `${repeated} repeated bigram patterns in this sentence.`,
          };
        }),
      };
    },
  },
  {
    id: "paragraph-length",
    label: "Paragraph length",
    family: "Structure",
    tier: "live",
    unit: "paragraph",
    description: "Words per paragraph.",
    helpText:
      "Shows which paragraphs are unusually short or long. Long ones can feel dense or visually tiring; short ones can feel punchy, fragmented, or deliberately dramatic.",
    compute: (context) => ({
      algorithmId: "paragraph-length",
      unit: "paragraph",
      spans: toParagraphSpans(context, (paragraph) => {
        const words = paragraphWords(paragraph, context.words).length;
        return {
          value: words,
          explanation: `${words} words in this paragraph.`,
        };
      }),
    }),
  },
  {
    id: "modifier-stack-density",
    label: "Modifier stack density",
    family: "Syntax",
    tier: "short",
    unit: "sentence",
    description: "How often descriptions pile up before the thing being described.",
    helpText:
      "Looks for places where several descriptive words stack up before the main noun. That can create richness, but it can also make prose feel ornate, blurry, or overpacked.",
    compute: (context) => ({
      algorithmId: "modifier-stack-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        let currentStack = 0;
        let maxStack = 0;

        for (const word of words) {
          if (isAdjectiveLike(word)) {
            currentStack += 1;
            maxStack = Math.max(maxStack, currentStack);
            continue;
          }

          currentStack = 0;
        }

        return {
          value: maxStack,
          explanation:
            maxStack === 0
              ? "No heavy pile-up of descriptive words detected."
              : `Largest descriptive stack before a noun-like word: ${maxStack}.`,
        };
      }),
    }),
  },
  {
    id: "nominalization-density",
    label: "Nominalization density",
    family: "Lexicon",
    tier: "short",
    unit: "sentence",
    description: "Counts abstract noun endings.",
    helpText:
      "Looks for words that turn actions into abstract things, like 'decision' instead of 'decide' or 'movement' instead of 'move.' These can sound formal, but too many can make writing feel stiff and less direct.",
    compute: (context) => ({
      algorithmId: "nominalization-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const count = words.filter((word) =>
          /(tion|sion|ment|ness|ance|ence|ity)$/.test(word.normalized),
        ).length;
        return {
          value: ratio(count, words.length),
          explanation: `${count} nominalizations across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "cliche-density",
    label: "Cliche density",
    family: "Lexicon",
    tier: "short",
    unit: "sentence",
    description: "Known cliche phrase matches.",
    helpText:
      "Flags familiar stock phrases. These are not always fatal, but they can make a sentence feel borrowed, predictable, or less specific than it could be.",
    compute: (context) => ({
      algorithmId: "cliche-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const count = countMatches(sentence.text, CLICHES);
        return {
          value: count,
          explanation: `${count} cliche phrase matches.`,
        };
      }),
    }),
  },
  {
    id: "sentiment-polarity",
    label: "Sentiment polarity",
    family: "Sentiment",
    tier: "short",
    unit: "sentence",
    description: "Positive minus negative term density.",
    helpText:
      "Shows whether a sentence leans emotionally positive or negative based on its word choices. This helps reveal tone, especially when it differs from the tone you think you are using.",
    compute: (context) => ({
      algorithmId: "sentiment-polarity",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const positives = words.filter((word) => POSITIVE_WORDS.includes(word.normalized)).length;
        const negatives = words.filter((word) => NEGATIVE_WORDS.includes(word.normalized)).length;
        return {
          value: ratio(positives - negatives, words.length),
          explanation: `${positives} positive terms and ${negatives} negative terms.`,
        };
      }),
    }),
  },
  {
    id: "emotional-intensity",
    label: "Emotional intensity",
    family: "Sentiment",
    tier: "short",
    unit: "sentence",
    description: "Emotion-bearing words per sentence.",
    helpText:
      "Highlights sentences carrying unusually strong emotional language. That can create energy and force, but it can also make a passage feel melodramatic if it piles up too often.",
    compute: (context) => ({
      algorithmId: "emotional-intensity",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const count = words.filter((word) => EMOTION_WORDS.includes(word.normalized)).length;
        return {
          value: ratio(count, words.length),
          explanation: `${count} emotion terms across ${words.length} words.`,
        };
      }),
    }),
  },
  {
    id: "sentiment-volatility",
    label: "Sentiment volatility",
    family: "Sentiment",
    tier: "deep",
    unit: "sentence",
    description: "Sentence-to-sentence polarity swings.",
    helpText:
      "Shows where the emotional tone swings sharply from one sentence to the next. Sudden swings can feel dynamic, but they can also make a passage feel unstable or inconsistent.",
    compute: (context) => {
      const polarityBySentence = context.sentences.map((sentence) => {
        const words = sentenceWords(sentence, context.words);
        const positives = words.filter((word) => POSITIVE_WORDS.includes(word.normalized)).length;
        const negatives = words.filter((word) => NEGATIVE_WORDS.includes(word.normalized)).length;
        return ratio(positives - negatives, words.length);
      });

      return {
        algorithmId: "sentiment-volatility",
        unit: "sentence",
        spans: toSentenceSpans(context, (_sentence, index) => {
          const previous = polarityBySentence[index - 1] ?? polarityBySentence[index] ?? 0;
          const current = polarityBySentence[index] ?? 0;
          const next = polarityBySentence[index + 1] ?? polarityBySentence[index] ?? 0;
          const swing = Math.abs(current - previous) + Math.abs(current - next);
          return {
            value: swing,
            explanation: `Local polarity swing score: ${swing.toFixed(2)}.`,
          };
        }),
      };
    },
  },
  {
    id: "concreteness-shift",
    label: "Concreteness shift",
    family: "Lexicon",
    tier: "short",
    unit: "sentence",
    description: "Concrete vs abstract term balance.",
    helpText:
      "Shows whether a sentence leans toward tangible, physical language or toward ideas and abstractions. Concrete language usually feels vivid; abstract language can feel thoughtful but harder to picture.",
    compute: (context) => ({
      algorithmId: "concreteness-shift",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const concrete = words.filter((word) => CONCRETE_WORDS.includes(word.normalized)).length;
        const abstract = words.filter((word) => ABSTRACT_WORDS.includes(word.normalized)).length;
        return {
          value: ratio(concrete - abstract, words.length),
          explanation: `${concrete} concrete terms and ${abstract} abstract terms.`,
        };
      }),
    }),
  },
  {
    id: "clause-density",
    label: "Clause density",
    family: "Structure",
    tier: "short",
    unit: "sentence",
    description: "Commas and clause-joining conjunctions.",
    helpText:
      "Flags sentences that pack many thought-units together. That can create sophistication and flow, but it can also make a sentence feel overloaded or hard to track.",
    compute: (context) => ({
      algorithmId: "clause-density",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const commaCount = sentence.text.split(",").length - 1;
        const conjunctions = countMatches(sentence.text, [
          "and",
          "but",
          "because",
          "which",
          "while",
          "although",
          "though",
        ]);
        const words = sentenceWords(sentence, context.words).length;
        const score = ratio(commaCount + conjunctions, words);
        return {
          value: score,
          explanation: `${commaCount + conjunctions} clause signals across ${words} words.`,
        };
      }),
    }),
  },
  {
    id: "cohesion-score",
    label: "Cohesion score",
    family: "Cohesion",
    tier: "short",
    unit: "sentence",
    description: "Lexical overlap with adjacent sentences.",
    helpText:
      "Shows how strongly a sentence connects to the sentences around it through shared wording. Strong connection can help flow; weak connection can signal an abrupt jump or topic shift.",
    compute: (context) => ({
      algorithmId: "cohesion-score",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence, index) => {
        const previous = context.sentences[index - 1]?.text ?? "";
        const next = context.sentences[index + 1]?.text ?? "";
        const score = (lexicalOverlap(sentence.text, previous) + lexicalOverlap(sentence.text, next)) / 2;
        return {
          value: score,
          explanation: `Lexical overlap score: ${score.toFixed(2)}.`,
        };
      }),
    }),
  },
  {
    id: "dead-zone-sentences",
    label: "Dead-zone sentences",
    family: "Cohesion",
    tier: "short",
    unit: "sentence",
    description: "Sentences that add little that feels new.",
    helpText:
      "Looks for sentences that mostly restate nearby material instead of moving the writing forward. These are often the places readers skim because they feel like they have already gotten the point.",
    compute: (context) => ({
      algorithmId: "dead-zone-sentences",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence, index) => {
        const currentWords = sentenceWords(sentence, context.words)
          .map((word) => word.stem)
          .filter(Boolean);
        const currentSet = new Set(currentWords);

        const priorContext = context.sentences
          .slice(Math.max(0, index - 2), index)
          .flatMap((priorSentence) =>
            sentenceWords(priorSentence, context.words)
              .map((word) => word.stem)
              .filter(Boolean),
          );

        const priorSet = new Set(priorContext);
        let newTerms = 0;
        for (const stem of currentSet) {
          if (!priorSet.has(stem)) {
            newTerms += 1;
          }
        }

        const novelty = ratio(newTerms, currentSet.size);
        const deadZoneScore = index === 0 ? 0 : 1 - novelty;

        return {
          value: deadZoneScore,
          explanation:
            index === 0
              ? "Opening sentence, so there is no earlier nearby sentence to compare."
              : `${newTerms} new content words out of ${currentSet.size} distinct words in this sentence.`,
        };
      }),
    }),
  },
  {
    id: "topic-drift",
    label: "Topic drift",
    family: "Cohesion",
    tier: "deep",
    unit: "paragraph",
    description: "Paragraph-to-paragraph lexical drift.",
    helpText:
      "Looks for places where one paragraph starts talking about noticeably different things than the paragraph before it. That can be useful for transitions, or it can reveal a loss of focus.",
    compute: (context) => ({
      algorithmId: "topic-drift",
      unit: "paragraph",
      spans: toParagraphSpans(context, (paragraph, index) => {
        const previous = context.paragraphs[index - 1]?.text ?? paragraph.text;
        const similarity = lexicalOverlap(paragraph.text, previous);
        return {
          value: 1 - similarity,
          explanation: `Drift score from previous paragraph: ${(1 - similarity).toFixed(2)}.`,
        };
      }),
    }),
  },
  {
    id: "cadence-variance",
    label: "Cadence variance",
    family: "Rhythm",
    tier: "deep",
    unit: "sentence",
    description: "Variation in word lengths inside a sentence.",
    helpText:
      "Shows how much the sound and pace of a sentence vary. More variation can feel musical or alive; too little can feel flat, and too much can feel jagged.",
    compute: (context) => ({
      algorithmId: "cadence-variance",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence) => {
        const words = sentenceWords(sentence, context.words);
        const lengths = words.map((word) => word.text.length);
        const mean =
          lengths.reduce((sum, value) => sum + value, 0) / Math.max(1, lengths.length);
        const variance =
          lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
          Math.max(1, lengths.length);
        return {
          value: variance,
          explanation: `Word-length variance: ${variance.toFixed(2)}.`,
        };
      }),
    }),
  },
  {
    id: "tone-consistency",
    label: "Tone consistency",
    family: "Sentiment",
    tier: "deep",
    unit: "sentence",
    description: "Deviation from document sentiment baseline.",
    helpText:
      "Shows where a sentence sounds emotionally different from the overall piece. That can be intentional contrast, or it can reveal places where the voice slips.",
    compute: (context) => {
      const sentenceScores = context.sentences.map((sentence) => {
        const words = sentenceWords(sentence, context.words);
        const positives = words.filter((word) => POSITIVE_WORDS.includes(word.normalized)).length;
        const negatives = words.filter((word) => NEGATIVE_WORDS.includes(word.normalized)).length;
        return ratio(positives - negatives, words.length);
      });
      const baseline =
        sentenceScores.reduce((sum, value) => sum + value, 0) /
        Math.max(1, sentenceScores.length);

      return {
        algorithmId: "tone-consistency",
        unit: "sentence",
        spans: toSentenceSpans(context, (_sentence, index) => {
          const deviation = Math.abs((sentenceScores[index] ?? 0) - baseline);
          return {
            value: deviation,
            explanation: `Deviation from tone baseline: ${deviation.toFixed(2)}.`,
          };
        }),
      };
    },
  },
  {
    id: "redundancy-map",
    label: "Redundancy map",
    family: "Repetition",
    tier: "deep",
    unit: "sentence",
    description: "Similarity to distant sentences.",
    helpText:
      "Looks for sentences that say something very similar to things you already said elsewhere. This helps catch repeated ideas, not just repeated words.",
    compute: (context) => ({
      algorithmId: "redundancy-map",
      unit: "sentence",
      spans: toSentenceSpans(context, (sentence, index) => {
        let highestSimilarity = 0;
        for (let candidateIndex = 0; candidateIndex < context.sentences.length; candidateIndex += 1) {
          if (Math.abs(candidateIndex - index) < 2) {
            continue;
          }
          highestSimilarity = Math.max(
            highestSimilarity,
            lexicalOverlap(sentence.text, context.sentences[candidateIndex].text),
          );
        }
        return {
          value: highestSimilarity,
          explanation: `Highest distant-sentence similarity: ${highestSimilarity.toFixed(2)}.`,
        };
      }),
    }),
  },
];
