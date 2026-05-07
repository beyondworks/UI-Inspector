/**
 * Design Knowledge Base
 *
 * 세계적 수준의 UI/UX 디자인 지식을 코드로 인코딩.
 * 출처: ui-ux-pro-max, bencium-controlled-ux-designer, oiloil-ui-ux-guide,
 *       8pt Grid System, WCAG 2.2, Material Design, Apple HIG
 *
 * 이 모듈은 시스템 프롬프트 강화 + validation-engine 규칙 확장에 사용.
 */

// ──────────────────────────────────────────
// 1. Typography System
// ──────────────────────────────────────────

export const TYPOGRAPHY = {
  scales: {
    minorThird:  { ratio: 1.2, label: "Minor Third — 안정적, 보수적" },
    majorThird:  { ratio: 1.25, label: "Major Third — 균형잡힌 기본값" },
    perfectFourth: { ratio: 1.333, label: "Perfect Fourth — 드라마틱" },
    goldenRatio: { ratio: 1.618, label: "Golden Ratio — 극적 대비" },
  },
  baseSize: 16,
  generateScale(ratio = 1.25, base = 16, steps = 9) {
    const labels = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];
    const scale = {};
    for (let i = 0; i < steps; i++) {
      const factor = Math.pow(ratio, i - 2); // base is index 2
      scale[labels[i]] = {
        px: Math.round(base * factor),
        rem: +(base * factor / 16).toFixed(3),
      };
    }
    return scale;
  },
  rules: [
    "Use 2-3 typefaces maximum (display + body + optional mono)",
    "Limit to 3 weights per typeface (Regular 400, Medium 500, Bold 700)",
    "Headlines: prioritize emotion and personality over pure legibility",
    "Body text: prioritize legibility and reading comfort",
    "Line height: 1.5x font size for body (16px text = 24px line-height)",
    "Line length: 45-75 characters optimal (60-70 ideal)",
    "As size increases, tighten tracking (-0.02em to -0.05em)",
    "As size decreases, loosen tracking (+0.01em to +0.03em)",
    "Form inputs: minimum 16px to prevent iOS zoom",
    "Responsive: clamp(2rem, 5vw, 4rem) for fluid typography",
  ],
  pairingLogic: [
    { strategy: "Category contrast", example: "Serif headlines + Sans body", mood: "editorial, trustworthy" },
    { strategy: "Weight contrast", example: "Light display + Bold UI", mood: "dynamic, energetic" },
    { strategy: "Personality contrast", example: "Geometric + Humanist", mood: "modern + warm" },
  ],
};

// ──────────────────────────────────────────
// 2. Spacing & Grid System
// ──────────────────────────────────────────

export const SPACING = {
  baseUnit: 4,
  scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128],
  eightPtGrid: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 128],
  rules: [
    "Base unit: 4px. All spacing values must be multiples of 4",
    "Preferred 8pt grid: 8, 16, 24, 32, 40, 48 for major spacing",
    "Internal spacing ≤ External spacing (padding ≤ margin around element)",
    "Tight spacing within a group, loose between groups (Gestalt proximity)",
    "Same component type = same internal spacing (cards, list rows, form groups)",
    "Use gap property over direct margins on children",
    "Off-scale values need explicit justification",
    "Line-heights must be multiples of 4 (even if font size is not)",
  ],
  componentSpacing: {
    inlineGap: 8,        // icon-to-label, tag-to-tag
    stackGap: 12,        // form fields, card content
    sectionGap: 32,      // between major sections
    pageMargin: { mobile: 16, tablet: 24, desktop: 32, wide: 48 },
    cardPadding: { compact: 12, default: 16, spacious: 24 },
  },
};

// ──────────────────────────────────────────
// 3. Color System
// ──────────────────────────────────────────

