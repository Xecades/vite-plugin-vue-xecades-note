import type { JSX } from "vue/jsx-runtime";
import type { FuseResult } from "fuse.js";
import type { RouteRecordSingleView } from "vue-router";
import type { Entry, Pathname, Type, URL } from "./entry";
import type { MarkdownFrontMatter, RawConfig } from "./convention";

export const assertType = <T>(value: any): T => value as unknown as T;

export interface NotePluginOptions {
    /** The directory where markdown components are stored. */
    componentDir: string;

    /** Name of the plugin. */
    pluginName?: string;

    /** Path of the Vue layout. */
    layoutImportPath: string;
}

/**
 * Parsed front matter.
 */
export interface MarkdownFrontMatterParsed {
    /** Front matter attributes */
    front_matter: MarkdownFrontMatter;

    /** Raw markdown content */
    markdown: string;
}

/**
 * Header extracted from markdown.
 */
export interface MarkdownHeader {
    /** Header level */
    level: number;

    /** Header title HTML */
    title: string;

    /** Header permalink */
    hash: string;
}

/**
 * Header extracted from markdown, title is JSX element
 */
export type MarkdownHeaderJsx = Omit<MarkdownHeader, "title"> & {
    title: JSX.Element;
};

/**
 * MarkdownIt environment.
 */
export interface MarkdownItEnv {
    /** Entry object */
    entry: Entry;

    /** Is use TSX syntax */
    tsx: boolean;
}

/**
 * The object passed to fuse.js to be indexed.
 */
export interface SearchTarget {
    /** Article title */
    title: string;

    /** Purged article content */
    content: string;

    /** Article link */
    link: URL;

    /** Whether is index file, i.e. pathname ends with `index.md` */
    is_index: boolean;
}

/**
 * Parsed nav node.
 */
export interface NavNode {
    /** Nav title */
    title: string;

    /** Nav name, e.g. `cs`, `math` */
    name: string;

    /** Link to the article */
    link: URL;

    /** Children nodes */
    children: NavNode[];
}

/**
 * Parsed configurations.
 */
export type Config = Omit<RawConfig, "nav"> & { nav: NavNode[] };

/**
 * Route meta data.
 */
export interface RouteMeta {
    /** Pathname of local markdown file */
    pathname: Pathname;

    /** Category of the route, empty string for `/index` and 404 page */
    category: string;

    /** Body component */
    body: () => Promise<{ default: () => JSX.Element }>;

    /** Parsed front matter */
    attr: MarkdownFrontMatter;

    /** Table of contents */
    toc: MarkdownHeaderJsx[];

    /** Creation time */
    created: string;

    /** Last modified time */
    updated: string;

    /** Page type */
    type: Type;

    /** Back link */
    back: { title: string; link: URL };

    /** Route scroll to */
    scrollTo?: { left: number; top: number };
}

/**
 * Cached route record.
 */
export type CachedRouteRecord = RouteRecordSingleView & { meta: RouteMeta };

/**
 * Cached search function.
 */
export type CachedSearchFn = (
    query: string
) => SearchTarget[] | FuseResult<SearchTarget>[];
