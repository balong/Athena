import type { TextChunk, WordToken } from "../types";

const WORD_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[], mean: number): number {
  if (values.length <= 1) {
    return 0;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

export function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];

  for (const match of text.matchAll(WORD_PATTERN)) {
    const value = match[0];
    const start = match.index ?? 0;
    const end = start + value.length;
    const normalized = value.toLowerCase();

    tokens.push({
      start,
      end,
      text: value,
      normalized,
      stem: stemWord(normalized),
    });
  }

  return tokens;
}

export function tokenizeParagraphs(text: string): TextChunk[] {
  const paragraphs: TextChunk[] = [];
  const pattern = /\n\s*\n/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    const end = match.index;
    if (end > cursor) {
      paragraphs.push({
        start: cursor,
        end,
        text: text.slice(cursor, end),
      });
    }
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    paragraphs.push({
      start: cursor,
      end: text.length,
      text: text.slice(cursor),
    });
  }

  if (paragraphs.length === 0 && text.length > 0) {
    paragraphs.push({
      start: 0,
      end: text.length,
      text,
    });
  }

  return paragraphs;
}

export function tokenizeSentences(text: string): TextChunk[] {
  const sentences: TextChunk[] = [];
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] ?? "";
    const currentSlice = text.slice(start, index + 1).trim();
    const sentenceBreak =
      (/[.!?]/.test(char) && (next === "" || /\s/.test(next))) ||
      (char === "\n" && next === "\n");

    if (!sentenceBreak || currentSlice.length === 0) {
      continue;
    }

    const raw = text.slice(start, index + 1);
    const offset = raw.search(/\S/);
    const realStart = offset === -1 ? start : start + offset;
    const trimmed = raw.trim();

    if (trimmed.length > 0) {
      sentences.push({
        start: realStart,
        end: realStart + trimmed.length,
        text: trimmed,
      });
    }

    start = index + 1;
  }

  const remainder = text.slice(start).trim();
  if (remainder.length > 0) {
    const offset = text.slice(start).search(/\S/);
    const realStart = offset === -1 ? start : start + offset;
    sentences.push({
      start: realStart,
      end: realStart + remainder.length,
      text: remainder,
    });
  }

  return sentences;
}

export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

export function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length <= 3) {
    return normalized.length === 0 ? 0 : 1;
  }

  const stripped = normalized.replace(/(?:e|es|ed)$/g, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export function stemWord(word: string): string {
  return word
    .replace(/(ingly|edly|ation|itions|ments|ness|ingly|ingly)$/g, "")
    .replace(/(ing|edly|edly|ed|ly|es|s)$/g, "")
    .replace(/[^a-z]/g, "");
}

export function countMatches(text: string, values: string[]): number {
  const lower = text.toLowerCase();
  return values.reduce((count, value) => count + Number(lower.includes(value)), 0);
}

export function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

export function lexicalOverlap(left: string, right: string): number {
  const leftWords = new Set(tokenizeWords(left).map((word) => word.stem).filter(Boolean));
  const rightWords = new Set(tokenizeWords(right).map((word) => word.stem).filter(Boolean));

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) {
      shared += 1;
    }
  }

  return shared / Math.max(leftWords.size, rightWords.size);
}
