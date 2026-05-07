import fs from "node:fs";
import path from "node:path";

export class AstroConverter {
  get name() { return "astro"; }
  get displayName() { return "Astro"; }

  async convert(sourceDir, workDir) {
    const projectName = path.basename(workDir);

    // 1. Create Astro directory structure
    const pagesDir = path.join(workDir, "src", "pages");
    const componentsDir = path.join(workDir, "src", "components");
    const stylesDir = path.join(workDir, "src", "styles");
    const publicDir = path.join(workDir, "public");
    for (const d of [pagesDir, componentsDir, stylesDir, publicDir]) {
      fs.mkdirSync(d, { recursive: true });
    }

    // 2. Generate astro.config.mjs
    fs.writeFileSync(path.join(workDir, "astro.config.mjs"), this._generateAstroConfig(), "utf8");

    // 3. Copy CSS to src/styles/
    const srcIndexCss = path.join(sourceDir, "src", "index.css");
    const srcGlobalsCss = path.join(sourceDir, "src", "globals.css");
    let hasCss = false;
    if (fs.existsSync(srcIndexCss)) {
      fs.copyFileSync(srcIndexCss, path.join(stylesDir, "global.css"));
      hasCss = true;
    } else if (fs.existsSync(srcGlobalsCss)) {
      fs.copyFileSync(srcGlobalsCss, path.join(stylesDir, "global.css"));
      hasCss = true;
    }

    // 4. Copy React components to src/components/
    const srcComponents = path.join(sourceDir, "src", "components");
    if (fs.existsSync(srcComponents)) {
      this._copyDir(srcComponents, componentsDir);
    }

    // 5. Copy App.tsx to src/components/ for island import
    const srcApp = path.join(sourceDir, "src", "App.tsx");
    const srcAppJsx = path.join(sourceDir, "src", "App.jsx");
    if (fs.existsSync(srcApp)) {
      fs.copyFileSync(srcApp, path.join(componentsDir, "App.tsx"));
    } else if (fs.existsSync(srcAppJsx)) {
      fs.copyFileSync(srcAppJsx, path.join(componentsDir, "App.jsx"));
    }

    // 6. Generate src/pages/index.astro
    fs.writeFileSync(
      path.join(pagesDir, "index.astro"),
      this._generateIndexAstro(hasCss),
      "utf8"
    );

    // 7. Copy public/
    const srcPublic = path.join(sourceDir, "public");
    if (fs.existsSync(srcPublic)) {
      this._copyDir(srcPublic, publicDir);
    }

    // 8. Generate package.json
    fs.writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify(this._generatePackageJson(projectName), null, 2) + "\n",
      "utf8"
    );

    // 9. Generate tsconfig.json
    fs.writeFileSync(
      path.join(workDir, "tsconfig.json"),
      JSON.stringify(this._generateTsConfig(), null, 2) + "\n",
      "utf8"
    );

    // 10. Generate .gitignore
    fs.writeFileSync(
      path.join(workDir, ".gitignore"),
      "node_modules\ndist\n.astro\n.env\n",
      "utf8"
    );
  }

  _generateAstroConfig() {
    return `import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
});
`;
  }

  _generateIndexAstro(hasCss) {
    return `---
import App from "../components/App";
${hasCss ? 'import "../styles/global.css";' : ""}
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gemini Export</title>
  </head>
  <body>
    <App client:load />
  </body>
</html>
`;
  }

  _generatePackageJson(projectName) {
    return {
      name: projectName,
      type: "module",
      version: "0.0.1",
      scripts: {
        dev: "astro dev",
        start: "astro dev",
        build: "astro build",
        preview: "astro preview",
      },
      dependencies: {
        astro: "^5.0.0",
        "@astrojs/react": "^4.0.0",
        "@astrojs/tailwind": "^5.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        tailwindcss: "^3.4.0",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        typescript: "^5.7.0",
      },
    };
  }

  _generateTsConfig() {
    return {
      extends: "astro/tsconfigs/strict",
      compilerOptions: {
        jsx: "react-jsx",
        jsxImportSource: "react",
      },
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
