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

## Tools (12)

### Preview (7)
- `preview_start` — new Vite session (react / vue / vanilla template)
- `preview_attach` — attach to an existing Next.js/Vite/etc. dev server via inject proxy
- `preview_update` — write/delete files and trigger Vite HMR
- `preview_status`
- `preview_stop`
- `preview_export` — convert to target framework + zip
- `preview_screenshot` — capture viewport or single selector (mobile / tablet / desktop / full)

### Inspector (3)
- `preview_select_element` — enable/disable inspector mode or fetch selection (session-scoped)
- `inspector_get_selection` — most recent click across all sessions; called when the user says "this", "here", "the selected one"
- `inspector_clear_selection`

### Knowledge (2)
- `query_ontology` — local design knowledge store
- `validate_design` — contrast / tap target / hierarchy / spacing rules

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
