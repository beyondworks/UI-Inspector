/**
 * Design Validation Engine
 *
 * 디자인 후보 JSON을 규칙 기반으로 검증.
 * 내장 규칙 + 사용자 정의 RuleConstraint 지원.
 * severity='block' 위반 시 생성 단계에서 reject.
 */

import { find as findEntities } from "./store.mjs";

// ──────────────────────────────────────────
// Built-in Rules
// ──────────────────────────────────────────

const BUILTIN_RULES = [
  {
    id: "builtin_contrast",
    ruleType: "contrast",
    scope: "global",
    check: (candidate) => {
      const issues = [];
      const nodes = candidate.nodes ?? candidate.elements ?? [];
      for (const node of nodes) {
        if (node.foreground && node.background) {
          const ratio = computeContrastRatio(node.foreground, node.background);
          if (ratio < 4.5) {
            issues.push({
              ruleId: "builtin_contrast",
              severity: "warn",
              target: node.id ?? node.name ?? "unknown",
              message: `WCAG AA 대비 비율 위반: ${ratio.toFixed(2)}:1 (최소 4.5:1 필요). fg=${node.foreground}, bg=${node.background}`,
              value: ratio,
            });
          }
        }
      }
      return issues;
    },
  },
  {
    id: "builtin_tap_target",
    ruleType: "tap_target",
    scope: "global",
    check: (candidate) => {
      const issues = [];
      const nodes = candidate.nodes ?? candidate.elements ?? [];
      for (const node of nodes) {
        const isInteractive = /button|link|input|checkbox|radio|toggle|switch|tab/i.test(
          node.role ?? node.type ?? node.name ?? ""
        );
        if (isInteractive && node.bbox) {
          const w = node.bbox.width ?? 0;
          const h = node.bbox.height ?? 0;
          if (w < 44 || h < 44) {
            issues.push({
              ruleId: "builtin_tap_target",
              severity: "warn",
              target: node.id ?? node.name ?? "unknown",
              message: `터치 타겟 크기 부족: ${w}x${h}px (최소 44x44px, WCAG 2.5.8)`,
              value: { width: w, height: h },
            });
          }
        }
      }
      return issues;
    },
  },
  {
    id: "builtin_hierarchy",
    ruleType: "hierarchy",
    scope: "global",
    check: (candidate) => {
      const issues = [];
      const tokens = candidate.tokens ?? candidate.styles ?? [];
      const fontSizes = tokens
        .filter((t) => t.category === "typography" && t.value?.fontSize)
        .map((t) => t.value.fontSize)
        .sort((a, b) => b - a);

      if (fontSizes.length >= 2) {
        for (let i = 0; i < fontSizes.length - 1; i++) {
          const ratio = fontSizes[i] / fontSizes[i + 1];
          if (ratio < 1.1) {
            issues.push({
              ruleId: "builtin_hierarchy",
              severity: "info",
              target: "typography_scale",
              message: `타이포그래피 계층 부족: ${fontSizes[i]}px → ${fontSizes[i + 1]}px (비율 ${ratio.toFixed(2)}, 최소 1.2 권장)`,
              value: { sizes: fontSizes },
            });
            break;
          }
        }
      }
      return issues;
    },
  },
  {
    id: "builtin_spacing_consistency",
    ruleType: "spacing",
    scope: "global",
    check: (candidate) => {
      const issues = [];
      const tokens = candidate.tokens ?? candidate.styles ?? [];
      const spacingValues = tokens
        .filter((t) => t.category === "spacing")
        .map((t) => {
          const val = typeof t.value === "number" ? t.value : parseFloat(String(t.value));
          return isNaN(val) ? null : val;
        })
        .filter(Boolean);

      if (spacingValues.length >= 3) {
        // Check if spacing follows a consistent base (4px grid)
        const nonGrid = spacingValues.filter((v) => v % 4 !== 0);
        if (nonGrid.length > spacingValues.length * 0.3) {
          issues.push({
            ruleId: "builtin_spacing_consistency",
            severity: "info",
            target: "spacing_system",
            message: `간격 시스템 불일치: ${nonGrid.length}/${spacingValues.length}개 값이 4px 그리드에 맞지 않음. 위반 값: [${nonGrid.join(", ")}]`,
            value: { offGrid: nonGrid },
          });
        }
      }
      return issues;
    },
  },
];

// ──────────────────────────────────────────
// Main Validation
// ──────────────────────────────────────────

/**
 * Validate a design candidate JSON against rules.
 *
 * @param {object} candidateJson - Design data (nodes, tokens, etc.)
 * @param {object} options
 * @param {string} options.ruleset - 'all'|'contrast'|'tap_target'|'hierarchy'|'spacing' (comma-separated)
 * @param {boolean} options.strictMode - If true, treat 'warn' as 'block'
 * @returns {{ passed: boolean, blockers: object[], warnings: object[], info: object[], summary: string }}
 */
