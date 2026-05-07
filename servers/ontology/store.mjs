/**
 * Design Ontology Store
 *
 * 인메모리 저장소 + JSON 파일 영속화.
 * 토큰 저장소와 동일한 ~/.gemini-design-agent/ 경로 사용.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const STORE_DIR = path.join(os.homedir(), ".gemini-design-agent");
const STORE_PATH = path.join(STORE_DIR, "ontology-store.json");

// ──────────────────────────────────────────
// In-Memory Store
// ──────────────────────────────────────────

const store = {
  artifacts: new Map(),
  visualNodes: new Map(),
  styleTokens: new Map(),
  layoutConstraints: new Map(),
  interactions: new Map(),
  ruleConstraints: new Map(),
  generationTraces: new Map(),
};

/** Entity type → Map name mapping */
const TYPE_MAP = {
  DesignArtifact: "artifacts",
  VisualNode: "visualNodes",
  StyleToken: "styleTokens",
  LayoutConstraint: "layoutConstraints",
  Interaction: "interactions",
  RuleConstraint: "ruleConstraints",
  GenerationTrace: "generationTraces",
};

// ──────────────────────────────────────────
// Persistence
// ──────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true, mode: 0o700 });
  }
}

export function saveStore() {
  ensureDir();
  const serializable = {};
  for (const [key, map] of Object.entries(store)) {
    serializable[key] = Object.fromEntries(map);
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(serializable, null, 2), { mode: 0o600 });
}

export function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return;
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    for (const [key, obj] of Object.entries(raw)) {
      if (store[key] && typeof obj === "object" && obj !== null) {
        store[key] = new Map(Object.entries(obj));
      }
    }
  } catch {
    // corrupt file — start fresh
  }
}

// Initialize on import
loadStore();

// ──────────────────────────────────────────
// CRUD Operations
// ──────────────────────────────────────────

/**
 * Upsert an entity. If entity.id already exists, overwrite.
 * @param {string} entityType - One of TYPE_MAP keys
 * @param {object} entity - Must have .id
 */
export function upsert(entityType, entity) {
  const mapName = TYPE_MAP[entityType];
  if (!mapName) throw new Error(`Unknown entity type: ${entityType}`);
  if (!entity?.id) throw new Error("Entity must have an id");
  store[mapName].set(entity.id, entity);
}

/**
 * Get entity by id.
 * @param {string} entityType
 * @param {string} id
 * @returns {object|undefined}
 */
export function getById(entityType, id) {
  const mapName = TYPE_MAP[entityType];
  if (!mapName) return undefined;
  return store[mapName].get(id);
}

/**
 * Get all entities of a type.
 * @param {string} entityType
 * @returns {object[]}
 */
export function getAll(entityType) {
  const mapName = TYPE_MAP[entityType];
  if (!mapName) return [];
  return Array.from(store[mapName].values());
}

/**
 * Delete entity by id.
 * @param {string} entityType
 * @param {string} id
 * @returns {boolean}
 */
export function deleteById(entityType, id) {
  const mapName = TYPE_MAP[entityType];
  if (!mapName) return false;
  return store[mapName].delete(id);
}

/**
 * Find entities matching a predicate.
 * @param {string} entityType
 * @param {(entity: object) => boolean} predicate
 * @returns {object[]}
 */
export function find(entityType, predicate) {
  return getAll(entityType).filter(predicate);
}

/**
 * Get all entities linked to a specific artifact.
 * Returns nodes, tokens (via nodes), constraints, interactions.
 * @param {string} artifactId
 * @returns {object}
 */
export function getArtifactGraph(artifactId) {
  const artifact = getById("DesignArtifact", artifactId);
  if (!artifact) return null;

  const nodes = find("VisualNode", (n) => n.artifactId === artifactId);
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Collect all styleRefs from nodes
  const tokenIds = new Set();
  for (const node of nodes) {
    for (const ref of node.styleRefs) {
      tokenIds.add(ref);
    }
  }

  const tokens = find("StyleToken", (t) => tokenIds.has(t.id));
  const constraints = find("LayoutConstraint", (c) => nodeIds.has(c.targetNodeId));
  const interactions = find("Interaction", (i) => nodeIds.has(i.sourceNodeId) || nodeIds.has(i.targetNodeId));

  return { artifact, nodes, tokens, constraints, interactions };
}

/**
 * Keyword search across entities.
 * Searches in text fields (title, name, contentText, message, prompt, expression).
 * @param {string} query - Search keyword
 * @param {object} options
 * @param {string[]} options.entityTypes - Filter by entity types
 * @param {number} options.limit - Max results
 * @param {number} options.minConfidence - Min confidence for StyleToken
 * @returns {object[]}
 */
export function search(query, options = {}) {
  const q = (query ?? "").toLowerCase();
  if (!q) return [];

  const types = options.entityTypes ?? Object.keys(TYPE_MAP);
  const limit = options.limit ?? 50;
  const minConfidence = options.minConfidence ?? 0;

  const results = [];

  for (const type of types) {
    if (!TYPE_MAP[type]) continue;

    const entities = getAll(type);
    for (const e of entities) {
      if (type === "StyleToken" && typeof e.confidence === "number" && e.confidence < minConfidence) {
        continue;
      }

      const searchableText = buildSearchableText(type, e);
      if (searchableText.includes(q)) {
        results.push({ entityType: type, entity: e });
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}

function buildSearchableText(type, entity) {
  const parts = [];
  switch (type) {
    case "DesignArtifact":
      parts.push(entity.title, entity.sourcePlatform, entity.type, entity.sourceRef);
      break;
    case "VisualNode":
      parts.push(entity.contentText, entity.nodeType, entity.role);
      break;
    case "StyleToken":
      parts.push(entity.name, entity.category, entity.source, String(entity.value ?? ""));
      break;
    case "LayoutConstraint":
      parts.push(entity.ruleType, entity.expression);
      break;
    case "Interaction":
      parts.push(entity.trigger, entity.transition);
      break;
    case "RuleConstraint":
      parts.push(entity.ruleType, entity.scope, entity.expression, entity.message);
      break;
    case "GenerationTrace":
      parts.push(entity.prompt);
      break;
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/**
 * Get store statistics.
 * @returns {object}
 */
export function getStats() {
  const stats = {};
  for (const [key, map] of Object.entries(store)) {
    stats[key] = map.size;
  }
  stats.totalEntities = Object.values(stats).reduce((a, b) => a + b, 0);
  return stats;
}

/**
 * Clear all data for a specific artifact (cascade delete).
 * @param {string} artifactId
 */
export function clearArtifact(artifactId) {
  const graph = getArtifactGraph(artifactId);
  if (!graph) return;

  deleteById("DesignArtifact", artifactId);
  for (const n of graph.nodes) deleteById("VisualNode", n.id);
  for (const t of graph.tokens) deleteById("StyleToken", t.id);
  for (const c of graph.constraints) deleteById("LayoutConstraint", c.id);
  for (const i of graph.interactions) deleteById("Interaction", i.id);
}
