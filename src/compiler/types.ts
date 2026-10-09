import type { MarkdownFrontMatter } from "../convention.ts";

export interface HeadingData {
    level: number;
    hash: string;
    /** Compiler-produced static HTML, including math and icons; never JavaScript or VNodes. */
    title: string;
}

export interface Asset {
    filename: string;
    content: string;
}

/** The complete, serializable unit stored in the content-addressed cache. */
export interface CompiledDocument {
    metadata: MarkdownFrontMatter;
    componentSource: string;
    headings: HeadingData[];
    searchText: string;
    dependencies: string[];
    assets: Asset[];
}
