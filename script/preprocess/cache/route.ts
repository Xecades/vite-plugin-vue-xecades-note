import fs from "fs-extra";
import injection from "../utils/injection";
import { Post } from "../utils/post";
import { watchEffect } from "vue";

import type { RouteMeta } from "../../types";

/**
 * Generate `./cache/routes.tsx` from parsed markdown data.
 *
 * @note This module generates children routes for Vue SFCs.
 *
 * @param posts - Parsed post objects.
 */
export default (posts: Post[]) => {
    const dist: string = `./cache/routes.tsx`;

    watchEffect(async () => {
        let cache: string = injection();
        cache += `import note from "@/layout/note.vue";\n`;
        cache += `import type { CachedRouteRecord } from "@script/types";\n`;
        cache += "const routes: CachedRouteRecord[] = [\n";

        let error_cache: string = "";

        for (const post of posts) {
            const time_data = post.time_data;

            const import_slot: string = "<IMP_SLOT>";
            const component_slot: string = "<COM_SLOT>";
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
                post.type === "404" ? `/:pathMatch(.*)` : post.link;

            let parent = posts.find((x) => x.link === post.back_link);
            if (post.back_link != "" && parent === undefined)
                throw new Error(`Invalid back link: ${post.back_link}`);
            let parent_title = parent?.front_matter.title ?? "";

            const route = {
                path: path,
                component: component_slot,
                meta: {
                    pathname: post.pathname,
                    category: post.category,
                    body: import_slot as any,
                    attr: post.front_matter,
                    toc: toc_slot as any,
                    created: time_data.created,
                    updated: time_data.updated,
                    type: post.type,
                    back: {
                        link: post.back_link,
                        title: parent_title,
                    },
                } as RouteMeta,
            };

            const stringified: string =
                JSON.stringify(route)
                    .replace(
                        `"${import_slot}"`,
                        `() => import("${post.tsx_import_path}")`
                    )
                    .replace(`"${component_slot}"`, "note")
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
