import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { runAnalyses } from "./analysis/engine";
import { buildVisibleSegments, projectVisibleSegments } from "./analysis/highlights";
import { ANALYSIS_REGISTRY } from "./analysis/registry";
import { buildSummaryHotspots, buildSummarySignals } from "./analysis/summary";
import { ControlRail } from "./components/ControlRail";
import { EditorSurface } from "./components/EditorSurface";
import { Inspector } from "./components/Inspector";
import { Legend } from "./components/Legend";
import { SummaryPanel } from "./components/SummaryPanel";
import { SAMPLE_TEXT } from "./sampleText";
import type {
  AnalysisDefinition,
  AnalysisFamily,
  FocusRequest,
  AnalysisStatus,
  AnalysisTier,
  NormalizedAnalysisResult,
  SummaryHotspot,
} from "./types";

const STORAGE_TEXT_KEY = "devious:text:v2";
const STORAGE_ENABLED_KEY = "devious:enabled:v2";
const ESSENTIAL_IDS = [
  "sentence-length",
  "word-length",
  "flesch-reading-ease",
  "passive-voice",
  "subject-verb-distance",
  "verb-strength",
  "precision-vagueness",
  "hedge-density",
  "certainty-density",
  "repeated-word-proximity",
  "paragraph-length",
];

const REGISTRY_BY_ID = ANALYSIS_REGISTRY.reduce<Record<string, AnalysisDefinition>>(
  (accumulator, definition) => {
    accumulator[definition.id] = definition;
    return accumulator;
  },
  {},
);

function readStoredText(): string {
  return window.localStorage.getItem(STORAGE_TEXT_KEY) ?? SAMPLE_TEXT;
}

function readStoredEnabled(): string[] {
  const raw = window.localStorage.getItem(STORAGE_ENABLED_KEY);
  if (!raw) {
    return ESSENTIAL_IDS;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : ESSENTIAL_IDS;
  } catch {
    return ESSENTIAL_IDS;
  }
}

function replaceTierResults(
  previous: Record<string, NormalizedAnalysisResult>,
  definitions: AnalysisDefinition[],
  next: Record<string, NormalizedAnalysisResult>,
) {
  const merged = { ...previous };
  for (const definition of definitions) {
    delete merged[definition.id];
  }
  return {
    ...merged,
    ...next,
  };
}

function setTierStatuses(
  previous: Record<string, AnalysisStatus>,
  definitions: AnalysisDefinition[],
  status: AnalysisStatus,
) {
  const next = { ...previous };
  for (const definition of definitions) {
    next[definition.id] = status;
  }
  return next;
}

function AthenaLogo() {
  return (
    <svg
      className="athena-logo"
      viewBox="0 0 560 104"
      role="img"
      aria-label="Athena"
    >
      <g transform="translate(0 28)">
        <g
          className="athena-logo__owl"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M36 50V35C36 24 44 16 55 16C66 16 74 24 74 35V50" />
          <path d="M44 24L40 16L48 20" />
          <path d="M66 24L70 16L62 20" />
          <circle cx="49" cy="36" r="3.5" />
          <circle cx="61" cy="36" r="3.5" />
          <path d="M52 44L55 47L58 44" />
        </g>
      </g>
      <text
        x="88"
        y="72"
        className="athena-logo__word"
      >
        ATHENA
      </text>
    </svg>
  );
}

