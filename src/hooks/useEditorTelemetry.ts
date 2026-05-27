import { useRef, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";

interface TelemetryBufferEvent {
  eventType: "NOTE_TYPED";
  timestamp: string;
  payload: any; // Ideally JSON AST Diffs, but we'll use HTML/JSON snapshots for the blueprint
}

interface UseEditorTelemetryOptions {
  drillSessionId: string;
  flushIntervalMs?: number;
}

export function useEditorTelemetry(editor: Editor | null, { drillSessionId, flushIntervalMs = 3000 }: UseEditorTelemetryOptions) {
  const bufferRef = useRef<TelemetryBufferEvent[]>([]);
  const lastSnapshotRef = useRef<string>("");

  const flushBuffer = useCallback(async () => {
    if (bufferRef.current.length === 0) return;

    const eventsToFlush = [...bufferRef.current];
    bufferRef.current = []; // Clear buffer immediately

    try {
      await fetch("/api/drills/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillSessionId,
          events: eventsToFlush,
        }),
      });
    } catch (error) {
      console.error("Failed to flush telemetry events", error);
      // In production, implement retry queueing if offline
    }
  }, [drillSessionId]);

  // Set up flush interval
  useEffect(() => {
    const interval = setInterval(flushBuffer, flushIntervalMs);
    return () => {
      clearInterval(interval);
      flushBuffer(); // Flush remaining on unmount
    };
  }, [flushBuffer, flushIntervalMs]);

  // Hook into TipTap's onUpdate to capture changes
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const currentJSON = editor.getJSON();
      const currentJSONString = JSON.stringify(currentJSON);

      // Deep equality check optimization: only push if content actually changed
      if (currentJSONString !== lastSnapshotRef.current) {
        lastSnapshotRef.current = currentJSONString;
        
        bufferRef.current.push({
          eventType: "NOTE_TYPED",
          timestamp: new Date().toISOString(),
          // For true operational transforms (Yjs), you'd send delta steps.
          // For simplicity in this schema, we send the AST snapshot.
          payload: currentJSON, 
        });
      }
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  return { flushBuffer };
}
