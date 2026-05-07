#!/usr/bin/env node

/**
 * Design Ontology - Test Samples
 *
 * 3개 테스트 케이스:
 * 1. ingest_design_pack (Figma 샘플)
 * 2. query_ontology (키워드 검색)
 * 3. validate_design (의도적 위반 케이스)
 */

import {
  createDesignArtifact, createVisualNode, createStyleToken,
  createRuleConstraint, createGenerationTrace, ENTITY_TYPES,
} from "./types.mjs";
import {
  upsert, getById, getAll, search, getArtifactGraph,
  saveStore, getStats, clearArtifact,
} from "./store.mjs";
import { normalizeDesignPack } from "./normalizer.mjs";
import { validateDesign } from "./validation-engine.mjs";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

// ──────────────────────────────────────────
// Test 1: ingest_design_pack (Figma sample)
// ──────────────────────────────────────────

console.log("\n=== Test 1: ingest_design_pack (Figma) ===\n");

const figmaPayload = {
  name: "Landing Page v2",
  document: {
    children: [
      {
        name: "Hero Section",
        type: "FRAME",
        absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 600 },
        layoutMode: "VERTICAL",
        itemSpacing: 24,
        paddingLeft: 80,
        children: [
          {
            name: "Headline",
            type: "TEXT",
            characters: "Build Better Products",
            style: {
              fontFamily: "Inter",
              fontSize: 48,
              fontWeight: 700,
              lineHeightPx: 58,
            },
            absoluteBoundingBox: { x: 80, y: 120, width: 600, height: 58 },
          },
          {
            name: "Subheadline",
            type: "TEXT",
            characters: "Design tools for the modern team",
            style: {
              fontFamily: "Inter",
              fontSize: 18,
              fontWeight: 400,
              lineHeightPx: 28,
            },
            absoluteBoundingBox: { x: 80, y: 202, width: 400, height: 28 },
          },
          {
            name: "CTA Button",
            type: "FRAME",
            absoluteBoundingBox: { x: 80, y: 254, width: 200, height: 48 },
            fills: [{ color: { r: 0.231, g: 0.51, b: 0.965 } }],
            children: [
              {
                name: "Button Label",
                type: "TEXT",
                characters: "Get Started Free",
                style: { fontFamily: "Inter", fontSize: 16, fontWeight: 600 },
              },
            ],
          },
        ],
      },
      {
        name: "Features Grid",
        type: "FRAME",
        absoluteBoundingBox: { x: 0, y: 600, width: 1440, height: 400 },
        layoutMode: "HORIZONTAL",
        itemSpacing: 32,
        children: [
          {
            name: "Feature Card 1",
            type: "FRAME",
            absoluteBoundingBox: { x: 80, y: 640, width: 400, height: 300 },
            fills: [{ color: { r: 0.976, g: 0.976, b: 0.98 } }],
          },
          {
            name: "Feature Card 2",
            type: "FRAME",
            absoluteBoundingBox: { x: 520, y: 640, width: 400, height: 300 },
            fills: [{ color: { r: 0.976, g: 0.976, b: 0.98 } }],
          },
        ],
      },
    ],
  },
  styles: {
    "S:primary": { name: "Primary Blue", styleType: "FILL", description: "#3B82F6" },
    "S:body": { name: "Body Text", styleType: "TEXT", description: "Inter 16/24" },
  },
};

const ingestResult = normalizeDesignPack({
  sourcePlatform: "figma",
  rawPayload: figmaPayload,
});

// Store all
upsert("DesignArtifact", ingestResult.artifact);
for (const n of ingestResult.nodes) upsert("VisualNode", n);
for (const t of ingestResult.tokens) upsert("StyleToken", t);
for (const c of ingestResult.constraints) upsert("LayoutConstraint", c);

assert(ingestResult.artifact.sourcePlatform === "figma", "sourcePlatform = figma");
assert(ingestResult.artifact.title === "Landing Page v2", "title = Landing Page v2");
assert(ingestResult.nodes.length >= 6, `nodes >= 6 (got ${ingestResult.nodes.length})`);
assert(ingestResult.tokens.length >= 4, `tokens >= 4 (got ${ingestResult.tokens.length})`);
assert(ingestResult.constraints.length >= 2, `constraints >= 2 (got ${ingestResult.constraints.length})`);

const heroNode = ingestResult.nodes.find((n) => n.contentText === "Build Better Products");
assert(heroNode !== undefined, "Hero headline node found");
assert(heroNode?.nodeType === "text", "Hero node type = text");
assert(heroNode?.role === "content", `Hero role detected (got ${heroNode?.role})`);

const colorToken = ingestResult.tokens.find((t) => t.category === "color");
assert(colorToken !== undefined, "Color token extracted");
assert(colorToken?.confidence >= 0.5, `Color token confidence >= 0.5 (got ${colorToken?.confidence})`);

console.log(`\n  Artifact ID: ${ingestResult.artifact.id}`);
console.log(`  Store: ${JSON.stringify(getStats())}`);