export function validateDesign(candidateJson, options = {}) {
  if (!candidateJson || typeof candidateJson !== "object") {
    return {
      passed: false,
      blockers: [{ ruleId: "input", severity: "block", target: "input", message: "candidateJson이 유효한 객체가 아닙니다" }],
      warnings: [],
      info: [],
      summary: "검증 실패: 입력 데이터 없음",
    };
  }

  const rulesetFilter = options.ruleset
    ? new Set(options.ruleset.split(",").map((s) => s.trim()))
    : null;
  const strictMode = options.strictMode ?? false;

  const allIssues = [];

  // 1. Run built-in rules
  for (const rule of BUILTIN_RULES) {
    if (rulesetFilter && !rulesetFilter.has("all") && !rulesetFilter.has(rule.ruleType)) {
      continue;
    }
    try {
      const issues = rule.check(candidateJson);
      allIssues.push(...issues);
    } catch {
      // Skip broken rule
    }
  }

  // 2. Run user-defined RuleConstraints from store
  const userRules = findEntities("RuleConstraint", () => true);
  for (const rule of userRules) {
    if (rulesetFilter && !rulesetFilter.has("all") && !rulesetFilter.has(rule.ruleType)) {
      continue;
    }
    try {
      const issues = evaluateUserRule(rule, candidateJson);
      allIssues.push(...issues);
    } catch {
      // Skip broken rule
    }
  }

  // 3. Classify
  const blockers = [];
  const warnings = [];
  const info = [];

  for (const issue of allIssues) {
    const effectiveSeverity = strictMode && issue.severity === "warn" ? "block" : issue.severity;
    switch (effectiveSeverity) {
      case "block":
        blockers.push(issue);
        break;
      case "warn":
        warnings.push(issue);
        break;
      default:
        info.push(issue);
    }
  }

  const passed = blockers.length === 0;
  const summary = passed
    ? `검증 통과 (경고 ${warnings.length}건, 정보 ${info.length}건)`
    : `검증 실패: ${blockers.length}건의 차단 위반 발견 (경고 ${warnings.length}건)`;

  return { passed, blockers, warnings, info, summary };
}

// ──────────────────────────────────────────
// User Rule Evaluator
// ──────────────────────────────────────────

/**
 * Evaluate a user-defined RuleConstraint against candidate JSON.
 * Expression format: "field.path operator value"
 * Supported operators: ==, !=, <, >, <=, >=, contains, matches
 */
function evaluateUserRule(rule, candidate) {
  const issues = [];

  try {
    const parts = rule.expression.split(/\s+/);
    if (parts.length < 3) return issues;

    const [fieldPath, operator, ...valueParts] = parts;
    const expectedValue = valueParts.join(" ");

    // Collect target values from candidate
    const targets = resolveFieldPath(candidate, fieldPath, rule.scope);

    for (const { target, actualValue } of targets) {
      const violated = checkOperator(actualValue, operator, expectedValue);
      if (violated) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity,
          target: target,
          message: rule.message || `Rule violation: ${fieldPath} ${operator} ${expectedValue}`,
          value: actualValue,
        });
      }
    }
  } catch {
    // Silently skip malformed rules
  }

  return issues;
}

function resolveFieldPath(candidate, fieldPath, scope) {
  const results = [];
  const items = candidate.nodes ?? candidate.elements ?? [candidate];

  for (const item of items) {
    const value = getNestedValue(item, fieldPath);
    if (value !== undefined) {
      results.push({ target: item.id ?? item.name ?? "unknown", actualValue: value });
    }
  }
  return results;
}

function getNestedValue(obj, path) {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

function checkOperator(actual, operator, expected) {
  const numActual = Number(actual);
  const numExpected = Number(expected);

  switch (operator) {
    case "==": return String(actual) !== expected;
    case "!=": return String(actual) === expected;
    case "<": return !(numActual < numExpected);
    case ">": return !(numActual > numExpected);
    case "<=": return !(numActual <= numExpected);
    case ">=": return !(numActual >= numExpected);
    case "contains": return !String(actual).includes(expected);
    case "matches": {
      try {
        return !new RegExp(expected).test(String(actual));
      } catch {
        return false;
      }
    }
    default: return false;
  }
}

// ──────────────────────────────────────────
// Color Contrast Helper (WCAG)
// ──────────────────────────────────────────

function computeContrastRatio(fg, bg) {
  try {
    const fgLum = relativeLuminance(parseHexColor(fg));
    const bgLum = relativeLuminance(parseHexColor(bg));
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return 21; // Assume pass if can't parse
  }
}

function parseHexColor(hex) {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) / 255,
      g: parseInt(clean[1] + clean[1], 16) / 255,
      b: parseInt(clean[2] + clean[2], 16) / 255,
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
