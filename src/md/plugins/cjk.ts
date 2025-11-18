import markdownItCjkFriendly from "markdown-it-cjk-friendly";

import type MarkdownIt from "markdown-it";

/**
 * CJK fixes for MarkdownIt
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    /**
     * @name markdown-it-cjk-friendly
     * @see https://github.com/tats-u/markdown-cjk-friendly/tree/main/packages/markdown-it-cjk-friendly
     */
    md.use(markdownItCjkFriendly);
};
