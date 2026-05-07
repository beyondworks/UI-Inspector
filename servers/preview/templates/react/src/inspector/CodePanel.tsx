import type { ElementInfo } from "./InspectorOverlay";

interface FileNode {
  [name: string]: FileNode | number;
}

export function CodePanel({ fileTree, selectedElement }: { fileTree: FileNode; selectedElement: ElementInfo | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "monospace",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #1e293b",
          padding: "8px",
          maxHeight: "30%",
          overflow: "auto",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Files
        </div>
        <FileTreeView tree={fileTree} />
      </div>
      <div style={{ flex: 1, padding: "8px", overflow: "auto" }}>
        {selectedElement ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Source location */}
            {selectedElement.sourceLocation && (
              <div>
                <SectionLabel>Source</SectionLabel>
                <div style={{ color: "#3b82f6" }}>
                  {selectedElement.sourceLocation.file}:{selectedElement.sourceLocation.line}
                </div>
              </div>
            )}
            {/* UI Term + Design Description */}
            <div>
              <SectionLabel>Design Term</SectionLabel>
              <div style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: "#1e3a5f",
                color: "#60a5fa",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "6px",
              }}>
                {selectedElement.uiTerm}
              </div>
              {selectedElement.uiDescription && (
                <div style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  lineHeight: "1.5",
                  padding: "6px 8px",
                  backgroundColor: "#0c1524",
                  borderRadius: "4px",
                  borderLeft: "2px solid #1e3a5f",
                }}>
                  {selectedElement.uiDescription}
                </div>
              )}
            </div>
            {/* Tag & Classes */}
            <div>
              <SectionLabel>Element</SectionLabel>
              <div style={{ color: "#f472b6" }}>&lt;{selectedElement.tag}&gt;</div>
              {selectedElement.className && (
                <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px", wordBreak: "break-all" }}>
                  {selectedElement.className}
                </div>
              )}
            </div>
            {/* Computed Styles */}
            <div>
              <SectionLabel>Styles</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px", fontSize: "11px" }}>
                {Object.entries(selectedElement.computedStyles)
                  .filter(([, v]) => v && v !== 'normal' && v !== 'static' && v !== 'none' && v !== '0px' && v !== 'auto')
                  .map(([key, value]) => (
                    <div key={key} style={{ display: "contents" }}>
                      <span style={{ color: "#94a3b8" }}>{key.replace(/([A-Z])/g, '-$1').toLowerCase()}</span>
                      <span style={{ color: "#67e8f9" }}>{value}</span>
                    </div>
                  ))}
              </div>
            </div>
            {/* Size */}
            <div>
              <SectionLabel>Size</SectionLabel>
              <div style={{ fontSize: "12px", color: "#a78bfa" }}>
                {Math.round(selectedElement.boundingRect.width)} x {Math.round(selectedElement.boundingRect.height)}px
              </div>
            </div>
            {/* Text content */}
            {selectedElement.textContent && selectedElement.textContent.trim().length > 0 && (
              <div>
                <SectionLabel>Text</SectionLabel>
                <div style={{ fontSize: "11px", color: "#cbd5e1", maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedElement.textContent.slice(0, 100)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "#64748b", textAlign: "center", paddingTop: "20px" }}>
            Preview에서 엘리먼트를 클릭하세요
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: "bold", color: "#94a3b8", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
      {children}
    </div>
  );
}

function FileTreeView({ tree, depth = 0 }: { tree: FileNode; depth?: number }) {
  return (
    <div style={{ paddingLeft: depth * 12 }}>
      {Object.entries(tree).map(([name, value]) => (
        <div key={name}>
          {typeof value === "object" ? (
            <details open={depth < 2}>
              <summary style={{ cursor: "pointer", padding: "2px 0", color: "#93c5fd" }}>
                {name}/
              </summary>
              <FileTreeView tree={value as FileNode} depth={depth + 1} />
            </details>
          ) : (
            <div style={{ padding: "2px 0", color: "#cbd5e1" }}>
              {name}{" "}
              <span style={{ color: "#64748b", fontSize: "11px" }}>{value}B</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}