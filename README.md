# UI Inspector

Live preview + element inspector MCP server for Claude Code. Click any DOM element in a running preview and Claude instantly sees the **exact element name** (component, id, aria-label, …), code location, computed styles, parent chain, and UI/UX terminology — then edits the file directly.

No external LLM calls. All reasoning happens in Claude itself.

## Install

```bash
cd servers
npm install
```

Register the MCP server in `~/.claude.json` (replace `</path/to>` with your absolute checkout path):

```json
"ui-inspector": {
  "type": "stdio",
  "command": "node",
  "args": ["</path/to>/ui-inspector/servers/inspector-server.mjs"]
}
```

Restart Claude Code.

## Tools (18)

### Preview (8)
- `preview_start` — new Vite session (react / vue / vanilla template)
- `preview_attach` — attach to an existing Next.js/Vite/etc. dev server via inject proxy
- `preview_update` — write/delete files and trigger Vite HMR
- `preview_status`
- `preview_stop`
- `preview_export` — convert to target framework + zip
- `preview_screenshot` — capture viewport or single selector (mobile / tablet / desktop / full)
- `preview_errors` — runtime errors captured from the page (uncaught errors, unhandled rejections, `console.error`)

### Inspector (4)
- `preview_select_element` — enable/disable inspector mode or fetch selection (session-scoped)
- `inspector_get_selection` — most recent click across all sessions; called when the user says "this", "here", "the selected one"
- `inspector_clear_selection`
- `inspector_highlight` — agent → browser visual pointing: flash-highlight an element by CSS selector or `data-at` value, with optional label ("여기 수정했어요")

### Annotations (4) — Agentation-style multi-annotation
- `annotation_list` — all annotations (pins + comments) left by the user in the browser, with full element context
- `annotation_resolve` — mark annotations resolved (pins turn green live in the browser) with an optional note; `reopen: true` to undo
- `annotation_remove` — delete annotations (ids or all)
- `annotation_to_prompt` — convert annotations into an agent-ready markdown task list (same format as the in-browser **Copy Prompt** button — paste into Claude Code, Codex, or any coding agent)

### Knowledge (2)
- `query_ontology` — local design knowledge store
- `validate_design` — contrast / tap target / hierarchy / spacing rules

## Annotations — Agentation-style workflow

The injected toolbar (bottom-right) is a monochrome capsule cluster: a **◉ brand circle** (click = exit all modes), a mode capsule with **Inspect | Annotate | 정리 ▾**, and a **Copy Prompt (open/total)** CTA capsule that inverts on hover. Press **ESC** any time to exit Inspect/Annotate mode (it first closes an open dialog, pin popup, or menu). The side panel renders as white ticket cards (mono type, red accent) on a near-black ground, and slides the toolbar out of its way.

1. Toggle **Annotate** and click any element — a comment dialog opens (⌘+Enter to save)
2. A numbered amber pin appears. Add as many annotations as you want — **multiple pins on the same element are supported** (they stack side-by-side)
3. **Drag to batch-select**: in Annotate mode, drag a marquee over a region — every top-level element fully inside it gets selected (if the selection collapses to a single wrapper, it descends into its children), then one comment creates a **group annotation** (one pin, up to 30 elements). The pin popup shows a "요소 N개" chip and outlines every member; the agent receives per-element selectors and source locations
4. Click a pin to edit the comment, resolve/reopen, or delete it
5. Ask the agent to apply them: it calls `annotation_list`, edits the files, then calls `annotation_resolve` per item — the pin turns into a green ✓ in real time, with the agent's resolution note in the pin popup
6. Annotations live on the server, so they survive page reloads, navigation, and HMR. Pins re-anchor via `data-at` → CSS path → selector
7. **Pins are page-scoped**: each pin only renders on the page (pathname) where it was created — navigating elsewhere hides it, coming back restores it. SPA route changes (pushState) are detected without a reload. The toolbar count and **Copy Prompt** cover the current page; `annotation_list` / `annotation_to_prompt` still return every page (each item carries its `pageUrl`)
8. No MCP? Press **Copy Prompt** to copy the current page's annotation set as a markdown task list for any AI coding agent
9. **Bulk manage (정리 ▾)**: resolve or delete all annotations at once, scoped to **this page** or **all pages**. Delete is two-click (arms → confirm) to avoid accidents. Counts update live as you work

Each annotation carries: comment, status, element name, robust CSS path, source location (`data-at`), UI term, computed styles, text, size, and a truncated HTML snippet.

> The annotation UI ships with the inject proxy (`preview_attach`). For `preview_start` sessions, attach to the Vite URL if you need annotations.

## What Claude sees on each click

`inspector_get_selection` returns:

- `sourceLocation` — `{ file, line, column }` from the `data-at` attribute injected by the Vite plugin
- `elementName` — the exact identifier of the element with priority resolution:
  `id` → `data-testid` → `aria-label` → `aria-labelledby` → `<label for>` → component name (from source filename) → `name` → `alt` → `title` → `placeholder` → first class → tag.
  Returned with `primary`, `primarySource`, plus the full set (`componentName`, `id`, `testId`, `ariaLabel`, `role`, `selector`, …)
- `uiTerm` / `uiDescription` — UI/UX terminology inferred from tag, role, class patterns, and computed-style heuristics (Card, Hero Section, Stack Layout, …)
- `tag`, `className`, `textContent` (truncated)
- `boundingRect` — `{ x, y, width, height }`
- `computedStyles` — background, color, font, padding, margin, display, position, size, border-radius, gap
- `parentChain` — up to the body, with id/first-class shorthand

The information panel that pops up in the browser displays the same data — with the exact name shown prominently at the top alongside the source badge.

## Workflow

1. Start or attach a preview (`preview_start` or `preview_attach`)
2. Toggle the inspector (bottom-right button in the browser, or `preview_select_element` with `action: enable_inspector`)
3. Click an element in the page — the side panel shows its exact name, source location, design term, and styles
4. Ask Claude "change the padding on this"
5. Claude calls `inspector_get_selection`, reads the file at `sourceLocation.file:line`, and edits it
6. Vite HMR reloads automatically

See `~/.claude/skills/ui-inspector/SKILL.md` for the skill that wires this up.
