import markdownItPrism from "markdown-it-prism";
import { defaultRenderer, extractText, typst } from "../utils";

import type MarkdownIt from "markdown-it";
import type { MarkdownItEnv } from "../../global";

/**
 * Register code block syntax highlighting.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    /**
     * @name markdown-it-prism
     * @see https://github.com/jGleitz/markdown-it-prism
     */
    md.use(markdownItPrism);

    const originalFence = md.renderer.rules.fence || defaultRenderer;

    md.renderer.rules.fence = (
        tokens,
        idx,
        options,
        env: MarkdownItEnv,
        self
    ) => {
        const { info } = tokens[idx];

        const lang = info.split(" ")[0] || "plain";
        const meta = info.split(" ").slice(1).join(" ");

        /** @todo 处理 meta 中的转义、引号等 */

        if (lang === "typst" || lang === "typ") {
            // Process Typst code block
            let svg = typst(tokens[idx].content);
            let cap = meta || "";
            let cap_html = md.renderInline(cap, env);
            let alt = extractText(cap_html) || "空";
            let alt_id = env.entry.expr(JSON.stringify(alt));
            let alt_slot = env.tsx ? `alt={${alt_id}}` : `:alt="${alt_id}"`;

            let src = env.entry.require(svg, ".svg");
            let src_slot = env.tsx ? `src={{${src}}}` : `:src="${src}"`;

            return `<ImageCaptioned ${alt_slot} ${src_slot}>${cap_html}</ImageCaptioned>`;
            //
        } else {
            // Process normal code block
            let html = originalFence(tokens, idx, options, env, self)
                .trim()
                .replace(/^<pre.*?>(.*)<\/pre>$/gs, (...m) => m[1]);

            let id = env.entry.expr(JSON.stringify(html));

            return `<BlockCode lang="${lang}" :html="${id}"></BlockCode>`;
            //
        }
    };
};
