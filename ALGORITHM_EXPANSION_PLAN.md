# Athena Algorithm Expansion Plan

## Goal

Expand Athena beyond the current heuristic set in a way that increases editorial value, not just algorithm count.

The next additions should help users answer questions like:

- "What is unclear here?"
- "What feels weak or generic?"
- "Where does the writing lose focus?"
- "Where does the tone or rhythm drift?"

## Expansion Strategy

Ship the next algorithms in three layers:

1. easy heuristics with strong user value
2. medium NLP features that need better parsing or lexicons
3. deep / experimental features that need embeddings, models, or heavier runtime

Priority rule:

- Prefer features that reveal a real writing problem over features that only produce another abstract score.

## Tier 1: 10 Easy Heuristics

These can be built with the current architecture and should be the next shipping wave.

### 1. Subject-Verb Distance

- Family: `Structure`
- Unit: `sentence`
- What it shows:
  How far the main action is from the sentence subject.
- Why it matters:
  Long delays before the main verb often make sentences feel buried or hard to track.
- Likely implementation:
  Approximate from token patterns and punctuation before the first strong verb.

### 2. Verb Strength

- Family: `Lexicon`
- Unit: `word` or `sentence`
- What it shows:
  Where writing leans on generic verbs like `is`, `have`, `do`, `make`, `get`.
- Why it matters:
  Generic verbs can flatten energy and precision.
- Likely implementation:
  Lexicon-based scoring with optional sentence-level density.

### 3. Precision / Vagueness Score

- Family: `Lexicon`
- Unit: `sentence`
- What it shows:
  Vague wording like `very`, `some`, `many`, `kind of`, `a lot`, `things`.
- Why it matters:
  Vague language often weakens authority and clarity.
- Likely implementation:
  Phrase list plus weight table.

### 4. Modifier Stack Density

- Family: `Syntax`
- Unit: `sentence`
- What it shows:
  Places where many descriptive words pile up before a noun.
- Why it matters:
  Stacked modifiers can feel ornate, blurry, or overwritten.
- Likely implementation:
  Heuristic pattern matching on adjective-like runs.

### 5. Prepositional Chain Depth

- Family: `Structure`
- Unit: `sentence`
- What it shows:
  Chains like `of`, `in`, `for`, `with`, `by` that keep extending a phrase.
- Why it matters:
  Long chains often signal bureaucratic or tangled prose.
- Likely implementation:
  Count preposition runs inside sentence windows.

### 6. Opening Strength

- Family: `Emphasis`
- Unit: `sentence`
- What it shows:
  Weak openings like repeated articles, pronouns, or low-energy starts.
- Why it matters:
  Openings set rhythm and momentum.
- Likely implementation:
  Score first 1 to 3 tokens of each sentence.

### 7. Ending Strength

- Family: `Emphasis`
- Unit: `sentence` or `paragraph`
- What it shows:
  Weak endings that trail off into vague or low-impact language.
- Why it matters:
  Endings control punch and memorability.
- Likely implementation:
  Score final 1 to 5 tokens against vague / weak-ending lexicons.

### 8. Rhythm Monotony

- Family: `Rhythm`
- Unit: `sentence`
- What it shows:
  Runs of sentences with very similar length and pacing.
- Why it matters:
  Flat cadence makes prose feel mechanical even when it is technically clear.
- Likely implementation:
  Compare local sentence-length variance in sliding windows.

### 9. Dead-Zone Sentences

- Family: `Cohesion`
- Unit: `sentence`
- What it shows:
  Sentences that add little new language relative to nearby ones.
- Why it matters:
  These are often the places readers skim.
- Likely implementation:
  Local lexical novelty score against neighboring sentences.

### 10. Register Shift

- Family: `Sentiment`
- Unit: `sentence`
- What it shows:
  Sudden movement between casual, formal, academic, salesy, or conversational wording.
- Why it matters:
  Unintended shifts make voice feel unstable.
- Likely implementation:
  Weighted lexicons for register families and sentence-level deviation.

## Tier 2: 10 Medium NLP Features

These are worth adding after the easy heuristics. They likely need better token classes, lexicons, or lightweight parsing.

### 1. Coreference Ambiguity

- Family: `Cohesion`
- Unit: `sentence` or `span`
- What it shows:
  Pronouns whose referent is unclear or far away.

### 2. Entity Tracking

- Family: `Cohesion`
- Unit: `paragraph`
- What it shows:
  Where key people, things, or ideas appear, disappear, and reappear.

### 3. Claim-Support Balance

- Family: `Structure`
- Unit: `paragraph`
- What it shows:
  Strong assertions with weak evidence markers.

### 4. Negation Complexity

