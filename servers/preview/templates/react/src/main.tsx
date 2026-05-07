import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
const params = new URLSearchParams(window.location.search);

if (params.get("mode") === "preview-content") {
  // Inside iframe: render app with WS-driven inspector overlay
  import("./inspector/IframeWrapper").then(({ IframeWrapper }) => {
    root.render(
      <IframeWrapper>
        <App />
      </IframeWrapper>
    );
  });
// @ts-ignore - defined by Vite
} else if (typeof __GEMINI_INSPECTOR__ !== "undefined" && __GEMINI_INSPECTOR__) {
  // Parent shell: toolbar + iframe
  import("./inspector/PreviewShell").then(({ PreviewShell }) => {
    root.render(<PreviewShell />);
  });
} else {
  root.render(<App />);
}
