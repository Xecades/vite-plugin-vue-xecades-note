import { Entry } from ".";
import markdown from "../md";

import type { MarkdownItEnv } from "../global";
import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

export const md: MarkdownIt = markdown();

/**
 * Parse markdown content to tokens.
 *
 * @param content - Markdown content
 * @param entry - Entry object
 * @returns Tokens
 */
export default (content: string, entry: Entry): Token[] => {
    return md.parse(content, { entry } as MarkdownItEnv);
};
