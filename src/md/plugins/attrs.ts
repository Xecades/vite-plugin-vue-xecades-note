// @ts-ignore
import MarkdownItBracketedSpans from "markdown-it-bracketed-spans";
import MarkdownItAttrs from "markdown-it-attrs";

import type MarkdownIt from "markdown-it";

/**
 * Parse {} attributes in markdown.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    /**
     * @name markdown-it-bracketed-spans
     * @see https://github.com/mb21/markdown-it-bracketed-spans
     */
    md.use(MarkdownItBracketedSpans);

    /**
     * @name markdown-it-attrs
     * @see https://github.com/arve0/markdown-it-attrs
     */
    md.use(MarkdownItAttrs);
};