export const COLOR = {
  architecture: {
    neutralPalette: "4-5 colors: background, surface, border, text-secondary, text-primary",
    accentPalette: "1-3 colors: primary CTA, warning, error",
    semantic: "success(green), warning(amber), error(red), info(blue)",
  },
  rules: [
    "WCAG AA: minimum 4.5:1 for normal text, 3:1 for large text (18px+ or 14px bold)",
    "WCAG AAA: 7:1 for normal text, 4.5:1 for large text",
    "Never rely on color alone — always add icons or labels",
    "Every color must serve a purpose (hierarchy, function, status, action)",
    "Neutrals: slightly desaturated, warm or cool based on brand intent",
    "Accents: saturated enough for clear contrast against both light/dark backgrounds",
    "Hover: darken by 10-15% or shift hue slightly",
    "Focus: ring/outline in accent color (2px offset)",
    "Disabled: reduce opacity to 40-50%, remove hover effects",
  ],
  antiPatterns: [
    "Don't default to SaaS blue (#3B82F6) without brand justification",
    "Don't use AI purple/pink gradients for banking/finance",
    "Don't use purely decorative gradients — max one per page",
    "Don't mix warm and cool greys in the same neutral palette",
    "Avoid 'almost the same' colors — either identical or clearly distinct",
  ],
  uniqueStrategies: [
    "Unexpected neutrals: warm greys, soft off-whites, deep charcoals",
    "Distinctive accent pairs: terracotta + charcoal, sage + navy, coral + slate",
    "Photography/patterns/textures over solid fills",
    "Test against 'does this look AI-generated?' filter",
  ],
  industryPalettes: {
    saas: { primary: "#3B82F6", neutral: "cool grey", mood: "professional, tech-forward" },
    finance: { primary: "#1E40AF", neutral: "slate", mood: "trustworthy, stable" },
    healthcare: { primary: "#059669", neutral: "warm grey", mood: "calming, reliable" },
    ecommerce: { primary: "#DC2626", neutral: "neutral", mood: "energetic, action-driven" },
    creative: { primary: "#8B5CF6", neutral: "warm", mood: "expressive, innovative" },
    beauty: { primary: "#EC4899", neutral: "blush", mood: "elegant, luxurious" },
  },
};

// ──────────────────────────────────────────
// 4. Layout Principles
// ──────────────────────────────────────────

export const LAYOUT = {
  grid: {
    columns: { mobile: 4, tablet: 8, desktop: 12, wide: 16 },
    gutter: { mobile: 16, tablet: 24, desktop: 24, wide: 32 },
    margin: { mobile: 16, tablet: 32, desktop: 48, wide: 64 },
    maxWidth: 1280,
  },
  goldenRatio: {
    value: 1.618,
    applications: [
      "Content area / sidebar ratio ≈ 1.618:1",
      "Hero image height / width",
      "Typography size stepping",
      "Whitespace proportions between major sections",
    ],
  },
  ruleOfThirds: "Place key elements along 1/3 and 2/3 lines for natural visual flow",
  rules: [
    "Every screen should feel balanced — visual weight + negative space",
    "Generous negative space creates clarity and premium feel",
    "Align to one grid — fix 1-2px drift",
    "Group related elements through proximity, alignment, shared attributes",
    "Guide user attention: one primary CTA per screen/section",
    "No decorative nesting — wrappers must add real function",
    "Content hierarchy: primary → secondary → tertiary layering",
  ],
};

// ──────────────────────────────────────────
// 5. Component System
// ──────────────────────────────────────────

export const COMPONENTS = {
  atomicDesign: {
    atoms: "Buttons, inputs, labels, icons, badges, avatars, dividers",
    molecules: "Search bar, form field (label+input+error), card header, nav item",
    organisms: "Header, sidebar, card grid, form section, data table",
    templates: "Page layouts: dashboard, settings, list-detail, creation flow",
    pages: "Fully composed screens with real data",
  },
  touchTargets: {
    minimum: 44,  // px — WCAG 2.5.8
    recommended: 48,
    rules: [
      "All interactive elements: minimum 44x44px touch target",
      "Buttons: recommended 48px height, 44px minimum",
      "Form inputs: minimum 44px height",
      "Icon buttons: 44x44px minimum including padding",
      "Spacing between touch targets: minimum 8px gap",
    ],
  },
  buttons: {
    hierarchy: ["Primary (solid accent)", "Secondary (border/outline)", "Tertiary (text-only)", "Destructive (red)"],
    sizes: { sm: 32, md: 40, lg: 48 },
    rules: [
      "One primary button per visible area",
      "Semi-Bold (600), 14-16px text",
      "Consistent casing (all-caps OR title case, never mixed)",
      "Min-width: 80px for text buttons",
      "Loading state: spinner replacing text, disabled appearance",
    ],
  },
  forms: {
    rules: [
      "Labels above inputs (not placeholder-only)",
      "Input text: 16px minimum (prevents iOS zoom)",
      "Show constraints before submit (format, units, required)",
      "Inline validation on blur, not on every keystroke",
      "Error messages: actionable (what happened + how to fix)",
      "Group related fields, separate unrelated with spacing",
    ],
  },
};

