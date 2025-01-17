import type { Entry } from "./entry";
import type { PluginOption } from "vite";
import type { NotePluginOptions } from "./global";

import iter from "./cache/iter";
import search from "./cache/search";
import config from "./cache/config";
import route from "./cache/route";
import post from "./cache/post";

const PLUGIN_NAME = "vite-plugin-vue-xecades-note";

const plugin = (options: NotePluginOptions): PluginOption => {
    options.pluginName = options.pluginName ?? PLUGIN_NAME;

    return {
        name: PLUGIN_NAME,
        enforce: "pre",

        async buildStart() {
            const entries: Entry[] = await iter(options);

            search(entries, options);
            config(entries, options);
            route(entries, options);
            post(entries, options);
        },
    };
};

export default plugin;
export type {
    Config,
    CachedRouteRecord,
    CachedSearchFn,
    SearchTarget,
} from "./global";
