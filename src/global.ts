import type { FuseResult } from "fuse.js";
import type { RouteRecordSingleView } from "vue-router";
import type { Pathname, Type, URL } from "./entry/identity.ts";
import type { MarkdownFrontMatter } from "./convention.ts";
import type { HeadingData } from "./compiler/types.ts";

export interface NotePluginOptions {
    componentDir: string;
}
export interface NavNode {
    title: string;
    name: string;
    link: URL;
    children: NavNode[];
}
export interface Config {
    nav: NavNode[];
    icon: Record<string, string>;
}
export interface SearchTarget {
    title: string;
    content: string;
    link: URL;
    is_index: boolean;
    created: string;
}
export interface RouteMeta extends Record<string | number | symbol, unknown> {
    pathname: Pathname;
    category: string;
    attr: MarkdownFrontMatter;
    toc: HeadingData[];
    created: string;
    updated: string;
    type: Type;
    breadcrumb: { title: string; link: URL }[];
}
export type CachedRouteRecord = Omit<RouteRecordSingleView, "meta"> & { meta: RouteMeta };
export type CachedSearchFn = (
    query: string,
) => FuseResult<SearchTarget>[] | SearchTarget[];
