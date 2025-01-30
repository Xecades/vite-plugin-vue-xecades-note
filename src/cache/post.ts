import fs from "fs-extra";
import camelCase from "camelcase";
import injection from "../utils/injection";
import { watchEffect } from "vue";
import * as stats from "../utils/stats";

import type { Await, Dependency, Entry, Expression } from "../entry";
import type { NotePluginOptions } from "../global";

const injectFontAwesome = (html: string): string => {
    const regex =
        /<font-awesome-icon.+?class="icon.*?" icon="fa-(\S+) (\S+)" \/>/gs;
    const icons = new Set<string>();

    let match;
    while ((match = regex.exec(html))) {
        const [, type, name] = match;

        icons.add(camelCase(name) + "." + type);
    }

    if (icons.size === 0) return "";

    let res = 'import { library } from "@fortawesome/fontawesome-svg-core";\n';
    let count = 0;
    for (const icon of icons) {
        const [name, type] = icon.split(".");
        res += `import { ${name} as icon_${count} } from "@fortawesome/free-${type}-svg-icons";\n`;
        count++;
    }
    res +=
        "library.add(icon_" + [...Array(count).keys()].join(", icon_") + ");\n";

    return res;
};

const injectDependencies = (deps: Dependency[]): string => {
    let res: string = "";

    for (const { src, id } of deps) {
        res += `import ${id} from "${src}";\n`;
    }

    return res;
};

const injectAwaits = async (awaits: Await[]): Promise<string> => {
    let res: string = "";

    for (const { target, id } of awaits) {
        res += `const ${id} = ${await target()};\n`;
    }

    return res;
};

const injectExpressions = (exprs: Expression[]): string => {
    let res: string = "";

    for (const { content, id } of exprs) {
        res += `const ${id} = ${content};\n`;
    }

    return res;
};

const injectSlots = (html: string, entries: Entry[]): string =>
    html
        .replaceAll("@PAGE_COUNT", stats.pageCount(entries))
        .replaceAll("@WORD_COUNT", stats.wordCount(entries))
        .replaceAll("@LAST_UPDATE", stats.lastUpdate(entries))
        .replaceAll("@RECENT_UPDATES", stats.recentUpdates(entries));

/**
 * Cache parsed HTML and save them as TSXs in `./cache/posts/*`.
 *
 * @note This module caches Vue components as TSX.
 *
 * @param entries - Parsed post objects.
 */
export default (entries: Entry[], options: NotePluginOptions) => {
    for (const entry of entries) {
        watchEffect(async () => {
            const dist: string = entry.postPathname;
            const html: string = injectSlots(entry.html, entries);

            const cache: string =
                '<script setup lang="tsx">\n' +
                injection(options.componentDir) +
                injectFontAwesome(html) +
                injectDependencies(entry.dependencies) +
                (await injectAwaits(entry.awaits)) +
                injectExpressions(entry.expressions) +
                "</script>\n\n<template>\n" +
                html +
                "</template>\n";

            fs.outputFileSync(dist, cache);

            console.log(`[Updated] ./${entry.postPathname}`);
        });
    }
};
