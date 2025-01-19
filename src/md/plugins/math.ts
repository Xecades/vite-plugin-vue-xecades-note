import { MarkdownItWrapper } from "../utils";

import type { MarkdownItEnv } from "../../global";
import type MarkdownIt from "markdown-it";

export const escape = (s: string): string =>
    s.replaceAll('"', '\\"').replaceAll("\n", "\\n");

/**
 * Transform `$...$` and `$$...$$` into inline and block math components.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    /**
     * @name markdown-it-for-inline
     * @see https://github.com/markdown-it/markdown-it-for-inline
     */

    md.use(MarkdownItWrapper, {
        type: "inline",
        name: "math_inline",
        marker: "$",
        renderer: (c: string) =>
            `<InlineMath data="${escape(c)}"></InlineMath>`,
    });

    md.use(MarkdownItWrapper, {
        type: "block",
        name: "math_block",
        marker: "$$",
        renderer: (c: string, env: MarkdownItEnv) => {
            let content = JSON.stringify(c);
            let id = env.entry.expr(content);

            if (env.tsx) return `<BlockMath data={${id}}></BlockMath>`;
            else return `<BlockMath :data="${id}"></BlockMath>`;
        },
    });
};
