import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(os.tmpdir(), "gemini-preview");

export class ProjectScaffold {
  async create(projectName, framework = "react", initialCode = {}, designTokens = null) {
    const projectDir = path.join(BASE_DIR, projectName);
    const templateDir = path.join(__dirname, "templates", framework);

    if (!fs.existsSync(templateDir)) {
      throw new Error(`Unknown framework: ${framework}. Template not found at ${templateDir}`);
    }

    // 1. Clean existing if any
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // 2. Copy template recursively
    await this.copyTemplate(templateDir, projectDir);

    // 3. Inject initial code files
    if (initialCode && Object.keys(initialCode).length > 0) {
      await this.injectFiles(projectDir, initialCode);
    }

    // 4. Inject design tokens into index.css if provided
    if (designTokens) {
      await this.injectDesignTokens(projectDir, designTokens);
    }

    // 5. npm install (execFileSync with fixed args — no shell injection risk)
    try {
      execFileSync("npm", ["install"], {
        cwd: projectDir,
        timeout: 60000,
        stdio: "pipe",
      });
    } catch (err) {
      throw new Error(`npm install failed: ${err.stderr?.toString() ?? err.message}`);
    }

    // 6. Return result
    const fileTree = await this.buildFileTree(projectDir);
    return { projectDir, fileTree };
  }

  async copyTemplate(templateDir, destDir) {
    const SKIP = new Set(["node_modules", ".git", "package-lock.json"]);
    const entries = fs.readdirSync(templateDir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const srcPath = path.join(templateDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        await this.copyTemplate(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async injectFiles(projectDir, fileMap) {
    for (const [relPath, content] of Object.entries(fileMap)) {
      const absPath = path.join(projectDir, relPath);
      // Prevent path traversal: ensure the resolved path stays inside projectDir
      const resolved = path.resolve(absPath);
      if (!resolved.startsWith(path.resolve(projectDir))) {
        throw new Error(`Path traversal attempt blocked: ${relPath}`);
      }
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, content, "utf8");
    }
  }

  async injectDesignTokens(projectDir, designTokens) {
    const cssPath = path.join(projectDir, "src", "index.css");
    const tokenCss = this._designTokensToCss(designTokens);
    if (fs.existsSync(cssPath)) {
      const existing = fs.readFileSync(cssPath, "utf8");
      fs.writeFileSync(cssPath, tokenCss + "\n" + existing, "utf8");
    } else {
      fs.mkdirSync(path.dirname(cssPath), { recursive: true });
      fs.writeFileSync(cssPath, tokenCss, "utf8");
    }
  }

  _designTokensToCss(tokens) {
    const vars = Object.entries(tokens)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case for CSS custom property names
        const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
        return `  ${cssVar}: ${value};`;
      })
      .join("\n");
    return `:root {\n${vars}\n}`;
  }

  async buildFileTree(dir, _prefix = "") {
    const result = {};
    if (!fs.existsSync(dir)) return result;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result[entry.name] = await this.buildFileTree(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        result[entry.name] = stat.size;
      }
    }
    return result;
  }

  async cleanup(projectDir) {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  }
}
