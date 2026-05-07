// Babel plugin that injects data-at="file:line:col" into JSX elements during development.
// This enables mapping from rendered DOM elements back to source code.
export default function sourceLocationPlugin({ types: t }) {
  return {
    visitor: {
      JSXOpeningElement(path, state) {
        const { node } = path;

        // Must have location info
        if (!node.loc) return;

        // Skip fragments (<></>) — name is JSXIdentifier with empty string or JSXMemberExpression
        // Babel represents <></> as type "JSXFragment", but just in case:
        if (
          node.name &&
          node.name.type === "JSXIdentifier" &&
          node.name.name === ""
        ) {
          return;
        }

        // Skip if already has data-at attribute
        const hasDataAt = node.attributes.some(
          (attr) =>
            attr.type === "JSXAttribute" &&
            attr.name &&
            attr.name.name === "data-at"
        );
        if (hasDataAt) return;

        // Build relative path from project root
        const cwd = state.cwd || process.cwd();
        const filename = state.filename
          ? state.filename.replace(cwd + "/", "")
          : "unknown";

        const { line, column } = node.loc.start;
        const value = `${filename}:${line}:${column}`;

        // Create JSX attribute: data-at="file:line:col"
        const attr = t.jsxAttribute(
          t.jsxIdentifier("data-at"),
          t.stringLiteral(value)
        );

        node.attributes.push(attr);
      },
    },
  };
}
