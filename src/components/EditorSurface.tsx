import { type ChangeEvent, useEffect, useMemo, useRef } from "react";
import type { VisibleSegment } from "../types";

type EditorSurfaceProps = {
  text: string;
  segments: VisibleSegment[];
  onTextChange: (value: string) => void;
  onActiveSegmentChange: (index: number | null) => void;
};

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

export function EditorSurface({
  text,
  segments,
  onTextChange,
  onActiveSegmentChange,
}: EditorSurfaceProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

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

  function syncActiveSegment(): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    onActiveSegmentChange(
      findSegmentIndexAtOffset(segments, textarea.selectionStart ?? 0),
    );
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
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

  return (
    <div className="editor-shell">
      <div className="editor-ruler">
        <span>Editor / live paint surface</span>
        <span>{text.length.toLocaleString()} chars</span>
      </div>

      <div className="editor-frame">
        <div ref={backdropRef} className="editor-backdrop" aria-hidden="true">
          <div className="editor-backdrop-copy">
            {visibleSegments.map((segment) => (
              <span
                key={`${segment.start}-${segment.end}-${segment.winnerId ?? "plain"}`}
                className={segment.band === null ? "segment-plain" : `segment band-${segment.band}`}
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
          onSelect={syncActiveSegment}
          onClick={syncActiveSegment}
          onKeyUp={syncActiveSegment}
          onMouseUp={syncActiveSegment}
          onBlur={() => onActiveSegmentChange(null)}
        />
      </div>
    </div>
  );
}
