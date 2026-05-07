import fs from "node:fs";
import path from "node:path";

export class RemixConverter {
  get name() { return "remix"; }
  get displayName() { return "Remix"; }

  async convert(sourceDir, workDir) {
    const projectName = path.basename(workDir);

    // 1. Create Remix directory structure
    const appDir = path.join(workDir, "app");
    const routesDir = path.join(appDir, "routes");
    const componentsDir = path.join(appDir, "components");
    const stylesDir = path.join(appDir, "styles");
    const publicDir = path.join(workDir, "public");
    for (const d of [appDir, routesDir, componentsDir, stylesDir, publicDir]) {
      fs.mkdirSync(d, { recursive: true });
    }

    // 2. Copy CSS to app/styles/
    const srcIndexCss = path.join(sourceDir, "src", "index.css");
    const srcGlobalsCss = path.join(sourceDir, "src", "globals.css");
    let cssFile = null;
    if (fs.existsSync(srcIndexCss)) {
      fs.copyFileSync(srcIndexCss, path.join(stylesDir, "global.css"));
      cssFile = "~/styles/global.css";
    } else if (fs.existsSync(srcGlobalsCss)) {
      fs.copyFileSync(srcGlobalsCss, path.join(stylesDir, "global.css"));
      cssFile = "~/styles/global.css";
    }

    // 3. Copy React components to app/components/
    const srcComponents = path.join(sourceDir, "src", "components");
    if (fs.existsSync(srcComponents)) {
      this._copyDir(srcComponents, componentsDir);
    }

    // 4. Copy App.tsx to app/components/
    const srcApp = path.join(sourceDir, "src", "App.tsx");
    const srcAppJsx = path.join(sourceDir, "src", "App.jsx");
    const appExt = fs.existsSync(srcApp) ? "tsx" : fs.existsSync(srcAppJsx) ? "jsx" : null;
    if (appExt === "tsx") {
      fs.copyFileSync(srcApp, path.join(componentsDir, "App.tsx"));
    } else if (appExt === "jsx") {
      fs.copyFileSync(srcAppJsx, path.join(componentsDir, "App.jsx"));
    }

    // 5. Generate app/root.tsx
    fs.writeFileSync(path.join(appDir, "root.tsx"), this._generateRoot(cssFile), "utf8");

    // 6. Generate app/routes/_index.tsx
    fs.writeFileSync(
      path.join(routesDir, "_index.tsx"),
      this._generateIndexRoute(appExt),
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

    // 10. Generate vite.config.ts (Remix uses Vite)
    fs.writeFileSync(path.join(workDir, "vite.config.ts"), this._generateViteConfig(), "utf8");

    // 11. Generate .gitignore
    fs.writeFileSync(
      path.join(workDir, ".gitignore"),
      "node_modules\nbuild\n.cache\n.env\n",
      "utf8"
    );
  }

  _generateRoot(cssFile) {
    return `import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
${cssFile ? `import type { LinksFunction } from "@remix-run/node";\nimport stylesheet from "${cssFile}";\n\nexport const links: LinksFunction = () => [\n  { rel: "stylesheet", href: stylesheet },\n];\n` : ""}
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
`;
  }

  _generateIndexRoute(appExt) {
    const importPath = appExt ? `~/components/App` : null;
    if (importPath) {
      return `import App from "${importPath}";\n\nexport default function Index() {\n  return <App />;\n}\n`;
    }
    return `export default function Index() {\n  return (\n    <div>\n      <h1>Hello from Remix</h1>\n    </div>\n  );\n}\n`;
  }

  _generatePackageJson(projectName) {
    return {
      name: projectName,
      private: true,
      type: "module",
      sideEffects: false,
      scripts: {
        dev: "remix vite:dev",
        build: "remix vite:build",
        start: "remix-serve ./build/server/index.js",
        typecheck: "tsc",
      },
      dependencies: {
        "@remix-run/node": "^2.15.0",
        "@remix-run/react": "^2.15.0",
        "@remix-run/serve": "^2.15.0",
        "isbot": "^4.4.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@remix-run/dev": "^2.15.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        typescript: "^5.7.0",
        vite: "^6.0.0",
        tailwindcss: "^3.4.0",
      },
    };
  }

  _generateTsConfig() {
    return {
      include: ["env.d.ts", "**/*.ts", "**/*.tsx"],
      compilerOptions: {
        lib: ["DOM", "DOM.Iterable", "ES2022"],
        isolatedModules: true,
        esModuleInterop: true,
        jsx: "react-jsx",
        module: "ESNext",
        moduleResolution: "Bundler",
        resolveJsonModule: true,
        target: "ES2022",
        strict: true,
        allowJs: true,
        skipLibCheck: true,
        baseUrl: ".",
        paths: { "~/*": ["./app/*"] },
      },
    };
  }

  _generateViteConfig() {
    return `import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
  ],
});
`;
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
