import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { compileDocument } from "../src/compiler";
import type { Pathname } from "../src/entry/identity";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pages = globSync("docs/**/*.md", { cwd: root }).sort();

describe("existing notebook syntax remains compatible", () => {
    for (const filename of pages) {
        it(
            filename,
            () => {
                const result = compileDocument(
                    readFileSync(path.join(root, filename), "utf8"),
                    filename as Pathname,
                );
                const { descriptor, errors } = parse(result.componentSource, {
                    filename,
                });
                expect(errors).toEqual([]);
                const script = compileScript(descriptor, { id: filename });
                const template = compileTemplate({
                    source: descriptor.template!.content,
                    filename,
                    id: filename,
                    compilerOptions: {
                        bindingMetadata: script.bindings,
                        isCustomElement: (tag) => ["rb", "center"].includes(tag),
                    },
                });
                expect(template.errors).toEqual([]);
            },
            30000,
        );
    }
});