// ──────────────────────────────────────────
// 6. Motion & Animation
// ──────────────────────────────────────────

export const MOTION = {
  timing: {
    microInteraction: { ms: "100-150", use: "button press, checkbox toggle" },
    stateChange: { ms: "200-300", use: "accordion expand, tab switch" },
    pageTransition: { ms: "300-500", use: "route change, modal open/close" },
    attention: { ms: "200-400", use: "notification, error highlight" },
  },
  easing: {
    entrance: "ease-out (fast start, slow end)",
    exit: "ease-in (slow start, fast end)",
    transition: "ease-in-out (smooth both ends)",
    avoid: "linear (feels robotic) except continuous loops",
  },
  rules: [
    "Every animation must serve a purpose: orient, relate, feedback, or guide",
    "Animations should be felt, not seen (subtle restraint)",
    "Animate only transform and opacity (GPU-accelerated)",
    "Never animate width, height, top, left, margin (causes reflow)",
    "Respect prefers-reduced-motion media query",
    "Under 300ms for interactive feedback",
    "Same component type = same motion pattern (consistency)",
    "Keep canvas/content stable — only panels/overlays can move",
  ],
  physics: {
    lightweight: { duration: 150, elements: "icons, small UI" },
    standard: { duration: 300, elements: "cards, panels" },
    weighty: { duration: 500, elements: "modals, page transitions" },
  },
};

// ──────────────────────────────────────────
// 7. Accessibility (WCAG 2.2)
// ──────────────────────────────────────────

export const ACCESSIBILITY = {
  levels: {
    A: "Basic — absolute minimum for legal compliance",
    AA: "Standard — industry default, recommended baseline",
    AAA: "Enhanced — highest accessibility, specialized audiences",
  },
  checkList: [
    "Color contrast: 4.5:1 (text), 3:1 (large text/UI components)",
    "Touch targets: 44x44px minimum",
    "Keyboard navigation: all interactive elements focusable and operable",
    "Focus indicators: visible, high-contrast (2px+ outline)",
    "Alt text: descriptive for informative images, empty for decorative",
    "ARIA: roles, labels, and states for custom components",
    "Skip navigation link for keyboard users",
    "Error identification: clear, specific, actionable messages",
    "Heading hierarchy: h1 → h2 → h3 (no skipping levels)",
    "Responsive: no horizontal scroll at 320px viewport",
    "Reduced motion: respect prefers-reduced-motion",
    "Color independence: never use color alone to convey info",
  ],
};

// ──────────────────────────────────────────
// 8. UX Principles (Psychology + Laws)
// ──────────────────────────────────────────

export const UX_LAWS = {
  fitts: "Time to target = f(distance, size). Make important targets large and close.",
  hick: "Decision time ∝ number of choices. Reduce choices with defaults, presets, progressive disclosure.",
  miller: "Working memory ≈ 7±2 chunks. Group items, chunk information, limit nav items.",
  jakob: "Users spend most time on OTHER sites. Leverage familiar patterns.",
  doherty: "< 400ms response = flow state. Optimize perceived performance.",
  aesthetic_usability: "Attractive interfaces are perceived as more usable.",
  gestalt: {
    proximity: "Close elements = perceived as related group",
    similarity: "Similar elements = perceived as related",
    continuity: "Eye follows smooth paths",
    closure: "Mind completes incomplete shapes",
    figureGround: "Foreground separates from background",
  },
  CRAP: {
    contrast: "Emphasize the few things that matter (CTA, current state, key numbers)",
    repetition: "Tokens/components/spacing follow a scale; avoid 'almost the same'",
    alignment: "Align to a clear grid; fix 2px drift; align baselines",
    proximity: "Tight within group, loose between groups; spacing is the primary grouping tool",
  },
};

// ──────────────────────────────────────────
// 9. Anti-AI Aesthetic Checklist
// ──────────────────────────────────────────

export const ANTI_AI_CHECKLIST = [
  "Gradient restraint: max one decorative gradient per page. If bg + buttons + borders all use gradients = overuse.",
  "No emoji as UI icons or status indicators — use proper icon set (Lucide, Heroicons, Phosphor).",
  "Copy necessity: if removing text still makes UI understandable via layout/icons/position, remove it.",
  "Decoration justification: every blur/glow/animated entrance must answer 'what does this help understand?'",
  "Avoid 'Claude style' defaults: excessive bauhaus, liquid glass, apple-like without brand reason.",
  "Don't use generic SaaS aesthetics that look machine-generated.",
  "Suggest photography, patterns, textures over solid color fills.",
  "Typography combinations that create contrast, not monotone font stacks.",
  "Unique color pairs that aren't typical AI-generated palettes.",
];

