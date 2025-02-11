import { Entry } from "../entry";
import walkSync from "walk-sync";

import type { Pathname } from "../entry";

/**
 * Traverse a directory synchronously.
 *
 * @see https://www.npmjs.com/package/walk-sync
 */
const traverse = (src: string): string[] =>
    walkSync(src, {
        directories: false,
        globs: ["**/*.md"],
        includeBasePath: true,
    });

let entries: Entry[] = [];
let traversed = false;

export const resetEntries = () => {
    entries = [];
    traversed = false;
};

export const addEntry = async (pathname: Pathname) => {
    const entry = new Entry(pathname);
    await entry.updateTime();
    entries.push(entry);
    return entry;
};

export default async () => {
    if (traversed) return entries;

    const files: string[] = traverse("docs");
    for (const pathname of files) {
        await addEntry(pathname as Pathname);
    }

    traversed = true;
    return entries;
};
