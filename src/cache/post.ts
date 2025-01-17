import fs from "fs-extra";
import camelCase from "camelcase";
import injection from "../utils/injection";
import { Entry } from "../entry";
import { watchEffect } from "vue";

import type { NotePluginOptions } from "../global";

const injectFontAwesome = (html: string): string => {
    const iconRegex: RegExp =
        /<font-awesome-icon class="icon" icon="(.*?)" \/>/gs;
    const to_module_name = (icon: string) => camelCase("fa-" + icon);

    const icons = new Set<string>();

    let match;
    while ((match = iconRegex.exec(html))) {
        icons.add(to_module_name(match[1]));
    }

    if (icons.size === 0) return "";

    let res: string =
        'import { library } from "@fortawesome/fontawesome-svg-core";\n';
    for (const icon of icons) {
        res += `import { ${icon} } from "@fortawesome/free-solid-svg-icons";\n`;
    }
    res += "library.add(" + Array.from(icons).join(", ") + ");\n";

    return res;
};

type Dependencies = typeof Entry.prototype.dependencies;
const injectDependencies = (dep: Dependencies): string => {
    let res: string = "";

    for (const { src, id } of dep) {
        res += `import ${id} from "${src}";\n`;
    }

    return res;
};

type Awaits = typeof Entry.prototype.awaits;
const injectAwaits = async (awaits: Awaits): Promise<string> => {
    let res: string = "";

    for (const { target, id } of awaits) {
        res += `const ${id} = ${await target()};\n`;
    }

    return res;
};

/**
 * Cache parsed HTML and save them as TSXs in `./cache/posts/*`.
 *
 * @note This module caches Vue components as TSX.
 *
 * @param posts - Parsed post objects.
 */
export default (posts: Entry[], options: NotePluginOptions) => {
    for (const post of posts) {
        watchEffect(async () => {
            const dist: string = post.postPathname;

            const cache: string =
                '<script setup lang="ts">\n' +
                injection(options.componentDir) +
                injectFontAwesome(post.html) +
                injectDependencies(post.dependencies) +
                (await injectAwaits(post.awaits)) +
                "</script>\n\n<template>\n" +
                post.html +
                "</template>\n";

            fs.outputFileSync(dist, cache);

            console.log(`[Updated] ./${post.postPathname}`);
        });
    }
};
