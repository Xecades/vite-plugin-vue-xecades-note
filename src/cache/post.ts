import fs from "fs-extra";
import camelCase from "camelcase";
import injection from "../utils/injection";
import { watchEffect } from "vue";

import type { Await, Dependency, Entry, Expression } from "../entry";
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
                '<script setup lang="tsx">\n' +
                injection(options.componentDir) +
                injectFontAwesome(post.html) +
                injectDependencies(post.dependencies) +
                (await injectAwaits(post.awaits)) +
                injectExpressions(post.expressions) +
                "</script>\n\n<template>\n" +
                post.html +
                "</template>\n";

            fs.outputFileSync(dist, cache);

            console.log(`[Updated] ./${post.postPathname}`);
        });
    }
};