// ──────────────────────────────────────────
// Test 2: query_ontology
// ──────────────────────────────────────────

console.log("\n=== Test 2: query_ontology ===\n");

// Keyword search
const searchResults = search("hero", {});
assert(searchResults.length > 0, `Search 'hero' found results (${searchResults.length})`);

const tokenSearch = search("inter", { entityTypes: ["StyleToken"] });
assert(tokenSearch.length > 0, `Search 'inter' in StyleToken found results (${tokenSearch.length})`);

// Confidence filter
const highConfTokens = search("", { entityTypes: ["StyleToken"], minConfidence: 0.8 });
const lowConfTokens = search("", { entityTypes: ["StyleToken"], minConfidence: 0 });
assert(lowConfTokens.length >= highConfTokens.length, "minConfidence filter works");

// Graph query
const graph = getArtifactGraph(ingestResult.artifact.id);
assert(graph !== null, "Graph retrieved for artifact");
assert(graph?.nodes?.length === ingestResult.nodes.length, `Graph nodes match (${graph?.nodes?.length})`);

// All artifacts
const allArtifacts = getAll("DesignArtifact");
assert(allArtifacts.length >= 1, `At least 1 artifact in store (${allArtifacts.length})`);

console.log(`\n  Search 'hero': ${searchResults.length} results`);
console.log(`  Graph nodes: ${graph?.nodes?.length}, tokens: ${graph?.tokens?.length}`);

// ──────────────────────────────────────────
// Test 3: validate_design (intentional violations)
// ──────────────────────────────────────────

console.log("\n=== Test 3: validate_design (의도적 위반) ===\n");

const badDesign = {
  nodes: [
    {
      id: "btn_tiny",
      name: "Tiny Button",
      role: "button",
      type: "button",
      bbox: { x: 0, y: 0, width: 30, height: 24 },
      foreground: "#777777",
      background: "#999999",
    },
    {
      id: "link_small",
      name: "Small Link",
      role: "link",
      type: "link",
      bbox: { x: 0, y: 40, width: 60, height: 20 },
      foreground: "#ffffff",
      background: "#000000",
    },
    {
      id: "text_normal",
      name: "Body Text",
      role: "content",
      type: "text",
      bbox: { x: 0, y: 80, width: 300, height: 200 },
    },
  ],
  tokens: [
    { category: "typography", name: "heading", value: { fontSize: 24 } },
    { category: "typography", name: "subheading", value: { fontSize: 23 } },
    { category: "typography", name: "body", value: { fontSize: 16 } },
    { category: "spacing", name: "gap-sm", value: 6 },
    { category: "spacing", name: "gap-md", value: 13 },
    { category: "spacing", name: "gap-lg", value: 25 },
  ],
};

// Normal validation
const result = validateDesign(badDesign);
assert(result.passed === true || result.warnings.length > 0, "Validation ran without crash");

const tapIssues = result.warnings.filter((w) => w.ruleId === "builtin_tap_target");
assert(tapIssues.length >= 2, `Tap target violations >= 2 (got ${tapIssues.length})`);

const contrastIssues = result.warnings.filter((w) => w.ruleId === "builtin_contrast");
assert(contrastIssues.length >= 1, `Contrast violations >= 1 (got ${contrastIssues.length})`);

const hierarchyIssues = [...result.warnings, ...result.info].filter((w) => w.ruleId === "builtin_hierarchy");
assert(hierarchyIssues.length >= 1, `Hierarchy issues >= 1 (got ${hierarchyIssues.length})`);

const spacingIssues = [...result.warnings, ...result.info].filter((w) => w.ruleId === "builtin_spacing_consistency");
assert(spacingIssues.length >= 1, `Spacing consistency issues >= 1 (got ${spacingIssues.length})`);

// Strict mode: warn → block
const strictResult = validateDesign(badDesign, { strictMode: true });
assert(strictResult.passed === false, `Strict mode: passed=false (blockers: ${strictResult.blockers.length})`);
assert(strictResult.blockers.length > 0, `Strict mode has blockers`);

// Ruleset filter
const contrastOnly = validateDesign(badDesign, { ruleset: "contrast" });
const tapOnly = validateDesign(badDesign, { ruleset: "tap_target" });
assert(
  contrastOnly.warnings.every((w) => w.ruleId === "builtin_contrast"),
  "Ruleset filter: contrast only"
);
assert(
  tapOnly.warnings.every((w) => w.ruleId === "builtin_tap_target"),
  "Ruleset filter: tap_target only"
);

console.log(`\n  Warnings: ${result.warnings.length}, Info: ${result.info.length}`);
console.log(`  Strict mode blockers: ${strictResult.blockers.length}`);
console.log(`  Summary: ${result.summary}`);

// ──────────────────────────────────────────
// Cleanup test store
// ──────────────────────────────────────────

clearArtifact(ingestResult.artifact.id);

// ──────────────────────────────────────────
// Results
// ──────────────────────────────────────────

console.log(`\n${"=".repeat(40)}`);
console.log(`결과: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
