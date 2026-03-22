# Devious Implementation Plan

## Product Summary

Devious is a browser-based writing surface plus analysis console. A user pastes or writes text in the main editor, then enables algorithmic highlight layers from a black-and-white menu on the right. Each algorithm maps its output to five bands:

- `-2 sigma`
- `-1 sigma`
- `mean`
- `+1 sigma`
- `+2 sigma`

Rendering rule: if multiple enabled algorithms overlap on the same text span, only the lowest visible band among those overlaps is drawn. This makes the display conservative instead of visually stacking every signal.

## Core Product Decisions

### Highlight Model

- Unit of analysis: sentence, clause, word, n-gram, or paragraph depending on the algorithm.
- Normalization: each algorithm emits raw scores plus metadata describing the scoring unit.
- Banding: convert raw scores into z-scores inside that algorithm's own distribution for the current document, then clamp into five buckets.
- Visible precedence: overlapping bands collapse to the lowest band number among active layers.
- Inspection: hover or selection reveals every contributing algorithm even when only one band is visible.

### Latency Tiers

- Realtime: runs on keystroke debounce.
- Short-wait: runs after idle or manual refresh, target under 2 seconds.
- Long-wait: background or worker-driven, target 2 to 10 seconds, with progress state.

### Algorithm Families

- Readability
- Syntax and grammar heuristics
- Lexical richness
- Repetition and redundancy
- Rhythm and cadence
- Sentiment and emotion
- Structure and discourse
- Emphasis and persuasion
- Ambiguity and certainty
- Cohesion and topic drift

## Recommended Technical Shape

### Stack

- Frontend: React + TypeScript + Vite
- Styling: CSS modules or scoped CSS with a small token system
- Editor model: plain text plus derived span overlays first; avoid rich-text complexity in v1
- State: Zustand or React context with reducer-based analysis store
- Analysis runtime: main thread for fast heuristics, Web Workers for medium/slow jobs
- Persistence: local storage for draft recovery and control state

### Why This Shape

- Plain text with overlay rendering is materially simpler than rich text and still covers the requested experience.
- Web Workers let us scale algorithm count without freezing typing.
- Vite keeps iteration fast in an otherwise empty repo.

## System Architecture

### Modules

1. `editor-core`
   Accepts text input, selection, caret tracking, and document segmentation.

2. `analysis-registry`
   Declares each algorithm with:
   - id
   - display name
   - family
   - latency tier
   - analysis unit
   - score polarity
   - compute function

3. `normalization-engine`
   Converts raw outputs into per-document z-scores and five-band buckets.

4. `highlight-engine`
   Merges spans, resolves overlap conflicts, and returns visible paint ranges.

5. `ui-controls`
   Renders family groups, latency badges, toggle state, legends, and loading state.

6. `inspector`
   Shows raw score, z-score, band, rationale, and hidden overlapping algorithms for the hovered span.

## Algorithm Coverage Plan

Ship in waves so the app has breadth early, then depth.

### Wave 1: Realtime Heuristics

- Sentence length
- Word length
- Syllables per word
- Flesch Reading Ease
- Flesch-Kincaid Grade
- Type-token ratio
- Stop-word density
- Passive voice heuristic
- Adverb density
- Adjective density
- Pronoun density
- Repeated word proximity
- Repeated phrase proximity
- Punctuation density
- Exclamation / question intensity
- All-caps emphasis
- Hedge-word density
- Certainty-word density
- Transition-word density
- Paragraph length

### Wave 2: Short-Wait Analyses

- Dependency-tree depth
- Clause density
- Parse ambiguity heuristics
- Coreference density heuristic
- Sentiment polarity
- Sentiment volatility across sentences
- Emotional intensity
- Topic drift by paragraph embeddings or lexical proxies
- Cohesion score between adjacent sentences
- Concreteness / abstractness using lexicons
- Cliche detection using phrase lists
- Nominalization density

### Wave 3: Long-Wait / Experimental

- Burstiness and cadence modeling
- Surprisal / perplexity-like scoring from a local or remote language model
- Rhetorical device heuristics
- Argument structure signals
- Entity introduction / reuse patterns
- Semantic redundancy across distant passages
- Tone consistency over full-document windows

## Data Contract For Each Algorithm

Each algorithm should emit:

```ts
type AnalysisResult = {
  algorithmId: string;
  unit: "word" | "sentence" | "paragraph" | "span";
  spans: Array<{
    start: number;
    end: number;
    rawScore: number;
    normalizedScore?: number;
    band?: -2 | -1 | 0 | 1 | 2;
    explanation?: string;
  }>;
  stats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
};
```

## Rendering Rules

1. Segment source text into stable offsets.
2. Run active analyses by tier.
3. Normalize each algorithm independently.
4. Convert each span to one of five bands.
5. Merge all enabled spans into a conflict map.
6. For each overlapping region, render the lowest band only.
7. Preserve hidden overlap details for the hover inspector.

## UI Plan

### Layout

- Left: primary writing surface
- Right: narrow monochrome control rail
- Bottom or floating: legend / hover details

### Control Rail

- Group algorithms by family
- Show family counts and collapse/expand
- Add tier badges: `Live`, `Short`, `Deep`
- Add per-family master toggle plus per-algorithm toggles
- Add quick filters: `Show all live`, `Hide all`, `Only readability`, `Only repetition`

### Visual Language

- Mostly white canvas, black controls, grey separators
- Five fixed highlight colors shared across all algorithms for band meaning
- Color intensity communicates severity; UI chrome stays monochrome
- Loading states are neutral, not colorful

## Delivery Phases

### Phase 0: Bootstrap

- Scaffold Vite React TypeScript app
- Establish CSS tokens and page shell
- Build plain text editor and right rail layout

### Phase 1: Analysis Core

- Implement document segmentation
- Create algorithm registry and result schema
- Implement normalization engine
- Implement overlap precedence engine

### Phase 2: First Usable Slice

- Add 10 to 20 realtime algorithms
- Render live highlights
- Add inspector and legend
- Add control grouping and persistence

### Phase 3: Deferred Analysis

- Move medium and slow algorithms into workers
- Add latency-aware states and manual rerun controls
- Introduce caching keyed by document hash + algorithm id

### Phase 4: Scale Coverage

- Add short-wait and experimental families
- Refine explanations and confidence notes
- Tune color mapping and interaction details

### Phase 5: Validation

- Performance test on 1,000 to 3,000 word passages
- Verify overlap precedence edge cases
- Verify mobile responsiveness for control rail and editor

## Acceptance Checklist

- User can paste text and toggle analyses immediately.
- At least 20 algorithms exist in v1.
- Five-band legend matches rendered output.
- Overlap precedence is deterministic and documented.
- Realtime analyses do not materially interrupt typing.
- Delayed analyses show loading and completion states clearly.

## Risks To Control Early

- Span rendering complexity can explode if each algorithm uses different units.
- Rich-text editors would slow delivery; plain text is the correct v1 constraint.
- Long-running NLP features can become a dependency trap; treat them as later waves.
- Too many simultaneous colors or badges would undermine the minimalist control brief.

## Recommended Next Build Step

Start with a local-first React/Vite prototype that proves four things in order:

1. stable text offset mapping
2. five-band normalization
3. overlap precedence
4. latency-tiered toggles

If those work cleanly, algorithm count becomes an additive content problem instead of a product architecture risk.
