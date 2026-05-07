import { useState, useEffect, useRef } from "react";
import type { ElementInfo } from "./InspectorOverlay";
import { CodePanel } from "./CodePanel";
import { wsClient } from "./ws-client";

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORTS: Record<Viewport, { width: number | null; label: string }> = {
  mobile: { width: 375, label: "Mobile" },
  tablet: { width: 768, label: "Tablet" },
  desktop: { width: null, label: "Desktop" },
};

type ExportStatus = "idle" | "exporting" | "done" | "error";

const FRAMEWORKS = [
  { value: "vite-react", label: "React (Vite)" },
  { value: "nextjs", label: "Next.js" },
  { value: "vite-vue", label: "Vue (Vite)" },
  { value: "nuxt", label: "Nuxt" },
  { value: "astro", label: "Astro" },
  { value: "remix", label: "Remix" },
] as const;

export function PreviewShell() {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportFramework, setExportFramework] = useState("vite-react");
  const [exportPath, setExportPath] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    wsClient.connect();

    // Listen for element selection from iframe's InspectorOverlay
    const onElementSelected = (data: any) => setSelectedElement(data);
    wsClient.on("element_selected", onElementSelected);

    const onComplete = (data: any) => {
      setExportStatus("done");
      setExportResult(data?.export_path || "Exported!");
      setTimeout(() => { setExportStatus("idle"); setExportResult(null); }, 5000);
    };
    const onError = (data: any) => {
      setExportStatus("error");
      setExportResult(data?.error || "Export failed");
      setTimeout(() => { setExportStatus("idle"); setExportResult(null); }, 5000);
    };
    const onStatus = (data: any) => {
      if (data?.status === "exporting") setExportStatus("exporting");
    };
    wsClient.on("export_complete", onComplete);
    wsClient.on("export_error", onError);
    wsClient.on("export_status", onStatus);
    return () => {
      wsClient.off("element_selected", onElementSelected);
      wsClient.off("export_complete", onComplete);
      wsClient.off("export_error", onError);
      wsClient.off("export_status", onStatus);
    };
  }, []);

  const toggleInspector = () => {
    const newState = !inspectorEnabled;
    setInspectorEnabled(newState);
    wsClient.send("inspector_state", { enabled: newState });
    // Notify iframe directly via postMessage (WS broadcast unreliable cross-frame)
    const iframeEl = document.querySelector("iframe") as HTMLIFrameElement | null;
    iframeEl?.contentWindow?.postMessage(
      { type: "gemini_inspector_state", enabled: newState }, "*"
    );
    if (newState) setShowCodePanel(true);
  };

  const handleExport = () => {
    if (exportStatus === "exporting") return;
    setExportStatus("exporting");
    wsClient.send("request_export", {
      framework: exportFramework,
      output_path: exportPath || undefined,
    });
  };

  const exportLabel = exportStatus === "exporting" ? "Exporting..."
    : exportStatus === "done" ? "Exported!"
    : exportStatus === "error" ? "Failed"
    : "Export";

  const vpWidth = VIEWPORTS[viewport].width;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#020617" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px",
        backgroundColor: "#0f172a", borderBottom: "1px solid #1e293b", flexShrink: 0,
      }}>
        <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "14px", marginRight: "16px" }}>
          Gemini Preview
        </span>
        <button onClick={toggleInspector} style={{
          padding: "4px 12px", borderRadius: "4px", border: "1px solid",
          borderColor: inspectorEnabled ? "#3b82f6" : "#334155",
          backgroundColor: inspectorEnabled ? "#1e3a5f" : "transparent",
          color: inspectorEnabled ? "#60a5fa" : "#94a3b8", cursor: "pointer", fontSize: "13px",
        }}>
          Inspector {inspectorEnabled ? "ON" : "OFF"}
        </button>
        {(Object.entries(VIEWPORTS) as [Viewport, { width: number | null; label: string }][]).map(([key, { label }]) => (
          <button key={key} onClick={() => setViewport(key)} style={{
            padding: "4px 12px", borderRadius: "4px", border: "1px solid",
            borderColor: viewport === key ? "#3b82f6" : "#334155",
            backgroundColor: viewport === key ? "#1e3a5f" : "transparent",
            color: viewport === key ? "#60a5fa" : "#94a3b8", cursor: "pointer", fontSize: "13px",
          }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          {exportResult && exportStatus === "done" && (
            <span style={{ color: "#4ade80", fontSize: "11px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {exportResult}
            </span>
          )}
          {exportResult && exportStatus === "error" && (
            <span style={{ color: "#f87171", fontSize: "11px" }}>{exportResult}</span>
          )}
          <input
            type="text"
            value={exportPath}
            onChange={(e) => setExportPath(e.target.value)}
            placeholder="~/Downloads (default)"
            disabled={exportStatus === "exporting"}
            style={{
              padding: "4px 8px", borderRadius: "4px", border: "1px solid #334155",
              backgroundColor: "#0f172a", color: "#e2e8f0", fontSize: "12px",
              width: "180px", outline: "none",
            }}
          />
          <select value={exportFramework} onChange={(e) => setExportFramework(e.target.value)}
            disabled={exportStatus === "exporting"} style={{
              padding: "4px 8px", borderRadius: "4px", border: "1px solid #334155",
              backgroundColor: "#0f172a", color: "#94a3b8", fontSize: "12px", cursor: "pointer", outline: "none",
            }}>
            {FRAMEWORKS.map((fw) => (
              <option key={fw.value} value={fw.value}>{fw.label}</option>
            ))}
          </select>
          <button onClick={handleExport} disabled={exportStatus === "exporting"} style={{
            padding: "4px 12px", borderRadius: "4px", border: "1px solid",
            borderColor: exportStatus === "done" ? "#22c55e" : exportStatus === "error" ? "#ef4444" : "#334155",
            backgroundColor: exportStatus === "exporting" ? "#1e293b" : "transparent",
            color: exportStatus === "done" ? "#4ade80" : exportStatus === "error" ? "#f87171" : "#94a3b8",
            cursor: exportStatus === "exporting" ? "wait" : "pointer", fontSize: "13px",
          }}>
            {exportLabel}
          </button>
          <button onClick={() => setShowCodePanel(!showCodePanel)} style={{
            padding: "4px 12px", borderRadius: "4px", border: "1px solid #334155",
            backgroundColor: showCodePanel ? "#1e3a5f" : "transparent",
            color: showCodePanel ? "#60a5fa" : "#94a3b8", cursor: "pointer", fontSize: "13px",
          }}>
            Code
          </button>
        </div>
      </div>
      {/* Content area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Preview iframe */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "16px", overflow: "auto" }}>
          <iframe
            ref={iframeRef}
            src="/?mode=preview-content"
            style={{
              width: vpWidth ? `${vpWidth}px` : "100%",
              maxWidth: "100%",
              height: "100%",
              border: "none",
              borderRadius: viewport !== "desktop" ? "8px" : "0",
              backgroundColor: "#ffffff",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        {/* Side panel */}
        {showCodePanel && (
          <div style={{ width: "320px", borderLeft: "1px solid #1e293b", flexShrink: 0 }}>
            <CodePanel fileTree={{}} selectedElement={selectedElement} />
          </div>
        )}
      </div>
    </div>
  );
}
