import { extractText } from "../utils";
import { sizeOf } from "../utils/image";
import isRelativeUrl from "is-relative-url";
import path from "path";

import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
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
        let src = tokens[idx].attrGet("src")!;
        let caption = self.renderInline(
            tokens[idx].children as Token[],
            options,
            env
        );

        let alt = extractText(caption) || "空";
        let alt_id = env.entry.expr(JSON.stringify(alt));
        let alt_slot = env.tsx ? `alt={${alt_id}}` : `:alt="${alt_id}"`;

        let size_id = env.entry.await(async () => {
            let r_src = isRelativeUrl(src)
                ? path.join(path.dirname(env.entry.pathname), src)
                : src;

            return JSON.stringify(await sizeOf(r_src));
        });
        let size_slot = env.tsx ? `size={${size_id}}` : `:size="${size_id}"`;

        let src_slot;
        if (!isRelativeUrl(src)) {
            src_slot = `src="${src}"`;
        } else {
            let src_id = env.entry.use(src);
            src_slot = env.tsx ? `src={${src_id}}` : `:src="${src_id}"`;
        }

        return `<ImageCaptioned ${alt_slot} ${src_slot} ${size_slot}>${caption}</ImageCaptioned>`;
    };
};
