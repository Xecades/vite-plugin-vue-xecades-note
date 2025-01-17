import traverse from "../utils/traverse";
import { Entry } from "../entry";

import type { Pathname } from "../entry";
import type { NotePluginOptions } from "../global";

/**
 * Read and parse markdown files.
 *
 * @returns Parsed reactive post objects
 */
export default async (options: NotePluginOptions): Promise<Entry[]> => {
    const files: string[] = traverse("docs");
    const posts: Entry[] = [];

    for (const pathname of files) {
        posts.push(await Entry.reactive(pathname as Pathname));
    }

    return posts;
};