// ──────────────────────────────────────────
// 10. Design Styles Database (Top 20)
// ──────────────────────────────────────────

export const DESIGN_STYLES = [
  { name: "Minimalism", keywords: "clean, spacious, white space, high contrast, grid-based", bestFor: "Enterprise, dashboards, SaaS", complexity: "Low" },
  { name: "Glassmorphism", keywords: "frosted glass, blur, transparency, gradient borders", bestFor: "Modern apps, creative portfolios", complexity: "Medium" },
  { name: "Neumorphism", keywords: "soft shadows, embossed, concave/convex, monochromatic", bestFor: "Niche UI, experimental", complexity: "Medium" },
  { name: "Brutalism", keywords: "raw, unpolished, bold typography, stark contrast", bestFor: "Creative agencies, art, portfolios", complexity: "Low" },
  { name: "Material Design 3", keywords: "elevation, shapes, dynamic color, adaptive layout", bestFor: "Android apps, cross-platform", complexity: "Medium" },
  { name: "Flat Design 2.0", keywords: "subtle shadows, bright colors, clean icons, white space", bestFor: "Mobile apps, consumer products", complexity: "Low" },
  { name: "Dark Mode Premium", keywords: "dark surfaces, luminous accents, subtle gradients", bestFor: "Dev tools, media, fintech", complexity: "Medium" },
  { name: "Bento Grid", keywords: "asymmetric grid, mixed-size cards, visual storytelling", bestFor: "Landing pages, portfolios, dashboards", complexity: "Medium" },
  { name: "Editorial", keywords: "magazine-style, large typography, content-first, whitespace", bestFor: "Blogs, news, content platforms", complexity: "Low" },
  { name: "Retro/Y2K", keywords: "gradients, pixelated, bold neon, chunky UI, nostalgia", bestFor: "Youth brands, gaming, entertainment", complexity: "Medium" },
  { name: "Organic/Biomorphic", keywords: "rounded shapes, natural curves, earth tones, fluid", bestFor: "Wellness, eco brands, health", complexity: "Medium" },
  { name: "Data-Dense Dashboard", keywords: "compact, information-rich, micro-charts, tabular", bestFor: "Analytics, fintech, admin panels", complexity: "High" },
  { name: "Hero-Centric Landing", keywords: "full-bleed hero, single CTA, scroll-driven", bestFor: "Product launches, marketing", complexity: "Low" },
  { name: "Card-Based UI", keywords: "modular cards, scannable, progressive disclosure", bestFor: "E-commerce, social media, feeds", complexity: "Low" },
  { name: "Split Screen", keywords: "50/50 layout, contrast panels, dual content", bestFor: "Comparison pages, sign-up flows", complexity: "Low" },
  { name: "Monospace/Terminal", keywords: "monospace font, command-line aesthetic, developer", bestFor: "Dev tools, documentation, APIs", complexity: "Low" },
  { name: "Luxury/Premium", keywords: "dark, gold accents, serif typography, generous spacing", bestFor: "Fashion, jewelry, premium brands", complexity: "Medium" },
  { name: "Playful/Illustrated", keywords: "custom illustrations, rounded, vibrant, hand-drawn", bestFor: "Education, kids, startup branding", complexity: "High" },
  { name: "SaaS Dashboard", keywords: "sidebar nav, metrics cards, data tables, filters", bestFor: "B2B SaaS, admin panels", complexity: "Medium" },
  { name: "Conversion-Optimized", keywords: "social proof, urgency, clear CTA, trust badges", bestFor: "E-commerce, lead gen, signup", complexity: "Medium" },
];

// ──────────────────────────────────────────
// 11. System Prompt Builder
// ──────────────────────────────────────────

/**
 * Build an enhanced system prompt incorporating all design knowledge.
 * Used by the design_consult, design_review, propose_design, validate_design tools.
 */
