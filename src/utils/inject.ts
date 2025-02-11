import fs from "fs-extra";
import camelCase from "camelcase";
import * as stats from "../utils/stats";

import type { Await, Dependency, Entry, Expression } from "../entry";

let mdInjections: string[] | null = null;

export const markdownComps = (compDir: string): string => {
    const readComps = (dir: string) =>
        fs
            .readdirSync(dir)
            .filter((file) => file.endsWith(".vue"))
            .map((file) => file.replace(/\.vue$/, ""));

    if (mdInjections === null) mdInjections = readComps(compDir);

    let res = "";
    for (const comp of mdInjections) {
        res += `import ${comp} from "@/components/md/${comp}.vue";\n`;
    }
    return res;
};

export const fontawesome = (html: string) => {
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

export const dependencies = (deps: Dependency[]) => {
    let res = "";
    for (const { src, id } of deps) {
        res += `import ${id} from "${src}";\n`;
    }
    return res;
};

export const awaits = async (awaits: Await[]) => {
    let res = "";
    for (const { target, id } of awaits) {
        res += `const ${id} = ${await target()};\n`;
    }
    return res;
};

export const expressions = (exprs: Expression[]) => {
    let res = "";
    for (const { content, id } of exprs) {
        res += `const ${id} = ${content};\n`;
    }
    return res;
};

export const slots = (html: string, entries: Entry[]) =>
    html
        .replaceAll("@PAGE_COUNT", stats.pageCount(entries))
        .replaceAll("@WORD_COUNT", stats.wordCount(entries))
        .replaceAll("@LAST_UPDATE", stats.lastUpdate(entries))
        .replaceAll("@RECENT_UPDATES", stats.recentUpdates(entries));
