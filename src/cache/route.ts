import fs from "fs-extra";
import injection from "../utils/injection";
import { Entry } from "../entry";
import { watchEffect } from "vue";

import type { NotePluginOptions, RouteMeta } from "../global";

/**
 * Generate `./cache/routes.tsx` from parsed markdown data.
 *
 * @note This module generates children routes for Vue SFCs.
 *
 * @param entries - Parsed post objects.
 */
export default (entries: Entry[], options: NotePluginOptions) => {
    const dist: string = `./cache/routes.tsx`;

    watchEffect(async () => {
        let cache: string = injection(options.componentDir);
        cache += `import type { CachedRouteRecord } from "${options.pluginName}";\n`;
        cache += "const routes: CachedRouteRecord[] = [\n";

        let error_cache: string = "";

        for (const post of entries) {
            const time = post.time;

            const import_slot: string = "<IMP_SLOT>";
            const toc_slot: string = "<TOC_SLOT>";
            const toc_title_slot: string = "<TOC_TITLE_SLOT>";

            const toc: string =
                "[" +
                post.toc
                    .map((x) =>
                        JSON.stringify({
                            ...x,
                            title: toc_title_slot,
                        }).replace(`"${toc_title_slot}"`, `<>${x.title}</>`)
                    )
                    .join(",") +
                "]";

            const path: string =
                post.type === "404" ? `/:pathMatch(.*)` : post.url;

            let parent = entries.find((x) => x.url === post.backUrl);
            if (parent === undefined)
                throw new Error(`Invalid back link: ${post.backUrl}`);
            let parent_title = parent?.front_matter.title ?? "";

            const route = {
                path: path,
                component: import_slot,
                meta: {
                    pathname: post.pathname,
                    category: post.category,
                    attr: post.front_matter,
                    toc: toc_slot as any,
                    created: time.created,
                    updated: time.updated,
                    type: post.type,
                    back: {
                        link: post.backUrl,
                        title: parent_title,
                    },
                } as RouteMeta,
            };

            const stringified: string =
                JSON.stringify(route)
                    .replace(
                        `"${import_slot}"`,
                        `() => import("${post.postImportPath}.vue")`
                    )
                    .replace(`"${toc_slot}"`, toc) + ",\n";

            if (post.type === "404") error_cache = stringified;
            else cache += stringified;
        }

        cache += error_cache;
        cache += "];\n";
        cache += "export default routes;\n";

        fs.outputFileSync(dist, cache);
        console.log(`[Updated] ${dist}`);
    });
};
