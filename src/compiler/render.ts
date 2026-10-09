import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { icon, type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type MarkdownIt from "markdown-it";
import type { Node } from "./parse.ts";
import type { DocumentAnalysis } from "./analyze.ts";
import { attribute, escapeHtml, literal, text } from "./emit.ts";
import type { CompiledDocument, HeadingData } from "./types.ts";
import { getUrl, getPostPathname } from "../entry/resolver.ts";
import type { Pathname } from "../entry/index.ts";

const require = createRequire(import.meta.url);
let typstCompiler:
    import("@myriaddreamin/typst-ts-node-compiler").NodeCompiler | undefined;
const components = new Set([
    "Fold",
    "Tab",
    "Note",
    "LinkCard",
    "Grid",
    "GridColumn",
    "Waterfall",
    "DotPattern",
    "Index",
    "Heading",
    "Anchor",
    "ImageCaptioned",
    "BlockCode",
    "BlockMath",
    "SiteStat",
    "RecentUpdates",
]);
const themes = ["default", "success", "info", "warning", "danger"];
const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex").slice(0, 20);

/** Lower the analyzed document to Vue templates. No metadata is discovered by rendering. */
export function renderDocument(
    md: MarkdownIt,
    tree: Node[],
    analysis: DocumentAnalysis,
    pathname: Pathname,
    componentDir: string,
) {
    const { math, headingIds, titleNodes, captionNodes, plain, fail } =
        analysis;
    const headings: HeadingData[] = [];
    const imports = new Set<string>();
    const dependencies = new Map<string, string>();
    const assets: CompiledDocument["assets"] = [];
    // HTML is data, never arbitrary JS. References stay in this SFC; TOC HTML is independent.
    const html: string[] = [];
    const htmlIds = new Map<string, number>();
    const staticHtml = (value: string) => {
        if (!htmlIds.has(value)) {
            htmlIds.set(value, html.length);
            html.push(value);
        }
        return `html[${htmlIds.get(value)}]`;
    };

    const use = (name: string) => {
        if (components.has(name)) imports.add(name);
        return name;
    };
    const resource = (src: string) => {
        if (!dependencies.has(src))
            dependencies.set(src, `asset_${dependencies.size}`);
        return dependencies.get(src)!;
    };
    const isDelimiter = (node: Node) =>
        node.token.tag === "Delimiter" || node.token.tag === "h1";
    const attrs = (node: Node, omit: string[] = []) =>
        (node.token.attrs ?? [])
            .filter(([name]) => !omit.includes(name))
            .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
            .join("");
    const iconHtml = (node: Node) => {
        const [name, style] = node.token.content.split(".");
        const family =
            style === "r" ? "regular" : style === "b" ? "brands" : "solid";
        const exportName =
            "fa" +
            name
                .split("-")
                .map((s) => s[0]?.toUpperCase() + s.slice(1))
                .join("");
        const definition = require(`@fortawesome/free-${family}-svg-icons`)[
            exportName
        ] as IconDefinition | undefined;
        if (!definition)
            return fail(node, `Unknown icon: ${node.token.content}`);
        return icon(definition, {
            classes: ["icon", node.token.attrGet("class") ?? ""],
            attributes: { "aria-hidden": "true" },
        })!.html.join("");
    };
    type Mode = "vue" | "html";
    const render = (nodes: Node[], mode: Mode = "vue"): string =>
        nodes.map((node) => renderNode(node, mode)).join("");
    const panels = (node: Node) => {
        const result: { delimiter: Node; content: Node[] }[] = [];
        for (const child of node.children) {
            if (isDelimiter(child))
                result.push({ delimiter: child, content: [] });
            else if (result.length) result.at(-1)!.content.push(child);
            else if (
                child.token.type !== "html_block" ||
                !child.token.content.trim().startsWith("<!--")
            )
                fail(
                    child,
                    `${node.token.tag} content must start with a ${node.token.tag === "Tab" ? "# title" : ":sep"} delimiter`,
                );
        }
        if (!result.length)
            fail(node, `${node.token.tag} requires at least one panel`);
        return result;
    };
    const renderNode = (node: Node, mode: Mode): string => {
        const t = node.token;
        // A standalone updates list emits sibling paragraphs, not paragraphs
        // inside another paragraph. Inline occurrences keep phrasing content.
        if (
            mode === "vue" &&
            t.type === "paragraph_open" &&
            node.children.length === 1 &&
            node.children[0].token.type === "inline" &&
            node.children[0].children.length === 1 &&
            node.children[0].children[0].token.type === "text" &&
            node.children[0].children[0].token.content.trim() ===
                "@RECENT_UPDATES"
        )
            return `<${use("RecentUpdates")} block${attrs(node)} />`;
        if (t.hidden) return render(node.children, mode);
        if (t.type === "inline") return render(node.children, mode);
        if (t.type === "text") {
            if (mode === "html") return escapeHtml(t.content);
            // Legacy stat syntax is recognized only in text tokens, never in code or attributes.
            return t.content
                .split(
                    /(@PAGE_COUNT|@WORD_COUNT|@LAST_UPDATE|@RECENT_UPDATES)/g,
                )
                .map((s) => {
                    const keys: Record<string, string> = {
                        "@PAGE_COUNT": "pages",
                        "@WORD_COUNT": "words",
                        "@LAST_UPDATE": "updated",
                    };
                    if (s === "@RECENT_UPDATES")
                        return `<${use("RecentUpdates")} />`;
                    return keys[s]
                        ? `<${use("SiteStat")} kind="${keys[s]}" />`
                        : text(s);
                })
                .join("");
        }
        if (t.type === "code_inline")
            return `<code class="inline-code"${mode === "vue" ? " v-pre" : ""}>${escapeHtml(t.content)}</code>`;
        if (t.type === "math_inline")
            return mode === "html"
                ? `<span>${math.get(node)}</span>`
                : `<span v-html="${staticHtml(math.get(node)!)}"></span>`;
        if (t.type === "math_block")
            return mode === "html"
                ? math.get(node)!
                : `<${use("BlockMath")} :html="${staticHtml(math.get(node)!)}" />`;
        if (t.type === "icon_inline") return iconHtml(node);
        if (t.type === "softbreak") return "\n";
        if (t.type === "hardbreak") return "<br />\n";
        if (t.type === "html_inline" || t.type === "html_block")
            return t.content;
        if (t.type === "fence") {
            const [lang = "plain", ...meta] = t.info.trim().split(/\s+/);
            if (lang === "typst" || lang === "typ") {
                let svg: string;
                try {
                    const {
                        NodeCompiler,
                    } = require("@myriaddreamin/typst-ts-node-compiler");
                    typstCompiler ??= NodeCompiler.create();
                    typstCompiler!.evictCache(10);
                    svg = typstCompiler!.svg({
                        mainFileContent: `#set page(width: auto, height: auto, margin: 5pt)\n#set text(size: 18pt)\n${t.content}`,
                    });
                } catch (error) {
                    return fail(
                        node,
                        `Typst: ${(error as Error).message || (error as { code?: string }).code}`,
                    );
                }
                const filename = `cache/temp/${digest(svg)}.svg`;
                assets.push({ filename, content: svg });
                const caption = captionNodes.get(node)!;
                return `<${use("ImageCaptioned")} class="svg${t.attrGet("class") ? " " + escapeHtml(t.attrGet("class")!) : ""}" ${attribute("alt", plain(caption))} :src="${resource("/" + filename)}">${render(caption)}</ImageCaptioned>`;
            }
            const highlighted = md.renderer.rules.fence!(
                [t],
                0,
                md.options,
                {},
                md.renderer,
            )
                .trim()
                .replace(/^<pre[^>]*>([\s\S]*)<\/pre>$/, "$1");
            return `<${use("BlockCode")} ${attribute("lang", lang)} :html="${staticHtml(highlighted)}" />`;
        }
        if (t.type === "image") {
            const src = t.attrGet("src")!;
            const external = /^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(src);
            const location =
                "/" + path.posix.join(path.posix.dirname(pathname), src);
            if (mode === "html")
                return `<img src="${escapeHtml(external ? src : location)}" alt="${escapeHtml(plain(node.children))}" />`;
            const srcAttr = external
                ? attribute("src", src)
                : `:src="${resource(location)}"`;
            return `<${use("ImageCaptioned")}${attrs(node, ["src", "alt"])} ${srcAttr} ${attribute("alt", plain(node.children))}>${render(node.children)}</ImageCaptioned>`;
        }
        if (t.type === "heading_open") {
            const id = headingIds.get(node)!;
            return `<${use("Heading")} :level="${t.tag.slice(1)}" ${attribute("id", id)}>${render(node.children)}</Heading>`;
        }
        if (t.tag === "Tab") {
            const parts = panels(node);
            use("Tab");
            return (
                `<Tab${attrs(node)} :count="${parts.length}">` +
                parts
                    .map(
                        (part, i) =>
                            `<template #title-${i}>${render(part.delimiter.children)}</template><template #panel-${i}>${render(part.content)}</template>`,
                    )
                    .join("") +
                "</Tab>"
            );
        }
        if (t.tag === "Grid") {
            let start = 1,
                smallStart = 1;
            use("Grid");
            use("GridColumn");
            const columns = panels(node).map(({ delimiter, content }) => {
                const span = Number(delimiter.token.attrGet("span") ?? 24);
                const smallSpan = Number(
                    delimiter.token.attrGet("sm:span") ?? span,
                );
                const offset = Number(delimiter.token.attrGet("offset") ?? 0);
                if (
                    ![span, smallSpan].every(
                        (v) => Number.isInteger(v) && v >= 1 && v <= 24,
                    ) ||
                    !Number.isInteger(offset) ||
                    offset < 0 ||
                    offset > 23
                )
                    fail(
                        delimiter,
                        "Grid spans must be integers from 1 to 24; offset must be 0 to 23",
                    );
                start = ((start - 1) % 24) + 1 + offset;
                smallStart = ((smallStart - 1) % 24) + 1 + offset;
                const html = `<GridColumn :start="${start}" :small-start="${smallStart}" :span="${span}" :small-span="${smallSpan}"${attrs(delimiter, ["span", "sm:span", "offset"])}>${render(content)}</GridColumn>`;
                start += span;
                smallStart += smallSpan;
                return html;
            });
            return `<Grid${attrs(node)}>${columns.join("")}</Grid>`;
        }
        if (t.tag === "Fold" || t.tag === "Note") {
            const theme =
                themes.find((theme) => t.attrGet(theme) === "true") ??
                t.attrGet("type") ??
                "default";
            const bools = ["expand", "always"]
                .filter((name) => t.attrGet(name) === "true")
                .map((name) => ` :${name}="true"`)
                .join("");
            const title = titleNodes.get(node);
            return `<${use(t.tag)}${attrs(node, [...themes, "title", "type", "expand", "always"])} type="${theme}"${bools}>${title ? `<template #title>${render(title)}</template>` : ""}${render(node.children)}</${t.tag}>`;
        }
        let tag = t.tag;
        if (tag === "a" && mode === "vue") tag = "Anchor";
        use(tag);
        let extra = "";
        if (tag === "Index" && !t.attrGet("target"))
            extra = ` target="${getUrl(pathname)}"`;
        const open = `<${tag}${attrs(node)}${extra}>`;
        if (node.close) return open + render(node.children, mode) + `</${tag}>`;
        return `<${tag}${attrs(node)}${extra} />`;
    };

    for (const [node, hash] of headingIds)
        headings.push({
            hash,
            level: Number(node.token.tag.slice(1)),
            title: render(node.children, "html"),
        });
    const template = render(tree);
    const importLines = [...imports]
        .sort()
        .map(
            (name) =>
                `import ${name} from ${literal(path.posix.relative(path.posix.dirname(getPostPathname(pathname)), path.posix.join(componentDir, name + ".vue")))};`,
        );
    for (const [src, name] of dependencies)
        importLines.push(`import ${name} from ${literal(src)};`);
    const componentSource = `<script setup lang="ts">\n${importLines.join("\n")}\n${html.length ? `const html: string[] = ${literal(html)};` : ""}\ndefineOptions({ name: "NoteDocument" });\n</script>\n<template>\n${template}\n</template>\n`;
    return {
        componentSource,
        headings,
        dependencies: [...dependencies.keys()],
        assets,
    };
}
