import type { Entry } from "./entry";
import type { PluginOption } from "vite";
import type { NotePluginOptions } from "./global";

import iter from "./cache/iter";
import search from "./cache/search";
import config from "./cache/config";
import route from "./cache/route";
import post from "./cache/post";

const PLUGIN_NAME = "vite-plugin-vue-xecades-note";

export const launch = async (options: NotePluginOptions) => {
    const entries: Entry[] = await iter(options);

    search(entries, options);
    config(entries, options);
    route(entries, options);
    post(entries, options);
};

const plugin = (options: NotePluginOptions): PluginOption => {
    options.pluginName = options.pluginName ?? PLUGIN_NAME;

    return {
        name: PLUGIN_NAME,
        enforce: "pre",

        buildStart: () => launch(options),
    };
};

export default plugin;
export type { URL } from "./entry";
export type {
    Config,
    CachedRouteRecord,
    CachedSearchFn,
    SearchTarget,
    NavNode,
    MarkdownHeaderJsx,
    RouteMeta,
} from "./global";
