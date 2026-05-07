import { useState, useEffect } from "react";
import { InspectorOverlay } from "./InspectorOverlay";
import type { ElementInfo } from "./InspectorOverlay";
import { wsClient } from "./ws-client";

export function IframeWrapper({ children }: { children: React.ReactNode }) {
  const [inspectorEnabled, setInspectorEnabled] = useState(false);

  useEffect(() => {
    wsClient.connect();

    // Listen via WS (server broadcast)
    const wsHandler = (data: any) => setInspectorEnabled(!!data?.enabled);
    wsClient.on("inspector_state", wsHandler);

    // Listen via postMessage (direct parent → iframe, more reliable)
    const msgHandler = (e: MessageEvent) => {
      if (e.data?.type === "gemini_inspector_state") {
        setInspectorEnabled(!!e.data.enabled);
      }
    };
    window.addEventListener("message", msgHandler);

    return () => {
      wsClient.off("inspector_state", wsHandler);
      window.removeEventListener("message", msgHandler);
    };
  }, []);

  const handleElementSelected = (el: ElementInfo | null) => {
    if (el) wsClient.send("element_selected", el);
  };

  return (
    <div data-preview-content="">
      {children}
      <InspectorOverlay enabled={inspectorEnabled} onElementSelected={handleElementSelected} />
    </div>
  );
}
