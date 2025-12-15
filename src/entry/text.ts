import type Token from "markdown-it/lib/token.mjs";
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
const fromHtml = (html: string): string => {
    // Sanitize math tags
    html = html.replaceAll(inline_math_regex, "[公式]");
    html = html.replaceAll(block_math_regex, "[公式]");
    html = html.replaceAll(expr_regex, "[公式]");

    // Sanitize header anchors
    html = html.replaceAll(anchor_regex, "");

    return innerText(html);
};

const block_tags = [
    "paragraph_close",
    "heading_close",
    "blockquote_close",
    "bullet_list_close",
    "ordered_list_close",
    "list_item_close",
    "table_close",
    "tr_close",
    "div_close",
];

const newcmd_head = /\\newcommand\s*{\\([a-zA-Z]+)}\s*(?:\[(\d+)])?\s*{/g;

const extract = (tokens: Token[]): string => {
    let result = "";
    for (const token of tokens) {
        if (token.children && token.children.length > 0) {
            result += extract(token.children);
        } else {
            if (
                token.type === "text" ||
                token.type === "code_inline" ||
                token.type === "fence" ||
                token.type === "math_inline" ||
                token.type === "math_block"
            ) {
                if (
                    (token.type === "math_inline" || token.type === "math_block")
                    && token.content.match(newcmd_head)
                ) {
                    // Skip macro definitions
                } else {
                    result += token.content;
                }
            }

            if (token.type === "softbreak") {
                result += " ";
            } else if (token.type === "hardbreak") {
                result += "\n";
            }
        }

        if (
            block_tags.includes(token.type) ||
            token.type === "fence" ||
            token.type === "math_block"
        ) {
            result += "\n";
        }
    }
    return result;
};

/**
 * Extract raw text from Markdown tokens, which is used for generating search index.
 *
 * @param tokens - Markdown tokens
 * @returns Plain text
 */
const fromTokens = (tokens: Token[]): string => {
    return extract(tokens);
};

export default (input: string | Token[]): string => {
    if (typeof input === "string") {
        return fromHtml(input);
    } else {
        return fromTokens(input);
    }
};
