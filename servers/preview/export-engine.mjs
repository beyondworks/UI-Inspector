import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import archiver from "archiver";
import { createWriteStream } from "node:fs";

export class ExportEngine {
  constructor() {
    this.converters = new Map();
  }

  registerConverter(name, converter) {
    this.converters.set(name, converter);
  }

  async export(projectDir, targetFramework = "vite-react", outputPath = null) {
    // 1. Validate session project exists
    if (!fs.existsSync(projectDir)) {
      throw new Error(`Project directory not found: ${projectDir}`);
    }

    const converter = this.converters.get(targetFramework);
    if (!converter) {
      throw new Error(
        `Unknown target framework: ${targetFramework}. Available: ${[...this.converters.keys()].join(", ")}`
      );
    }

    const projectName = path.basename(projectDir);
    const exportName = `${projectName}-${targetFramework}`;

    // 2. Create temp work directory
    const tempBase = path.join(os.tmpdir(), "gemini-export");
    fs.mkdirSync(tempBase, { recursive: true });
    const workDir = path.join(tempBase, exportName);
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
    fs.mkdirSync(workDir, { recursive: true });

    try {
      // 3. Copy user source files (skip node_modules, .git, src/inspector/)
      const sourceDir = path.join(workDir, "source");
      fs.mkdirSync(sourceDir, { recursive: true });
      await this._copyUserFiles(projectDir, sourceDir);

      // 4. Strip inspector imports from copied files
      await this._stripInspectorImports(sourceDir);

      // 5. Run converter
      const convertedDir = path.join(workDir, exportName);
      fs.mkdirSync(convertedDir, { recursive: true });
      await converter.convert(sourceDir, convertedDir);

      // 6. Count files
      const files = this._listAllFiles(convertedDir);

      // 7. Generate ZIP
      if (!outputPath) {
        outputPath = path.join(
          os.homedir(),
          "Downloads",
          `${exportName}.zip`
        );
      }
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const sizeBytes = await this._createZip(convertedDir, outputPath);

      // 8. Build file tree
      const structure = await this._buildFileTree(convertedDir);

      return {
        export_path: outputPath,
        framework: targetFramework,
        files_count: files.length,
        size_bytes: sizeBytes,
        structure,
        next_steps: `cd "${path.basename(convertedDir)}" && npm install && npm run dev`,
      };
    } finally {
      // 7. Clean temp dir
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }

  async _copyUserFiles(srcDir, destDir) {
    const SKIP_DIRS = new Set(["node_modules", ".git"]);

    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;

          // Skip src/inspector/
          const relToSrc = path.relative(srcDir, srcPath);
          if (relToSrc === path.join("src", "inspector") || relToSrc.startsWith(path.join("src", "inspector") + path.sep)) {
            continue;
          }

          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
          // Skip inspector files by name pattern
          if (entry.name.endsWith(".inspector.tsx") || entry.name.endsWith(".inspector.ts")) {
            continue;
          }
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(srcDir, destDir);
  }

  async _stripInspectorImports(dir) {
    const INSPECTOR_IMPORT_RE = /^import\s+.*from\s+["'].*\/inspector\/[^"']*["'];?\s*$/gm;
    const INSPECTOR_BLOCK_RE = /if\s*\(\s*(?:window\.__GEMINI_INSPECTOR__|typeof\s+__GEMINI_INSPECTOR__[^)]*)\s*\)[^}]*\}/gs;

    const processFile = (filePath) => {
      const ext = path.extname(filePath);
      if (![".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) return;

      let content = fs.readFileSync(filePath, "utf8");
      let modified = false;

      // Remove inspector imports
      const stripped = content.replace(INSPECTOR_IMPORT_RE, "");
      if (stripped !== content) {
        content = stripped;
        modified = true;
      }

      // Remove __GEMINI_INSPECTOR__ checks
      const stripped2 = content.replace(INSPECTOR_BLOCK_RE, "");
      if (stripped2 !== content) {
        content = stripped2;
        modified = true;
      }

      // Clean up main.tsx: remove PreviewShell wrapper if present
      if (path.basename(filePath) === "main.tsx" || path.basename(filePath) === "main.jsx") {
        const cleaned = content
          .replace(/import\s+\{[^}]*PreviewShell[^}]*\}\s+from\s+["'][^"']*["'];?\n?/g, "")
          .replace(/<PreviewShell[^>]*>([\s\S]*?)<\/PreviewShell>/g, "$1")
          .replace(/<PreviewShell[^/]*(\/\s*>)/g, "");
        if (cleaned !== content) {
          content = cleaned;
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, "utf8");
      }
    };

    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          processFile(full);
        }
      }
    };
    walk(dir);
  }

  async _createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve(archive.pointer()));
      archive.on("error", (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, path.basename(sourceDir));
      archive.finalize();
    });
  }

  async _buildFileTree(dir, relativeTo = dir) {
    const tree = {};
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        tree[entry.name] = await this._buildFileTree(full, relativeTo);
      } else {
        tree[entry.name] = path.relative(relativeTo, full);
      }
    }
    return tree;
  }

  _listAllFiles(dir) {
    const results = [];
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          results.push(full);
        }
      }
    };
    walk(dir);
    return results;
  }
}
