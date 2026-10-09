/** JS literals and HTML attributes are different contexts. Keep their escaping here. */
export const literal = (value: unknown): string =>
    JSON.stringify(value)
        .replaceAll("<", "\\u003c")
        .replaceAll("\u2028", "\\u2028")
        .replaceAll("\u2029", "\\u2029");

export const escapeHtml = (value: string): string =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

/** Static props stay HTML attributes, avoiding executable template expressions entirely. */
export const attribute = (name: string, value: unknown): string =>
    `${name}="${escapeHtml(String(value)).replaceAll("\n", "&#10;").replaceAll("\r", "&#13;")}"`;

export const text = (value: string): string =>
    escapeHtml(value).replaceAll("{", "&#123;");
