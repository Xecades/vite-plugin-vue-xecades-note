import MarkdownIt from "markdown-it";
import MarkdownItMdc from "markdown-it-mdc";
import prism from "markdown-it-prism";
import attrs from "../md/plugins/attrs.ts";
import checkbox from "../md/plugins/checkbox.ts";
import cjk from "../md/plugins/cjk.ts";
import tags from "../md/plugins/tags.ts";
import wrapper from "../md/markdown-it-wrapper/index.ts";
import type Token from "markdown-it/lib/token.mjs";

/** The parser only recognizes syntax. It never writes files or collects render side effects. */
export function createParser() {
    const md = new MarkdownIt({ html: true, typographer: true, xhtmlOut: true });
    md.use(prism, {});
    md.use(wrapper, {
        type: "inline",
        name: "math_inline",
        marker: "$",
        renderer: () => "",
    });
    md.use(wrapper, {
        type: "block",
        name: "math_block",
        marker: "$$",
        renderer: () => "",
    });
    md.use(wrapper, {
        type: "inline",
        name: "icon_inline",
        marker: ":",
        renderer: () => "",
    });
    md.use(checkbox);
    md.use(MarkdownItMdc, { syntax: { inlineSpan: false, inlineProps: false } });
    md.use(tags);
    md.use(cjk);
    md.use(attrs);
    return md;
}

/** A small document tree over markdown-it tokens, preserving their source locations. */
export interface Node {
    token: Token;
    line: number;
    children: Node[];
    close?: Token;
}

export function toTree(tokens: Token[], parentLine = 0): Node[] {
    const root: Node[] = [];
    const stack: Node[] = [];
    for (const token of tokens) {
        if (token.nesting === -1) {
            const parent = stack.pop();
            if (!parent) throw new Error(`Unexpected closing token: ${token.type}`);
            parent.close = token;
            continue;
        }
        const line = token.map?.[0] ?? stack.at(-1)?.line ?? parentLine;
        const node: Node = {
            token,
            line,
            children: token.children ? toTree(token.children, line) : [],
        };
        (stack.at(-1)?.children ?? root).push(node);
        if (token.nesting === 1) stack.push(node);
    }
    if (stack.length) throw new Error(`Unclosed token: ${stack.at(-1)!.token.type}`);
    return root;
}
