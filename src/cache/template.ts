import * as inject from "../utils/inject.js";
import type { Entry } from "../entry";
import type { NotePluginOptions } from "../global.js";

export const generateVueComponent = async (
    entry: Entry,
    html: string,
    options: NotePluginOptions
): Promise<string> => {
    const imports = [
        'import dayjs from "@/assets/ts/dayjs";',
        inject.markdownComps(options.componentDir),
        inject.fontawesome(html),
        inject.dependencies(entry.dependencies),
    ]
        .filter(Boolean)
        .join("\n");

    const setupCode = [
        await inject.awaits(entry.awaits),
        inject.expressions(entry.expressions),
    ]
        .filter(Boolean)
        .join("\n");

    return `<script setup lang="tsx">
${imports}

${setupCode}
</script>

<template>
${html}
</template>
`;
};
