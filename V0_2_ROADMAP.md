# Athena v0.2 Roadmap

## Goal

Make Athena feel more useful, more trustworthy, and more editorially intelligent without turning it into a bloated dashboard.

`v0.2` should improve three things at once:

1. explanation quality
2. document-level visibility
3. algorithm value

## Scope

Athena v0.2 will ship:

- a better inspector
- a summary view above or beside the editor
- five stronger editorial algorithms
- better rendering stability and performance hygiene

It will not ship:

- accounts
- collaboration
- remote AI generation
- full parser/model infrastructure

## Product Outcome

After v0.2, a user should be able to:

- see not just where a highlight appears, but why it matters
- understand which issues dominate the document overall
- jump directly to the most suspicious sentences
- trust the app more because the signals are more editorial than academic

## v0.2 Features

### 1. Better Inspector

Upgrade the current inspector from “score dump” into “editorial guidance.”

Add:

- `What this shows`
- `Why it matters`
- `When this is useful`
- `When this may be a problem`
- `Raw score / z-score` moved to lower priority

Example inspector structure:

- label
- plain-English explanation
- good / risky framing
- sentence excerpt
- contributing algorithms
- low-priority numeric details

Implementation targets:

- [src/components/Inspector.tsx](/Users/benlong/Documents/code/Lil_Apps/devious/src/components/Inspector.tsx)
- [src/types.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/types.ts)
- [src/analysis/registry.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/analysis/registry.ts)

### 2. Summary View

Add a compact summary surface above the editor or above the inspector area.

It should show:

- strongest active algorithms in the current document
- number of notable spans by algorithm
- “most active families”
- quick-jump list of top flagged sentences or paragraphs

Suggested widgets:

- `Hotspots`
- `Top signals`
- `Jump to sentence`

Implementation targets:

- new [src/components/SummaryPanel.tsx](/Users/benlong/Documents/code/Lil_Apps/devious/src/components/SummaryPanel.tsx)
- [src/App.tsx](/Users/benlong/Documents/code/Lil_Apps/devious/src/App.tsx)
- possibly [src/analysis/highlights.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/analysis/highlights.ts) for ranking helpers

### 3. Five Stronger Algorithms

Build these next:

#### A. Coreference Ambiguity

- Family: `Cohesion`
- Tier: `short`
- Purpose:
  detect sentences where pronouns like `it`, `they`, `this`, `that` may be unclear

#### B. Entity Tracking

- Family: `Cohesion`
- Tier: `short`
- Purpose:
  show where major nouns/entities are introduced, dropped, and reintroduced

#### C. Claim-Support Balance

- Family: `Structure`
- Tier: `short`
- Purpose:
  flag paragraphs that make strong claims without examples, evidence, or reasons

#### D. Register Shift

- Family: `Sentiment`
- Tier: `short`
- Purpose:
  detect sudden shifts between conversational, formal, academic, and persuasive language

#### E. Rhythm Monotony

- Family: `Rhythm`
- Tier: `live` or `short`
- Purpose:
  detect runs of sentences with overly similar length and cadence

Implementation targets:

- [src/analysis/registry.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/analysis/registry.ts)
- [src/analysis/text.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/analysis/text.ts)

### 4. Rendering Stability Pass

The highlight system works, but it is still the most fragile part of the app.

v0.2 should harden:

- overlay alignment
- scroll sync
- sentence jump targeting
- tooltip placement in the scrolling rail
- long-document behavior

Implementation targets:

- [src/components/EditorSurface.tsx](/Users/benlong/Documents/code/Lil_Apps/devious/src/components/EditorSurface.tsx)
- [src/styles.css](/Users/benlong/Documents/code/Lil_Apps/devious/src/styles.css)
- [src/analysis/highlights.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/analysis/highlights.ts)

### 5. Performance Hygiene

v0.2 should improve responsiveness before adding deeper features.

Add:

- memoized document summary derivation
- better result ranking helpers
- worker migration path for more `short` analyses
- per-document caching keyed by text hash

Implementation targets:

- [src/App.tsx](/Users/benlong/Documents/code/Lil_Apps/devious/src/App.tsx)
- [src/analysis/engine.ts](/Users/benlong/Documents/code/Lil_Apps/devious/src/analysis/engine.ts)

## Recommended Data Model Changes

Extend each analysis definition with richer editorial metadata.

Suggested additions:

```ts
type AnalysisDefinition = {
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
  examples?: string[];
  compute: (context: AnalysisContext) => RawAnalysisResult;
};
```

Also add derived document summary types:

```ts
type SummarySignal = {
  algorithmId: string;
  label: string;
  count: number;
  averageBand: number;
  strongestBand: Band | null;
};
```

## UI Layout Recommendation

Keep the app minimalist.

Do not add a big dashboard.

Recommended layout:

- top: Athena brand strip
- main left: summary panel
- main center: editor
- main right: algorithm rail
- lower left or lower center: legend + inspector

The summary panel should feel like a thin intelligence layer, not a second app.

## Build Order

### Phase 1: Inspector Upgrade

1. Extend `AnalysisDefinition` metadata
2. Upgrade inspector rendering
3. Move numeric details lower in hierarchy

### Phase 2: Summary Layer

1. Create summary derivation helpers
2. Build `SummaryPanel`
3. Add jump-to-hotspot interactions

### Phase 3: Stronger Algorithms

1. Rhythm Monotony
2. Register Shift
3. Claim-Support Balance
4. Coreference Ambiguity
5. Entity Tracking

Reason:

- `Rhythm Monotony` and `Register Shift` are easier wins
- `Coreference Ambiguity` and `Entity Tracking` are more valuable but slightly trickier

### Phase 4: Stability + Performance

1. tighten overlay alignment
2. cache derived summaries
3. prep worker path for heavier short-tier analyses

## Acceptance Criteria

v0.2 is successful if:

- users can understand a highlight without knowing grammar vocabulary
- the summary panel makes the document feel scannable at a glance
- at least five new algorithms add clearly distinct value
- highlight alignment remains stable during normal editing and scrolling
- the app still feels immediate on medium-length documents

## Risks

### Risk: Summary panel becomes clutter

Mitigation:

- keep only 3 to 5 summary modules
- do not duplicate the control rail

### Risk: new algorithms feel arbitrary

Mitigation:

- every new algorithm must answer a recognizable editorial question
- every algorithm must have plain-English help and a “why it matters” explanation

### Risk: inspector becomes too text-heavy

Mitigation:

- prioritize short, sharp copy
- keep deep numeric detail secondary

## Recommended First Task

Start v0.2 with:

1. richer `AnalysisDefinition` metadata
2. inspector redesign
3. summary signal derivation

That sequence improves the user experience immediately, even before all five new algorithms land.
