import katex from "katex";
import type MarkdownIt from "markdown-it";
import { toTree, type Node } from "./parse.ts";

/** Assign stable IDs and render math once, in document order, including hidden panels. */
export function analyzeDocument(
    md: MarkdownIt,
    tree: Node[],
    pathname: string,
    lineOffset: number,
) {
    const math = new Map<Node, string>();
    const headingIds = new Map<Node, string>();
    const titleNodes = new Map<Node, Node[]>();
    const captionNodes = new Map<Node, Node[]>();
    const macros: NonNullable<katex.KatexOptions["macros"]> = {};
    const fail = (node: Node, message: string): never => {
        throw new Error(`${pathname}:${node.line + lineOffset + 1}: ${message}`);
    };
    const inline = (value: string, line: number) =>
        toTree(md.parseInline(value, {})[0]?.children ?? [], line);

    // Analysis is deterministic and runs even when a caller only needs metadata/search/TOC.
    const analyze = (nodes: Node[], parent = "") => {
        for (const node of nodes) {
            const t = node.token;
            if (t.tag === "h1" && parent !== "Tab")
                fail(
                    node,
                    "Use ## for article headings; # is a Tab panel delimiter only",
                );
            if (t.tag === "Delimiter" && parent !== "Grid" && parent !== "Tab")
                fail(node, ":sep must be a direct child of Grid or Tab");
            if (t.type === "heading_open" && t.tag !== "h1")
                headingIds.set(node, String(headingIds.size + 1));
            if (t.tag === "Fold" && t.attrGet("title")) {
                const nodes = inline(t.attrGet("title")!, node.line);
                titleNodes.set(node, nodes);
                analyze(nodes);
            }
            if (t.type === "math_inline" || t.type === "math_block") {
                try {
                    // globalGroup makes \newcommand persist within this document; each compile owns its macros.
                    math.set(
                        node,
                        katex.renderToString(t.content, {
                            displayMode: t.type === "math_block",
                            macros,
                            globalGroup: true,
                            throwOnError: true,
                        }),
                    );
                } catch (error) {
                    fail(node, `Invalid math: ${(error as Error).message}`);
                }
            }
            if (t.type === "fence" && /^(typ|typst)(\s|$)/.test(t.info)) {
                const caption = inline(
                    t.info.trim().split(/\s+/).slice(1).join(" "),
                    node.line,
                );
                captionNodes.set(node, caption);
                analyze(caption);
            }
            analyze(node.children, t.tag);
        }
    };
    analyze(tree);

    const plain = (nodes: Node[]): string =>
        nodes
            .map((n) => {
                const t = n.token;
                if (t.type.startsWith("math_"))
                    return /\\(?:newcommand|gdef)\b/.test(t.content) ? "" : t.content;
                if (t.type === "icon_inline" || t.type.startsWith("html_")) return "";
                const value = n.children.length ? plain(n.children) : t.content;
                const title = titleNodes.get(n);
                return (
                    (title ? plain(title) + "\n" : "") +
                    value +
                    (t.block || t.type === "softbreak" || t.type === "hardbreak"
                        ? "\n"
                        : "")
                );
            })
            .join("");

    return {
        math,
        headingIds,
        titleNodes,
        captionNodes,
        plain,
        fail,
        searchText: plain(tree),
    };
}

export type DocumentAnalysis = ReturnType<typeof analyzeDocument>;
