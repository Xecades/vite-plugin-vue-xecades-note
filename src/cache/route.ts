import fs from "fs-extra";
import { Entry } from "../entry";
import * as inject from "../utils/inject";

import type { NotePluginOptions, RouteMeta } from "../global";

export default (entries: Entry[], options: NotePluginOptions) => {
    const dist = `./cache/routes.tsx`;

    const title_of = (url: string) =>
        entries.find((x) => x.url === url)?.front_matter.title ?? "";

    let cache = inject.markdownComps(options.componentDir);
    cache += `import type { CachedRouteRecord } from "${options.pluginName}";\n`;
    cache += "const routes: CachedRouteRecord[] = [\n";

    let error_cache = "";

    for (const post of entries) {
        const time = post.time;

        const import_slot = "<IMP_SLOT>";
        const toc_slot = "<TOC_SLOT>";
        const toc_title_slot = "<TOC_TITLE_SLOT>";

        const toc =
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

        const path = post.type === "404" ? `/:pathMatch(.*)` : post.url;
        const breadcrumb = post.backUrls.map((x) => ({
            title: title_of(x),
            link: x,
        }));

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
                breadcrumb: breadcrumb,
            } as RouteMeta,
        };

        const stringified =
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
    console.log(`[Updated] ${dist} (Routes)`);
};
