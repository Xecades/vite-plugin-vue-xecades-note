import MarkdownIt from "markdown-it";

import codeBlock from "./plugins/code-block";
import codeInline from "./plugins/code-inline";
import math from "./plugins/math";
import icon from "./plugins/icon";
import link from "./plugins/link";
import heading from "./plugins/heading";
import image from "./plugins/image";
import checkbox from "./plugins/checkbox";
import mdc from "./plugins/mdc";
import delim from "./plugins/delim";
import tags from "./plugins/tags";
import attrs from "./plugins/attrs";

/**
 * Get a markdown-it instance.
 *
 * @returns MarkdownIt instance
 */
export default (): MarkdownIt => {
    /**
     * MarkdownIt Configurations
     *
     * @see https://markdown-it.github.io/markdown-it/#MarkdownIt.new
     */
    const md = new MarkdownIt({
        html: true,
        typographer: true,
        xhtmlOut: true,
    });

    md.use(codeBlock);
    md.use(codeInline);
    md.use(math);
    md.use(icon);
    md.use(link);
    md.use(heading);
    md.use(image);
    md.use(checkbox);
    md.use(mdc);
    md.use(delim);
    md.use(tags);
    md.use(attrs);

    // console.log(md.core.ruler.__rules__.map((r) => r.name));
    // console.log(md.inline.ruler.__rules__.map((r) => r.name));

    return md;
};