export function buildDesignExpertPrompt(focus = "comprehensive") {
  const scale = TYPOGRAPHY.generateScale(1.25);

  return `You are a WORLD-CLASS UI/UX designer with 20+ years of experience at companies like Apple, Airbnb, Stripe, and Linear.

## Core Design Philosophy
1. **Simplicity Through Reduction** — Every element must justify its existence. Begin with complexity, deliberately remove until reaching the simplest effective solution.
2. **Material Honesty** — Digital materials have unique properties. Buttons communicate affordance through color/spacing/typography, not shadows. Cards use borders and background differentiation, not depth effects.
3. **Functional Layering** — Create hierarchy through typography scale, color contrast, and spatial relationships. Reject skeuomorphic depth.
4. **Obsessive Detail** — Consider every pixel. Excellence = hundreds of small intentional decisions.
5. **Invisibility of Technology** — The best interface disappears. Users focus on content and goals, not UI chrome.

## Typography System
- **Scale**: Major Third (1.25x) — ${Object.entries(scale).map(([k, v]) => `${k}: ${v.px}px`).join(", ")}
- **Base**: 16px (1rem)
- ${TYPOGRAPHY.rules.slice(0, 6).join("\n- ")}
- **Pairing**: ${TYPOGRAPHY.pairingLogic.map((p) => `${p.strategy} (${p.mood})`).join(" | ")}

## Spacing & Grid (8pt System)
- **Base unit**: 4px. Major grid: 8px.
- **Scale**: ${SPACING.eightPtGrid.join(", ")}px
- **Grid**: ${JSON.stringify(LAYOUT.grid.columns)} columns. Max-width: ${LAYOUT.grid.maxWidth}px.
- ${SPACING.rules.slice(0, 5).join("\n- ")}

## Color System
- **Architecture**: Neutral palette (4-5) + Accent palette (1-3) + Semantic (success/warning/error/info)
- **WCAG AA**: 4.5:1 normal text, 3:1 large text
- ${COLOR.rules.slice(0, 5).join("\n- ")}
- **Anti-patterns**: ${COLOR.antiPatterns.slice(0, 3).join(" | ")}

## Component Standards
- **Touch targets**: ${COMPONENTS.touchTargets.minimum}px minimum (${COMPONENTS.touchTargets.recommended}px recommended)
- **Button hierarchy**: ${COMPONENTS.buttons.hierarchy.join(" → ")}
- **Atomic Design**: ${COMPONENTS.atomicDesign.atoms} → ${COMPONENTS.atomicDesign.molecules} → organisms → templates → pages

## Motion
- **Micro**: ${MOTION.timing.microInteraction.ms}ms | **State**: ${MOTION.timing.stateChange.ms}ms | **Page**: ${MOTION.timing.pageTransition.ms}ms
- **Easing**: entrance=ease-out, exit=ease-in, transition=ease-in-out
- Animate only transform + opacity. Respect prefers-reduced-motion.

## UX Laws
- **Fitts**: Large + close targets for important actions
- **Hick**: Fewer choices = faster decisions. Use defaults + progressive disclosure.
- **Jakob**: Users expect familiar patterns from other sites
- **CRAP**: Contrast, Repetition, Alignment, Proximity

## Anti-AI Checklist (MANDATORY)
${ANTI_AI_CHECKLIST.map((item, i) => `${i + 1}. ${item}`).join("\n")}

## Visual Hierarchy Rules
- One primary CTA per screen/section
- Make primary task obvious in <3 seconds
- Group by user mental model, not backend fields
- Same interaction = same component + same wording + same placement
- Clickable things must look clickable (hover/focus/cursor)

Output in Korean. Use structured markdown. Reference specific measurements (px, rem, ratios) rather than vague descriptions.`;
}

/**
 * Build a compact design review checklist.
 */
export function buildReviewChecklist() {
  return {
    P0_blockers: [
      "WCAG AA contrast violations (< 4.5:1 for text)",
      "Touch targets under 44px",
      "No keyboard focus indicators",
      "Color-only information encoding",
      "Missing error states or loading states",
    ],
    P1_important: [
      "Typography hierarchy unclear (< 1.2x ratio between levels)",
      "Spacing inconsistency (off 4px grid)",
      "More than one primary CTA visible",
      "Generic AI aesthetic (gradient overuse, emoji as icons)",
      "Missing hover/focus/active states on interactives",
    ],
    P2_polish: [
      "Alignment drift (1-2px misalignment)",
      "Motion timing inconsistency between similar elements",
      "Unnecessary decorative elements",
      "Copy that could be removed without losing meaning",
      "Suboptimal font pairing or weight selection",
    ],
  };
}
