import { defaultRenderer, extractText } from "../utils";
import isRelativeUrl from "is-relative-url";

import type MarkdownIt from "markdown-it";
import type { MarkdownItEnv } from "../../global";

/**
 * Transform image syntax `![...](...)` into `ImageCaptioned` component.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    md.renderer.rules.image = (
        tokens,
        idx,
        options,
        env: MarkdownItEnv,
        self
    ) => {
        const token = tokens[idx];
        token.tag = "ImageCaptioned";

        let src = token.attrGet("src")!;
        let caption = self.renderInline(token.children!, options, env);

        let alt = extractText(caption) || "";
        let alt_id = env.entry.expr(JSON.stringify(alt));
        let alt_slot = env.tsx ? `alt={${alt_id}}` : `:alt="${alt_id}"`;

        let src_slot;
        if (!isRelativeUrl(src)) {
            src_slot = `src="${src}"`;
        } else {
            let src_id = env.entry.use(src);
            src_slot = env.tsx ? `src={${src_id}}` : `:src="${src_id}"`;
        }

        const ALT_PH = "@@alt@@";
        const SRC_PH = "@@src@@";
        token.attrSet("src", SRC_PH);
        token.attrSet("alt", ALT_PH);

        return defaultRenderer(tokens, idx, options, env, self)
            .replace(/ \/>$/, `>${caption}</ImageCaptioned>`)
            .replace(`alt="${ALT_PH}"`, alt_slot)
            .replace(`src="${SRC_PH}"`, src_slot);
    };
};