export default function App() {
  const [text, setText] = useState<string>(() => readStoredText());
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(readStoredEnabled()),
  );
  const [results, setResults] = useState<Record<string, NormalizedAnalysisResult>>({});
  const [statuses, setStatuses] = useState<Record<string, AnalysisStatus>>({});
  const [liveResultsText, setLiveResultsText] = useState("");
  const [shortResultsText, setShortResultsText] = useState("");
  const [deepResultsText, setDeepResultsText] = useState("");
  const [committedAnalysis, setCommittedAnalysis] = useState<{
    text: string;
    segments: ReturnType<typeof buildVisibleSegments>;
  }>({
    text,
    segments: [],
  });
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const deferredText = useDeferredValue(text);

  const groupedDefinitions = useMemo(() => {
    const map = new Map<AnalysisFamily, AnalysisDefinition[]>();
    for (const definition of ANALYSIS_REGISTRY) {
      const group = map.get(definition.family) ?? [];
      group.push(definition);
      map.set(definition.family, group);
    }

    return [...map.entries()]
      .map(([family, definitions]) => ({
        family,
        definitions,
      }))
      .sort((left, right) => left.family.localeCompare(right.family));
  }, []);

  const activeDefinitions = useMemo(
    () => ANALYSIS_REGISTRY.filter((definition) => enabledIds.has(definition.id)),
    [enabledIds],
  );

  const liveDefinitions = useMemo(
    () => activeDefinitions.filter((definition) => definition.tier === "live"),
    [activeDefinitions],
  );

  const shortDefinitions = useMemo(
    () => activeDefinitions.filter((definition) => definition.tier === "short"),
    [activeDefinitions],
  );

  const deepDefinitions = useMemo(
    () => activeDefinitions.filter((definition) => definition.tier === "deep"),
    [activeDefinitions],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_TEXT_KEY, text);
  }, [text]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_ENABLED_KEY,
      JSON.stringify([...enabledIds.values()]),
    );
  }, [enabledIds]);

  useEffect(() => {
    const nextResults = runAnalyses(deferredText, liveDefinitions);
    startTransition(() => {
      setResults((previous) => replaceTierResults(previous, liveDefinitions, nextResults));
      setStatuses((previous) => setTierStatuses(previous, liveDefinitions, "ready"));
      setLiveResultsText(deferredText);
    });
  }, [deferredText, liveDefinitions]);

  useEffect(() => {
    setStatuses((previous) => setTierStatuses(previous, shortDefinitions, "loading"));
    const timeout = window.setTimeout(() => {
      const nextResults = runAnalyses(deferredText, shortDefinitions);
      startTransition(() => {
        setResults((previous) =>
          replaceTierResults(previous, shortDefinitions, nextResults),
        );
        setStatuses((previous) => setTierStatuses(previous, shortDefinitions, "ready"));
        setShortResultsText(deferredText);
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [deferredText, shortDefinitions]);

  useEffect(() => {
    setStatuses((previous) => setTierStatuses(previous, deepDefinitions, "loading"));
    const timeout = window.setTimeout(() => {
      const nextResults = runAnalyses(deferredText, deepDefinitions);
      startTransition(() => {
        setResults((previous) =>
          replaceTierResults(previous, deepDefinitions, nextResults),
        );
        setStatuses((previous) => setTierStatuses(previous, deepDefinitions, "ready"));
        setDeepResultsText(deferredText);
      });
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [deferredText, deepDefinitions]);

  const analyzedSegments = useMemo(
    () => buildVisibleSegments(deferredText, enabledIds, REGISTRY_BY_ID, results),
    [deferredText, enabledIds, results],
  );

  const liveReady = liveDefinitions.length === 0 || liveResultsText === deferredText;
  const shortReady = shortDefinitions.length === 0 || shortResultsText === deferredText;
  const deepReady = deepDefinitions.length === 0 || deepResultsText === deferredText;
  const fullyResolved = liveReady && shortReady && deepReady;

  useEffect(() => {
    if (analyzedSegments.length === 0) {
      setCommittedAnalysis({
        text: deferredText,
        segments: [],
      });
      return;
    }

    if (fullyResolved || committedAnalysis.segments.length === 0) {
      setCommittedAnalysis({
        text: deferredText,
        segments: analyzedSegments,
      });
    }
  }, [analyzedSegments, committedAnalysis.segments.length, deferredText, fullyResolved]);

  const visibleSegments = useMemo(
    () =>
      projectVisibleSegments(committedAnalysis.segments, committedAnalysis.text, text),
    [committedAnalysis, text],
  );

  const activeSegment =
    activeSegmentIndex === null ? null : visibleSegments[activeSegmentIndex] ?? null;

  const summarySignals = useMemo(
    () => buildSummarySignals(enabledIds, REGISTRY_BY_ID, results),
    [enabledIds, results],
  );

  const summaryHotspots = useMemo(
    () => buildSummaryHotspots(visibleSegments),
    [visibleSegments],
  );

  function toggleAlgorithm(id: string): void {
    setEnabledIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleFamily(family: AnalysisFamily): void {
    const familyIds = ANALYSIS_REGISTRY.filter(
      (definition) => definition.family === family,
    ).map((definition) => definition.id);

    setEnabledIds((previous) => {
      const next = new Set(previous);
      const allEnabled = familyIds.every((id) => next.has(id));
      for (const id of familyIds) {
        if (allEnabled) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }

  function applyQuickFilter(filter: AnalysisTier | "essential" | "clear"): void {
    if (filter === "clear") {
      setEnabledIds(new Set());
      return;
    }

    if (filter === "essential") {
      setEnabledIds(new Set(ESSENTIAL_IDS));
      return;
    }

    setEnabledIds(
      new Set(
        ANALYSIS_REGISTRY.filter((definition) => definition.tier === filter).map(
          (definition) => definition.id,
        ),
      ),
    );
  }

  function jumpToHotspot(hotspot: SummaryHotspot): void {
    setActiveSegmentIndex(hotspot.segmentIndex);
    setFocusRequest({
      start: hotspot.start,
      end: hotspot.end,
      token: Date.now(),
    });
  }

  return (
    <div className="app-shell">
      <main className="workspace">
        <section className="hero">
          <div className="brand-panel brand-panel--compact">
            <AthenaLogo />
          </div>
        </section>

        <section className="main-grid">
          <div className="editor-column">
            <SummaryPanel
              signals={summarySignals}
              hotspots={summaryHotspots}
              onJumpToHotspot={jumpToHotspot}
            />
            <EditorSurface
              text={text}
              segments={visibleSegments}
              focusRequest={focusRequest}
              onTextChange={setText}
              onActiveSegmentChange={setActiveSegmentIndex}
            />
            <div className="support-grid">
              <Legend />
              <Inspector segment={activeSegment} />
            </div>
          </div>

          <ControlRail
            groups={groupedDefinitions}
            enabledIds={enabledIds}
            statuses={statuses}
            onToggleAlgorithm={toggleAlgorithm}
            onToggleFamily={toggleFamily}
            onQuickFilter={applyQuickFilter}
          />
        </section>
      </main>
    </div>
  );
}
