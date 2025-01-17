import { md } from "./parse";

import type Token from "markdown-it/lib/token.mjs";
import type { MarkdownHeader, MarkdownItEnv } from "../global";
import type { Entry } from ".";

/**
 * Generate TOC from tokens.
 *
 * @param tokens - Tokens
 * @param entry - Self entry
 * @returns Headers extracted from tokens
 */
export default (tokens: Token[], entry: Entry): MarkdownHeader[] => {
    let headers: MarkdownHeader[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === "heading_open") {
            const level: number = parseInt(token.tag.slice(1));

            console.assert(tokens[i + 2].type === "heading_close");
            console.assert(level !== 1);

            const children: Token[] = tokens[i + 1].children!;

            console.assert(children !== null);

            // These tokens are injected by markdown-it-anchor, remove them.
            console.assert(children.at(-3)!.type === "link_open");
            console.assert(children.at(-2)!.type === "html_inline");
            console.assert(children.at(-1)!.type === "link_close");

            const title: string = md.renderer.renderInline(
                children.slice(0, -3),
                md.options,
                { entry, tsx: true } as MarkdownItEnv
            );

            if (title.trim().length == 0) continue;

            headers.push({
                level: level,
                title: title.trim(),
                hash: headers.length === 0 ? "t" : `t-${headers.length + 1}`,
            });
        }
    }

    return headers;
};
