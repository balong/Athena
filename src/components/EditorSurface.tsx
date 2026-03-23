import {
  type CSSProperties,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Contributor, FocusRequest, VisibleSegment } from "../types";

type EditorSurfaceProps = {
  text: string;
  segments: VisibleSegment[];
  focusRequest: FocusRequest | null;
  onTextChange: (value: string) => void;
  onActiveSegmentChange: (index: number | null) => void;
};

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

const HEDGE_TERMS = [
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

const CERTAINTY_TERMS = [
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

const TRANSITION_TERMS = [
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

const CLICHE_TERMS = [
  "at the end of the day",
  "needless to say",
  "crystal clear",
  "think outside the box",
  "low-hanging fruit",
  "in order to",
];

function normalizedWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

function uniqueMatches(matches: string[]): string[] {
  return [...new Set(matches)];
}

function phraseMatches(text: string, phrases: string[]): string[] {
  const haystack = text.toLowerCase();
  return phrases.filter((phrase) => haystack.includes(phrase));
}

function repeatedWords(text: string): string[] {
  const counts = new Map<string, number>();
  for (const word of normalizedWords(text)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([word]) => word);
}

function triggerTerms(contributor: Contributor, text: string): string[] {
  const words = normalizedWords(text);

  switch (contributor.algorithmId) {
    case "stopword-density":
      return uniqueMatches(words.filter((word) => STOP_WORDS.has(word)));
    case "adverb-density":
      return uniqueMatches(words.filter((word) => word.endsWith("ly")));
    case "adjective-density":
      return uniqueMatches(
        words.filter((word) => /(ous|ful|ive|al|ic|less|able|ible|ary|ory|ish|like)$/.test(word)),
      );
    case "pronoun-density":
      return uniqueMatches(words.filter((word) => PRONOUNS.has(word)));
    case "punctuation-density":
      return uniqueMatches(text.match(/[,:;!?()[\]"'-]/g) ?? []);
    case "emphasis-punctuation":
      return uniqueMatches(text.match(/[!?]+/g) ?? []);
    case "hedge-density":
      return phraseMatches(text, HEDGE_TERMS);
    case "precision-vagueness":
      return phraseMatches(text, VAGUE_TERMS);
    case "certainty-density":
      return phraseMatches(text, CERTAINTY_TERMS);
    case "transition-density":
      return phraseMatches(text, TRANSITION_TERMS);
    case "generic-verb-density":
      return uniqueMatches(words.filter((word) => GENERIC_VERBS.has(word)));
    case "nominalization-density":
      return uniqueMatches(words.filter((word) => /(tion|sion|ment|ness|ity|ance|ence)$/.test(word)));
    case "cliche-density":
      return phraseMatches(text, CLICHE_TERMS);
    case "repeated-word-proximity":
      return repeatedWords(text);
    case "clause-density":
      return uniqueMatches([
        ...(text.match(/[,:;]/g) ?? []),
        ...words.filter((word) =>
          ["and", "but", "because", "although", "while", "if", "when", "which", "that"].includes(word),
        ),
      ]);
    default:
      return [];
  }
}

function formatTriggerSummary(contributor: Contributor, text: string): string | null {
  const matches = triggerTerms(contributor, text);
  if (matches.length === 0) {
    return null;
  }

  const visible = matches.slice(0, 6).map((match) => `"${match}"`);
  const remainder = matches.length - visible.length;
  return remainder > 0
    ? `${visible.join(", ")} and ${remainder} more`
    : visible.join(", ");
}

function findSegmentIndexAtOffset(
  segments: VisibleSegment[],
  offset: number,
): number | null {
  if (segments.length === 0) {
    return null;
  }

  const safeOffset = Math.max(0, offset - (offset > 0 ? 1 : 0));

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (safeOffset >= segment.start && safeOffset < segment.end) {
      return index;
    }
  }

  return null;
}

function bandRailColor(band: NonNullable<VisibleSegment["band"]>): string {
  if (band === -2) {
    return "var(--rail-band-neg-2)";
  }
  if (band === -1) {
    return "var(--rail-band-neg-1)";
  }
  if (band === 0) {
    return "var(--rail-band-0)";
  }
  if (band === 1) {
    return "var(--rail-band-1)";
  }
  return "var(--rail-band-2)";
}

function buildOverlapStyle(segment: VisibleSegment): CSSProperties | undefined {
  if (segment.overlapCount <= 1) {
    return undefined;
  }

  const secondaries = segment.contributors
    .filter((contributor) => contributor.algorithmId !== segment.winnerId)
    .slice(0, 3);

  const style = {} as CSSProperties & Record<string, string>;

  secondaries.forEach((contributor, index) => {
    style[`--overlap-${index + 1}`] = bandRailColor(contributor.band);
  });

  return style;
}

function buildComparisonCopy(contributor: Contributor): {
  badge: string;
} {
  const difference = contributor.rawScore - contributor.meanRawScore;
  const percentileFromTop = Math.max(1, Math.round(100 - contributor.percentile));
  const percentileFromBottom = Math.max(1, Math.round(contributor.percentile));
  const canUseAverage = Math.abs(contributor.meanRawScore) > 0.05;

  if (canUseAverage) {
    const percentDifference = Math.round(
      (Math.abs(difference) / Math.abs(contributor.meanRawScore)) * 100,
    );

    if (percentDifference <= 8) {
      return {
        badge: "Near average",
      };
    }

    if (difference > 0) {
      return {
        badge:
          contributor.percentile >= 60
            ? `Top ${percentileFromTop}% · ${percentDifference}% above avg`
            : `${percentDifference}% above avg`,
      };
    }

    return {
      badge:
        contributor.percentile <= 40
          ? `Bottom ${percentileFromBottom}% · ${percentDifference}% below avg`
          : `${percentDifference}% below avg`,
    };
  }

  if (contributor.percentile >= 60) {
    return {
      badge: `Top ${percentileFromTop}%`,
    };
  }

  if (contributor.percentile <= 40) {
    return {
      badge: `Bottom ${percentileFromBottom}%`,
    };
  }

  return {
    badge: "Middle range",
  };
}

export function EditorSurface({
  text,
  segments,
  focusRequest,
  onTextChange,
  onActiveSegmentChange,
}: EditorSurfaceProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const spanRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [popoverSegmentIndex, setPopoverSegmentIndex] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  } | null>(null);

  const visibleSegments = useMemo(() => {
    if (segments.length > 0) {
      return segments;
    }

        return [
          {
            start: 0,
            end: text.length,
            text,
            band: null,
            winnerId: null,
            overlapCount: 0,
            secondaryCount: 0,
            contributors: [],
          },
        ];
  }, [segments, text]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;

    if (!textarea || !backdrop) {
      return;
    }

    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }, [text, visibleSegments]);

  useEffect(() => {
    function updatePopoverPosition(): void {
      if (popoverSegmentIndex === null) {
        setPopoverPosition(null);
        return;
      }

      const frame = frameRef.current;
      const target = spanRefs.current[popoverSegmentIndex];

      if (!frame || !target) {
        setPopoverPosition(null);
        return;
      }

      const frameRect = frame.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = targetRect.top - frameRect.top;
      const targetBottom = targetRect.bottom - frameRect.top;
      const availableAbove = targetTop;
      const placement = availableAbove > 188 ? "above" : "below";
      const maxLeft = Math.max(12, frameRect.width - 368);
      const nextLeft = Math.min(
        Math.max(12, targetRect.left - frameRect.left),
        maxLeft,
      );

      setPopoverPosition({
        top: placement === "above" ? Math.max(12, targetTop - 12) : targetBottom + 12,
        left: nextLeft,
        placement,
      });
    }

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    return () => window.removeEventListener("resize", updatePopoverPosition);
  }, [popoverSegmentIndex, text, visibleSegments]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;

    if (!focusRequest || !textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(focusRequest.start, focusRequest.end);

    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 32;
    const lineIndex = text.slice(0, focusRequest.start).split("\n").length - 1;
    const nextScrollTop = Math.max(0, lineIndex * lineHeight - textarea.clientHeight / 3);

    textarea.scrollTop = nextScrollTop;
    if (backdrop) {
      backdrop.scrollTop = nextScrollTop;
    }

    const nextIndex = findSegmentIndexAtOffset(segments, focusRequest.start);
    onActiveSegmentChange(nextIndex);
    if (nextIndex !== null && segments[nextIndex]?.band !== null) {
      setPopoverSegmentIndex(nextIndex);
    }
  }, [focusRequest, onActiveSegmentChange, segments, text]);

  function syncActiveSegment(shouldOpen = false): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const nextIndex = findSegmentIndexAtOffset(segments, textarea.selectionStart ?? 0);
    onActiveSegmentChange(nextIndex);

    if (shouldOpen && nextIndex !== null && segments[nextIndex]?.band !== null) {
      setPopoverSegmentIndex(nextIndex);
      return;
    }

    if (shouldOpen) {
      setPopoverSegmentIndex(null);
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setPopoverSegmentIndex(null);
    onTextChange(event.currentTarget.value);
  }

  function handleScroll(): void {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;

    if (!textarea || !backdrop) {
      return;
    }

    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }

  const popoverSegment =
    popoverSegmentIndex !== null ? visibleSegments[popoverSegmentIndex] ?? null : null;

  return (
    <div className="editor-shell">
      <div className="editor-ruler">
        <span>Editor / live paint surface</span>
        <span>{text.length.toLocaleString()} chars</span>
      </div>

      <div ref={frameRef} className="editor-frame">
        <div ref={backdropRef} className="editor-backdrop" aria-hidden="true">
          <div className="editor-backdrop-copy">
            {visibleSegments.map((segment, index) => (
              <span
                key={`${segment.start}-${segment.end}-${segment.winnerId ?? "plain"}`}
                ref={(node) => {
                  spanRefs.current[index] = node;
                }}
                style={buildOverlapStyle(segment)}
                className={
                  segment.band === null
                    ? "segment-plain"
                    : `segment band-${segment.band} ${
                        segment.overlapCount > 1
                          ? `has-overlap has-overlap-${Math.min(segment.overlapCount, 4)}`
                          : ""
                      }`
                }
              >
                {segment.text}
              </span>
            ))}
            <span className="editor-trailing-space"> </span>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="editor-input"
          value={text}
          spellCheck={false}
          aria-label="Devious editor"
          onChange={handleChange}
          onScroll={handleScroll}
          onSelect={() => syncActiveSegment(false)}
          onClick={() => syncActiveSegment(true)}
          onKeyUp={() => syncActiveSegment(false)}
          onMouseUp={() => syncActiveSegment(true)}
        />

        {popoverSegment && popoverPosition ? (
          <aside
            className={`segment-popover segment-popover--${popoverPosition.placement}`}
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
            }}
          >
            <button
              type="button"
              className="segment-popover__close"
              aria-label="Close highlight details"
              onClick={() => setPopoverSegmentIndex(null)}
            >
              Close
            </button>
            <p className="eyebrow">Highlight read</p>
            <div className="segment-popover__list">
              {popoverSegment.contributors.map((contributor) => {
                const comparison = buildComparisonCopy(contributor);

                return (
                  <article
                    key={`${popoverSegment.start}-${contributor.algorithmId}`}
                    className="segment-popover__item"
                  >
                    <div className="segment-popover__item-row">
                      <strong>{contributor.label}</strong>
                      <span className="status-pill status-ready">{comparison.badge}</span>
                    </div>
                    <p>
                      <strong>Flagged for:</strong>{" "}
                      {formatTriggerSummary(contributor, popoverSegment.text) ??
                        contributor.explanation}
                    </p>
                    <p>{contributor.helpText}</p>
                  </article>
                );
              })}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
