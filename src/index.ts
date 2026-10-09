import path from "node:path";
import type { Plugin } from "vite";
import { buildSite } from "./build.ts";
import type { NotePluginOptions } from "./global.ts";

export const launch = (options: NotePluginOptions) => buildSite(options);

/** Development and production use the same complete build, including cache-hit metadata. */
export default function note(options: NotePluginOptions): Plugin {
    let root = process.cwd();
    let pending = Promise.resolve();
    const rebuild = () => {
        const run = pending.then(() => buildSite(options, root));
        pending = run.then(
            () => {},
            () => {},
        );
        return run;
    };
    return {
        name: "vite-plugin-vue-xecades-note",
        enforce: "pre",
        configResolved(config) {
            root = config.root;
        },
        async buildStart() {
            await rebuild();
        },
        hotUpdate(context) {
            // A document edit publishes several derived modules. Reload only after the whole batch is ready.
            if (context.file.startsWith(path.join(root, "cache") + path.sep)) return [];
        },
        configureServer(server) {
            const docs = path.join(root, "docs");
            const onChange = (file: string) => {
                if (!file.startsWith(docs + path.sep)) return;
                void rebuild()
                    .then(() => {
                        server.environments.client.moduleGraph.invalidateAll();
                        server.ws.send({ type: "full-reload" });
                    })
                    .catch((error) => {
                        server.config.logger.error(String(error));
                        server.ws.send({
                            type: "error",
                            err: { message: String(error), stack: "" },
                        });
                    });
            };
            server.watcher.add(docs);
            for (const event of ["add", "change", "unlink"] as const)
                server.watcher.on(event, onChange);
            server.httpServer?.once("close", () => {
                for (const event of ["add", "change", "unlink"] as const)
                    server.watcher.off(event, onChange);
            });
        },
    };
}
export type { URL } from "./entry/index.ts";
export type { CompiledDocument, HeadingData } from "./compiler/index.ts";
export type {
    Config,
    CachedSearchFn,
    SearchTarget,
    NavNode,
    RouteMeta,
    CachedRouteRecord,
    NotePluginOptions,
} from "./global.ts";
