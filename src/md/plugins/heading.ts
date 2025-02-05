import { MarkdownItEnv } from "../../global";

import type MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token.mjs";

/**
 * Transform all headings into Vue components.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    md.renderer.rules.heading_open = (
        tokens,
        idx,
        options,
        env: MarkdownItEnv,
        self
    ) => {
        const token = tokens[idx];
        const level = parseInt(token.tag.slice(1));
        const children: Token[] = tokens[idx + 1].children!;

        console.assert(level !== 1);
        console.assert(children !== null);

        const inlineEnv: MarkdownItEnv = { entry: env.entry, tsx: true };
        const title: string = md.renderer
            .renderInline(children, options, inlineEnv)
            .trim();

        const id = env.entry.toc.length + 1;
        env.entry.toc.push({ level, title, hash: id.toString() });

        return `<Heading :level=${level} :id=${id}>`;
    };

    md.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const level = parseInt(token.tag.slice(1));
        console.assert(level !== 1);
        return "</Heading>\n";
    };
};
