import fs from "node:fs";
import path from "node:path";

export class ViteReactConverter {
  get name() { return "vite-react"; }
  get displayName() { return "Vite + React"; }

  async convert(sourceDir, workDir) {
    const projectName = path.basename(workDir);

    // 1. Copy all source files
    this._copyDir(sourceDir, workDir);

    // 2. Generate clean vite.config.ts (no inspector plugin)
    fs.writeFileSync(
      path.join(workDir, "vite.config.ts"),
      this._generateViteConfig(),
      "utf8"
    );

    // 3. Generate clean main.tsx (no PreviewShell)
    const mainTsxPath = path.join(workDir, "src", "main.tsx");
    const mainJsxPath = path.join(workDir, "src", "main.jsx");
    if (fs.existsSync(mainTsxPath)) {
      fs.writeFileSync(mainTsxPath, this._generateMainTsx(), "utf8");
    } else if (fs.existsSync(mainJsxPath)) {
      fs.writeFileSync(mainJsxPath, this._generateMainTsx(), "utf8");
    } else {
      fs.mkdirSync(path.join(workDir, "src"), { recursive: true });
      fs.writeFileSync(mainTsxPath, this._generateMainTsx(), "utf8");
    }

    // 4. Generate package.json without inspector deps
    fs.writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify(this._generatePackageJson(projectName), null, 2) + "\n",
      "utf8"
    );

    // 5. Copy/generate tsconfig files
    const tsconfig = path.join(sourceDir, "tsconfig.json");
    if (fs.existsSync(tsconfig) && !fs.existsSync(path.join(workDir, "tsconfig.json"))) {
      fs.copyFileSync(tsconfig, path.join(workDir, "tsconfig.json"));
    } else if (!fs.existsSync(path.join(workDir, "tsconfig.json"))) {
      fs.writeFileSync(
        path.join(workDir, "tsconfig.json"),
        JSON.stringify(this._generateTsConfig(), null, 2) + "\n",
        "utf8"
      );
    }

    const tsconfigNode = path.join(sourceDir, "tsconfig.node.json");
    if (fs.existsSync(tsconfigNode)) {
      fs.copyFileSync(tsconfigNode, path.join(workDir, "tsconfig.node.json"));
    }

    // 6. Generate .gitignore
    fs.writeFileSync(
      path.join(workDir, ".gitignore"),
      "node_modules\ndist\n.env.local\n",
      "utf8"
    );
  }

  _generateViteConfig() {
    return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
`;
  }

  _generateMainTsx() {
    return `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;
  }

  _generatePackageJson(projectName) {
    return {
      name: projectName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc -b && vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.0",
        typescript: "^5.7.0",
        vite: "^6.0.0",
        tailwindcss: "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
      },
    };
  }

  _generateTsConfig() {
    return {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ["src"],
    };
  }

  _copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this._copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
