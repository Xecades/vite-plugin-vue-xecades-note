import { md } from "./parse";
import { Entry } from ".";

import type Token from "markdown-it/lib/token.mjs";
import type { MarkdownItEnv } from "../global";

/**
 * Render tokens to JSX string.
 *
 * @param tokens - Tokens
 * @param entry - Entry object
 * @returns JSX string
 */
export default (tokens: Token[], entry: Entry): string => {
    return md.renderer
        .render(tokens, md.options, { entry } as MarkdownItEnv)
        .replace(/<!--.*?-->/g, "");
};
