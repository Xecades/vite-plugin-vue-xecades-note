import type MarkdownIt from "markdown-it";
import type { MarkdownItEnv } from "../../global";

/**
 * Escape inline code and add class to it.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    md.renderer.rules.code_inline = (
        tokens,
        idx,
        options,
        env: MarkdownItEnv,
        self
    ) => {
        let content = JSON.stringify(tokens[idx].content);
        let id = env.entry.expr(content);
        let slot = env.tsx ? `{${id}}` : `{{${id}}}`;

        return `<code class="inline-code">${slot}</code>`;
    };
};
