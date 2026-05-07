/**
 * Design Ontology - Common Schema Types
 *
 * Figma/Framer/Lovable 등 다양한 플랫폼의 디자인 데이터를
 * 공통 스키마로 정규화하여 RAG/규칙 기반 디자인 생성에 사용.
 */

import crypto from "node:crypto";

// ──────────────────────────────────────────
// ID Generator
// ──────────────────────────────────────────

export function generateId(prefix = "ont") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

// ──────────────────────────────────────────
// Entity Factory Functions
// ──────────────────────────────────────────

/**
 * @typedef {'figma'|'framer'|'lovable'|'storybook'|'raw_json'|'unknown'} SourcePlatform
 * @typedef {'page'|'component'|'screen'|'flow'|'token_set'} ArtifactType
 */

/**
 * @param {object} input
 * @returns {{ id: string, sourcePlatform: SourcePlatform, title: string, type: ArtifactType, sourceRef: string, createdAt: string, updatedAt: string }}
 */
export function createDesignArtifact(input) {
  const now = new Date().toISOString();
  return {
    id: input.id ?? generateId("art"),
    sourcePlatform: input.sourcePlatform ?? "unknown",
    title: input.title ?? "Untitled",
    type: input.type ?? "component",
    sourceRef: input.sourceRef ?? "",
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * @typedef {'frame'|'group'|'text'|'image'|'vector'|'component'|'instance'|'section'|'slot'} NodeType
 * @typedef {'header'|'footer'|'sidebar'|'nav'|'hero'|'card'|'button'|'input'|'icon'|'container'|'content'|'unknown'} NodeRole
 * @typedef {{ x: number, y: number, width: number, height: number }} BBox
 */

/**
 * @param {object} input
 * @returns {{ id: string, artifactId: string, nodeType: NodeType, role: NodeRole, parentId: string|null, contentText: string, bbox: BBox|null, styleRefs: string[] }}
 */
export function createVisualNode(input) {
  return {
    id: input.id ?? generateId("vn"),
    artifactId: input.artifactId,
    nodeType: input.nodeType ?? "frame",
    role: input.role ?? "unknown",
    parentId: input.parentId ?? null,
    contentText: input.contentText ?? "",
    bbox: input.bbox ?? null,
    styleRefs: Array.isArray(input.styleRefs) ? input.styleRefs : [],
  };
}

/**
 * @typedef {'color'|'typography'|'spacing'|'radius'|'shadow'|'layout'} TokenCategory
 */

/**
 * @param {object} input
 * @returns {{ id: string, category: TokenCategory, name: string, value: any, source: string, confidence: number }}
 */
export function createStyleToken(input) {
  return {
    id: input.id ?? generateId("st"),
    category: input.category ?? "color",
    name: input.name ?? "",
    value: input.value ?? null,
    source: input.source ?? "",
    confidence: typeof input.confidence === "number" ? Math.min(1, Math.max(0, input.confidence)) : 0.5,
  };
}

/**
 * @param {object} input
 * @returns {{ id: string, targetNodeId: string, ruleType: string, expression: string, severity: string }}
 */
export function createLayoutConstraint(input) {
  return {
    id: input.id ?? generateId("lc"),
    targetNodeId: input.targetNodeId ?? "",
    ruleType: input.ruleType ?? "",
    expression: input.expression ?? "",
    severity: input.severity ?? "warn",
  };
}

/**
 * @param {object} input
 * @returns {{ id: string, sourceNodeId: string, trigger: string, targetNodeId: string, transition: string, params: object }}
 */
export function createInteraction(input) {
  return {
    id: input.id ?? generateId("ix"),
    sourceNodeId: input.sourceNodeId ?? "",
    trigger: input.trigger ?? "click",
    targetNodeId: input.targetNodeId ?? "",
    transition: input.transition ?? "none",
    params: input.params && typeof input.params === "object" ? input.params : {},
  };
}

/**
 * @typedef {'block'|'warn'|'info'} RuleSeverity
 */

/**
 * @param {object} input
 * @returns {{ id: string, ruleType: string, scope: string, expression: string, severity: RuleSeverity, message: string }}
 */
export function createRuleConstraint(input) {
  return {
    id: input.id ?? generateId("rc"),
    ruleType: input.ruleType ?? "",
    scope: input.scope ?? "global",
    expression: input.expression ?? "",
    severity: ["block", "warn", "info"].includes(input.severity) ? input.severity : "warn",
    message: input.message ?? "",
  };
}

/**
 * @param {object} input
 * @returns {{ id: string, prompt: string, retrievedRefs: string[], generatedOutput: any, validationResult: object|null, feedback: object|null, createdAt: string }}
 */
export function createGenerationTrace(input) {
  return {
    id: input.id ?? generateId("gt"),
    prompt: input.prompt ?? "",
    retrievedRefs: Array.isArray(input.retrievedRefs) ? input.retrievedRefs : [],
    generatedOutput: input.generatedOutput ?? null,
    validationResult: input.validationResult ?? null,
    feedback: input.feedback ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

// ──────────────────────────────────────────
// Entity Type Names (for query filtering)
// ──────────────────────────────────────────

export const ENTITY_TYPES = [
  "DesignArtifact",
  "VisualNode",
  "StyleToken",
  "LayoutConstraint",
  "Interaction",
  "RuleConstraint",
  "GenerationTrace",
];
