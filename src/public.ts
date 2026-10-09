/** Browser-safe type surface; importing these types never traverses the Node compiler. */
export type { URL } from "./entry/identity.ts";
export type { CompiledDocument, HeadingData } from "./compiler/types.ts";
export type {
    Config,
    CachedSearchFn,
    SearchTarget,
    NavNode,
    RouteMeta,
    CachedRouteRecord,
    NotePluginOptions,
} from "./global.ts";

import type { Plugin } from "vite";
import type { NotePluginOptions } from "./global.ts";

/** Value declarations for the Node entry, without exposing its implementation to the browser project. */
declare function note(options: NotePluginOptions): Plugin;
export default note;
export declare function launch(options: NotePluginOptions): Promise<unknown>;
