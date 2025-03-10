// @ts-ignore
import innerText from "innertext";

/** @warning 改 MD 渲染的时候记得检查这里 */
const inline_math_regex = /<InlineMath data=".*?"><\/InlineMath>/g;
const block_math_regex =
    /<BlockMath data={.*?}><\/BlockMath>|<BlockMath :data=".*?"><\/BlockMath>/g;
const anchor_regex = / <a class="cursor header-anchor" href="#t.*?">¶<\/a>/g;
const expr_regex = /{{expr_[0-9]+}}/g;

/**
 * Extract raw text from HTML, which is used for generating search index.
 *
 * @param html - HTML content
 * @returns Plain text
 *
 * @see https://www.npmjs.com/package/innertext
 */
export default (html: string): string => {
    // Sanitize math tags
    html = html.replaceAll(inline_math_regex, "[公式]");
    html = html.replaceAll(block_math_regex, "[公式]");
    html = html.replaceAll(expr_regex, "[公式]");

    // Sanitize header anchors
    html = html.replaceAll(anchor_regex, "");

    return innerText(html);
};
