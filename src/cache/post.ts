import fs from "fs-extra";
import * as inject from "../utils/inject";

import type { Entry } from "../entry";
import type { NotePluginOptions } from "../global";

export const updateSomePosts = async (
    entries: Entry[],
    targets: Entry[],
    options: NotePluginOptions
) => {
    for (const entry of entries) {
        const dist = entry.postPathname;
        const html = inject.slots(entry.html, entries);
        if (!targets.includes(entry) && html == entry.html) continue;

        const cache =
            '<script setup lang="tsx">\n' +
            'import dayjs from "@/assets/ts/dayjs";\n' +
            inject.markdownComps(options.componentDir) +
            inject.fontawesome(html) +
            inject.dependencies(entry.dependencies) +
            (await inject.awaits(entry.awaits)) +
            inject.expressions(entry.expressions) +
            "</script>\n\n<template>\n" +
            html +
            "</template>\n";

        fs.outputFileSync(dist, cache);

        console.log(
            `[Updated] ./${entry.postPathname} (${entry.front_matter.title})`
        );
    }
};

export default (entries: Entry[], options: NotePluginOptions) =>
    updateSomePosts(entries, entries, options);
