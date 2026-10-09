import fm from "front-matter";
import { createParser, toTree } from "./parse.ts";
import { analyzeDocument } from "./analyze.ts";
import { renderDocument } from "./render.ts";
import type { CompiledDocument } from "./types.ts";
import type { MarkdownFrontMatter } from "../convention.ts";
import type { Pathname } from "../entry/identity.ts";

/** Parse → analyze → render. Compilation returns data; the build adapter owns filesystem writes. */
export function compileDocument(
    source: string,
    pathname: Pathname,
    componentDir = "src/components/md",
): CompiledDocument {
    const parsed = fm<MarkdownFrontMatter>(source);
    if (typeof parsed.attributes.title !== "string")
        throw new Error(`${pathname}: front matter requires a title`);
    for (const key of ["comment", "timestamp"] as const) {
        if (
            parsed.attributes[key] !== undefined &&
            typeof parsed.attributes[key] !== "boolean"
        )
            throw new Error(`${pathname}: front matter ${key} must be a boolean`);
    }
    const md = createParser();
    const tree = toTree(md.parse(parsed.body, {}));
    const lineOffset =
        source.slice(0, source.length - parsed.body.length).split("\n").length - 1;
    const analysis = analyzeDocument(md, tree, pathname, lineOffset);
    const output = renderDocument(md, tree, analysis, pathname, componentDir);
    return { metadata: parsed.attributes, searchText: analysis.searchText, ...output };
}

export type { CompiledDocument, HeadingData } from "./types.ts";
