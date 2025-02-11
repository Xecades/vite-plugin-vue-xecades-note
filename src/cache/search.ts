import fs from "fs-extra";
import Fuse from "fuse.js";
import { Entry } from "../entry";

import type { IFuseOptions } from "fuse.js";
import type { NotePluginOptions, SearchTarget } from "../global";

/** @see https://www.fusejs.io/api/options.html */
const Fuse_Options: IFuseOptions<SearchTarget> = {
    keys: ["title", "content"],
    includeMatches: true,
    ignoreLocation: true,
    threshold: 0.4,
};

/**
 * Cache search database to `./cache/search.ts`, which yields a `fuse.js` object.
 *
 * @note This module caches the purged html (.text).
 *
 * @param entries - Parsed post objects.
 */
export default (entries: Entry[], options: NotePluginOptions) => {
    const dist: string = `./cache/search.ts`;

    const searchTarget: SearchTarget[] = entries
        .filter((entry) => entry.type !== "404")
        .map(
            (entry): SearchTarget => ({
                title: entry.front_matter.title,
                content: entry.text,
                link: entry.url,
                is_index: entry.type === "index" || entry.type === "root",
            })
        );

    const index = Fuse.createIndex(Fuse_Options.keys!, searchTarget);

    const idx_inj = JSON.stringify(index.toJSON());
    const db_inj = JSON.stringify(searchTarget);
    const config_inj = JSON.stringify(Fuse_Options);

    const cache =
        'import Fuse from "fuse.js";\n' +
        `import type { CachedSearchFn, SearchTarget } from "${options.pluginName}";\n` +
        'import type { FuseIndex, IFuseOptions } from "fuse.js";\n' +
        `const idx = ${idx_inj};\n` +
        `const db: SearchTarget[] = ${db_inj};\n` +
        `const config: IFuseOptions<SearchTarget> = ${config_inj};\n` +
        "const index: FuseIndex<SearchTarget> = Fuse.parseIndex<SearchTarget>(idx);\n" +
        "const fuse: Fuse<SearchTarget> = new Fuse(db, config, index);\n" +
        "const search: CachedSearchFn = (t: string) => (t ? fuse.search(t) : db);\n" +
        "export default search;\n";

    fs.outputFileSync(dist, cache);
    console.log(`[Updated] ${dist} (Search Database)`);
};
