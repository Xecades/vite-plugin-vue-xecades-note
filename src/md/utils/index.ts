import type { RenderRule } from "markdown-it/lib/renderer.mjs";
import type Token from "markdown-it/lib/token.mjs";

/** The default token renderer. */
export const defaultRenderer: RenderRule = (tokens, idx, options, env, self) =>
    self.renderToken(tokens, idx, options);

/**
 * Remove attribute on token.
 *
 * @param token - Token
 * @param name - Attribute name
 */
export const removeAttr = (token: Token, name: string) => {
    let idx = token.attrIndex(name);
    if (idx !== -1) {
        token.attrs!.splice(idx, 1);
    }
};

/** Supported color themes. */
export const THEMES: string[] = [
    "default",
    "success",
    "info",
    "warning",
    "danger",
];

export { default as typst } from "./typst";
export { default as extractText } from "../../entry/text";
export { default as MarkdownItWrapper } from "../markdown-it-wrapper";