- Family: `Syntax`
- Unit: `sentence`
- What it shows:
  Multiple negatives or logic-flipping phrasing.

### 5. Question-Resolution Tracking

- Family: `Structure`
- Unit: `paragraph`
- What it shows:
  Questions that are raised but not clearly answered.

### 6. Jargon Density

- Family: `Lexicon`
- Unit: `sentence`
- What it shows:
  Clusters of specialized language or insider terminology.

### 7. Concrete Image Density

- Family: `Lexicon`
- Unit: `sentence`
- What it shows:
  How pictureable the writing is.

### 8. Abstraction Drift

- Family: `Lexicon`
- Unit: `paragraph`
- What it shows:
  Movement from concrete examples into abstract, hard-to-picture language.

### 9. Discourse Marker Overload

- Family: `Structure`
- Unit: `sentence`
- What it shows:
  Too many logical signposts, hedges, or framing phrases in one sentence.

### 10. Tone Intent Classifier

- Family: `Sentiment`
- Unit: `sentence`
- What it shows:
  Whether the sentence reads as explanatory, persuasive, defensive, dramatic, or neutral.

## Tier 3: 5 Deep / Experimental Features

These should be later, because they either cost more, require models, or need more infrastructure.

### 1. Semantic Redundancy Map

- Family: `Repetition`
- Unit: `sentence` or `paragraph`
- What it shows:
  Repeated ideas even when the wording changes.
- Likely implementation:
  Embedding similarity across non-adjacent regions.

### 2. Embedding-Based Topic Drift

- Family: `Cohesion`
- Unit: `paragraph`
- What it shows:
  Where the document meaningfully changes subject.
- Likely implementation:
  Paragraph embeddings plus distance thresholds.

### 3. Surprisal / Perplexity

- Family: `Rhythm` or `Lexicon`
- Unit: `sentence`
- What it shows:
  How expected or unexpected a passage is relative to a language model.
- Likely implementation:
  Local or remote LM scoring.

### 4. Argument Map Extraction

- Family: `Structure`
- Unit: `paragraph`
- What it shows:
  Claim, reason, evidence, objection, conclusion patterns.
- Likely implementation:
  Classifier or sequence tagging.

### 5. Style Fingerprint Drift

- Family: `Sentiment`
- Unit: `sentence` or `paragraph`
- What it shows:
  Where the piece stops sounding like itself.
- Likely implementation:
  Document baseline vector versus local embedding/style vector.

## Recommended Shipping Order

### Phase A: Highest Editorial Value

Build these first:

1. Subject-Verb Distance
2. Verb Strength
3. Precision / Vagueness
4. Modifier Stack Density
5. Dead-Zone Sentences

Why:

- They expose clarity and energy problems fast.
- They are understandable to normal users.
- They add more value than another readability score.

### Phase B: Flow And Structure

Build next:

1. Prepositional Chain Depth
2. Rhythm Monotony
3. Opening Strength
4. Ending Strength
5. Register Shift

Why:

- This phase makes Athena feel more editorial and less like a school rubric.

### Phase C: Referential And Logical Coherence

Build next:

1. Coreference Ambiguity
2. Entity Tracking
3. Claim-Support Balance
4. Negation Complexity
5. Question-Resolution Tracking

Why:

- These are harder, but they start catching “this paragraph kind of loses me” problems.

## Data Model Changes

For the next wave, extend the registry contract to support:

- `helpText`
- `goodWhen`
- `riskyWhen`
- `examples`
- optional `confidence`

Suggested shape:

```ts
type AnalysisDefinition = {
  id: string;
  label: string;
  family: AnalysisFamily;
  tier: AnalysisTier;
  unit: AnalysisUnit;
  description: string;
  helpText: string;
  goodWhen?: string;
  riskyWhen?: string;
  examples?: string[];
  compute: (context: AnalysisContext) => RawAnalysisResult;
};
```

## UI Additions Needed

- Add `?` tooltip help to every algorithm row.
- Add optional “why this matters” copy in the inspector.
- Add “this can be good / this can be risky” language so users do not treat every highlight as an error.
- Add per-family filters for `Clarity`, `Energy`, `Flow`, `Tone`, `Focus`.

## Risks

- Some heuristics will be wrong in edge cases.
- Overexplaining grammar will make the tool feel academic and hostile.
- Too many weak algorithms will dilute trust.

Mitigation:

- Prefer strong explanations over false precision.
- Mark experimental features clearly.
- Ship fewer better features before broadening again.

## Recommended Next Build Task

Implement Phase A as the next registry expansion:

1. Subject-Verb Distance
2. Verb Strength
3. Precision / Vagueness
4. Modifier Stack Density
5. Dead-Zone Sentences

That would give Athena a more distinctive editorial lens than the current mainly readability-focused set.
