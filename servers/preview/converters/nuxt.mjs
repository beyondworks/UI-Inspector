import fs from "node:fs";
import path from "node:path";

export class NuxtConverter {
  get name() { return "nuxt"; }
  get displayName() { return "Nuxt 3"; }

  async convert(sourceDir, workDir) {
    const projectName = path.basename(workDir);

    // 1. Create Nuxt directory structure
    const pagesDir = path.join(workDir, "pages");
    const componentsDir = path.join(workDir, "components");
    const assetsDir = path.join(workDir, "assets");
    for (const d of [pagesDir, componentsDir, assetsDir]) {
      fs.mkdirSync(d, { recursive: true });
    }

    // 2. Generate nuxt.config.ts
    fs.writeFileSync(path.join(workDir, "nuxt.config.ts"), this._generateNuxtConfig(), "utf8");

    // 3. Copy CSS to assets/
    const srcIndexCss = path.join(sourceDir, "src", "index.css");
    const srcGlobalsCss = path.join(sourceDir, "src", "globals.css");
    if (fs.existsSync(srcIndexCss)) {
      fs.copyFileSync(srcIndexCss, path.join(assetsDir, "main.css"));
    } else if (fs.existsSync(srcGlobalsCss)) {
      fs.copyFileSync(srcGlobalsCss, path.join(assetsDir, "main.css"));
    }

    // 4. Copy React components as reference (Nuxt uses Vue, manual adaptation needed)
    const srcComponents = path.join(sourceDir, "src", "components");
    if (fs.existsSync(srcComponents)) {
      const refDir = path.join(componentsDir, "react-reference");
      fs.mkdirSync(refDir, { recursive: true });
      this._copyDir(srcComponents, refDir);
    }

    // 5. Copy main component to pages/index.vue (wrapper)
    fs.writeFileSync(path.join(pagesDir, "index.vue"), this._generateIndexPage(), "utf8");

    // 6. Generate app.vue
    const hasCss = fs.existsSync(path.join(assetsDir, "main.css"));
    fs.writeFileSync(path.join(workDir, "app.vue"), this._generateAppVue(hasCss), "utf8");

    // 7. Generate package.json with nuxt deps
    fs.writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify(this._generatePackageJson(projectName), null, 2) + "\n",
      "utf8"
    );

    // 8. Generate tsconfig.json
    fs.writeFileSync(
      path.join(workDir, "tsconfig.json"),
      JSON.stringify({ extends: "./.nuxt/tsconfig.json" }, null, 2) + "\n",
      "utf8"
    );

    // 9. Generate .gitignore
    fs.writeFileSync(
      path.join(workDir, ".gitignore"),
      "node_modules\n.nuxt\n.output\ndist\n.env\n",
      "utf8"
    );

    // 10. Migration note
    fs.writeFileSync(
      path.join(workDir, "MIGRATION.md"),
      `# Nuxt 3 Migration\n\nReact components from your original project are in \`components/react-reference/\`.\nAdapt them to Vue 3 SFCs and place them in \`components/\`.\n\nRun: \`npm install && npm run dev\`\n`,
      "utf8"
    );
  }

  _generateNuxtConfig() {
    return `// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/main.css"],
});
`;
  }

  _generateIndexPage() {
    return `<template>
  <div>
    <h1>Hello from Nuxt 3</h1>
    <p>Adapt your React components from <code>components/react-reference/</code> to Vue SFCs.</p>
  </div>
</template>

<script setup lang="ts">
// Page logic here
</script>
`;
  }

  _generateAppVue(hasCss) {
    return `<template>
  <div>
    <NuxtPage />
  </div>
</template>
`;
  }

  _generatePackageJson(projectName) {
    return {
      name: projectName,
      private: true,
      type: "module",
      scripts: {
        dev: "nuxt dev",
        build: "nuxt build",
        generate: "nuxt generate",
        preview: "nuxt preview",
        postinstall: "nuxt prepare",
      },
      dependencies: {
        nuxt: "^3.14.0",
        vue: "^3.5.0",
        "vue-router": "^4.4.0",
      },
      devDependencies: {
        "@nuxt/devtools": "latest",
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
