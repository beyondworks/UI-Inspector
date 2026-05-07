import fs from "node:fs";
import path from "node:path";

export class ViteVueConverter {
  get name() { return "vite-vue"; }
  get displayName() { return "Vite + Vue 3"; }

  async convert(sourceDir, workDir) {
    const projectName = path.basename(workDir);

    // Note: Does NOT convert React to Vue. Creates Vue project structure
    // and copies React files into src/react-reference/ for user adaptation.

    // 1. Create Vue project structure
    const srcDir = path.join(workDir, "src");
    const componentsDir = path.join(srcDir, "components");
    const assetsDir = path.join(srcDir, "assets");
    const refDir = path.join(srcDir, "react-reference");
    for (const d of [srcDir, componentsDir, assetsDir, refDir]) {
      fs.mkdirSync(d, { recursive: true });
    }

    // 2. Copy React components as reference
    const srcComponents = path.join(sourceDir, "src", "components");
    if (fs.existsSync(srcComponents)) {
      this._copyDir(srcComponents, refDir);
    }
    const srcApp = path.join(sourceDir, "src", "App.tsx");
    const srcAppJsx = path.join(sourceDir, "src", "App.jsx");
    if (fs.existsSync(srcApp)) {
      fs.copyFileSync(srcApp, path.join(refDir, "App.tsx"));
    } else if (fs.existsSync(srcAppJsx)) {
      fs.copyFileSync(srcAppJsx, path.join(refDir, "App.jsx"));
    }

    // Copy CSS to assets
    const srcIndexCss = path.join(sourceDir, "src", "index.css");
    if (fs.existsSync(srcIndexCss)) {
      fs.copyFileSync(srcIndexCss, path.join(assetsDir, "main.css"));
    }

    // 3. Generate vite.config.ts with @vitejs/plugin-vue
    fs.writeFileSync(path.join(workDir, "vite.config.ts"), this._generateViteConfig(), "utf8");

    // 4. Generate main.ts with createApp
    fs.writeFileSync(path.join(srcDir, "main.ts"), this._generateMainTs(), "utf8");

    // 5. Generate App.vue wrapper
    fs.writeFileSync(path.join(srcDir, "App.vue"), this._generateAppVue(), "utf8");

    // 6. Generate index.html
    fs.writeFileSync(path.join(workDir, "index.html"), this._generateIndexHtml(projectName), "utf8");

    // 7. Generate tsconfig.json
    fs.writeFileSync(
      path.join(workDir, "tsconfig.json"),
      JSON.stringify(this._generateTsConfig(), null, 2) + "\n",
      "utf8"
    );

    // 8. Generate package.json with vue deps
    fs.writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify(this._generatePackageJson(projectName), null, 2) + "\n",
      "utf8"
    );

    // 9. Generate .gitignore
    fs.writeFileSync(
      path.join(workDir, ".gitignore"),
      "node_modules\ndist\n.env.local\n",
      "utf8"
    );

    // 10. Generate README note
    fs.writeFileSync(
      path.join(workDir, "MIGRATION.md"),
      `# Vue 3 Migration\n\nReact components from your original project are in \`src/react-reference/\`.\nAdapt them to Vue 3 Single File Components (SFCs) and place them in \`src/components/\`.\n\nRun: \`npm install && npm run dev\`\n`,
      "utf8"
    );
  }

  _generateViteConfig() {
    return `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
});
`;
  }

  _generateMainTs() {
    return `import { createApp } from "vue";
import "./assets/main.css";
import App from "./App.vue";

createApp(App).mount("#app");
`;
  }

  _generateAppVue() {
    return `<template>
  <div id="app">
    <h1>Hello from Vue 3</h1>
    <p>Adapt your React components from <code>src/react-reference/</code> to Vue SFCs.</p>
  </div>
</template>

<script setup lang="ts">
// Your components go here
</script>

<style scoped>
#app {
  font-family: sans-serif;
  padding: 2rem;
}
</style>
`;
  }

  _generateIndexHtml(projectName) {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
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
        build: "vue-tsc -b && vite build",
        preview: "vite preview",
      },
      dependencies: {
        vue: "^3.5.0",
      },
      devDependencies: {
        "@vitejs/plugin-vue": "^5.0.0",
        "vue-tsc": "^2.0.0",
        typescript: "^5.7.0",
        vite: "^6.0.0",
      },
    };
  }

  _generateTsConfig() {
    return {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        module: "ESNext",
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "preserve",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
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
