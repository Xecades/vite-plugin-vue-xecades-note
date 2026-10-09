import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { globSync } from "node:fs";
import yaml from "yaml";
import Fuse from "fuse.js";
import { compileDocument, type CompiledDocument } from "./compiler/index.ts";
import { literal } from "./compiler/emit.ts";
import { Entry, type Pathname, type URL } from "./entry/index.ts";
import { timeOf } from "./entry/time.ts";
import type {
    Config,
    NavNode,
    NotePluginOptions,
    RouteMeta,
    SearchTarget,
} from "./global.ts";
import type { RawConfig, RawNavNode } from "./convention.ts";

const hash = (source: string) => createHash("sha256").update(source).digest("hex");
export const searchOptions = {
    keys: ["title", "content"],
    includeMatches: true,
    ignoreLocation: true,
    threshold: 0.4,
};
interface CachedDocument {
    key: string;
    result: CompiledDocument;
}
interface Cache {
    version: number;
    documents: Record<string, CachedDocument>;
}
export interface SiteDocument {
    entry: Entry;
    result: CompiledDocument;
    time: { created: string; updated: string };
}

// Capture once per loaded compiler. Editing files cannot silently give old in-memory code a new fingerprint.
let loadedCompilerSources: Promise<string[]> | undefined;

/** Changing the compiler or its installed dependencies invalidates old content results after restart. */
async function compilerFingerprint(root: string, options: NotePluginOptions) {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const files = globSync("**/*.ts", { cwd: dir }).sort();
    const sources = await (loadedCompilerSources ??= Promise.all(
        files.map((file) => fs.readFile(path.join(dir, file), "utf8")),
    ));
    const lock = await fs
        .readFile(path.join(root, "package-lock.json"), "utf8")
        .catch(() => "");
    return hash(JSON.stringify([sources, lock, options.componentDir]));
}

async function writeChanged(file: string, source: string) {
    if ((await fs.readFile(file, "utf8").catch(() => null)) !== source)
        await fs.outputFile(file, source);
}

export function siteStats(documents: SiteDocument[]) {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    const count = (text: string) =>
        [...segmenter.segment(text)].filter((part) => part.isWordLike).length;
    const posts = documents
        .filter((d) => d.entry.type === "post")
        .sort((a, b) => Date.parse(b.time.updated) - Date.parse(a.time.updated));
    return {
        pages: documents.filter((d) => d.entry.type !== "404").length,
        words: documents.reduce((sum, d) => sum + count(d.result.searchText), 0),
        updated: documents.reduce(
            (latest, d) =>
                Date.parse(d.time.updated) > Date.parse(latest) ? d.time.updated : latest,
            documents[0]?.time.updated ?? "",
        ),
        recent: posts.slice(0, 3).map((d) => ({
            title: d.result.metadata.title,
            link: d.entry.url,
            updated: d.time.updated,
        })),
    };
}

function navigation(raw: RawNavNode[], documents: SiteDocument[]): NavNode[] {
    const byPath = new Map(documents.map((d) => [d.entry.pathname, d]));
    const visit = (node: RawNavNode | string, parent = ""): NavNode => {
        const name = typeof node === "string" ? node : Object.keys(node)[0];
        const link = `${parent}/${name}` as URL;
        const pathname =
            `docs${link}${typeof node === "string" ? ".md" : "/index.md"}` as Pathname;
        const document = byPath.get(pathname);
        if (!document)
            throw new Error(
                `docs/config.yml: navigation points to missing document ${pathname}`,
            );
        const children = typeof node === "string" ? [] : node[name];
        if (!Array.isArray(children))
            throw new Error(`docs/config.yml: ${link} must contain a list`);
        return {
            name,
            link,
            title: document.result.metadata.title,
            children: children.map((child) => visit(child, link)),
        };
    };
    return raw.map((node) => visit(node));
}

export async function buildSite(options: NotePluginOptions, root = process.cwd()) {
    const cacheFile = path.join(root, "cache/.documents.json");
    const previous: Cache = await fs
        .readJson(cacheFile)
        .catch(() => ({ version: 1, documents: {} }));
    const next: Cache = { version: 1, documents: {} };
    const fingerprint = await compilerFingerprint(root, options);
    const paths = globSync("**/*.md", { cwd: path.join(root, "docs") }).sort();
    const documents: SiteDocument[] = [];
    let compiled = 0;
    for (const file of paths) {
        const pathname = `docs/${file}` as Pathname;
        const source = await fs.readFile(path.join(root, pathname), "utf8");
        const key = hash(fingerprint + source + pathname);
        const cached = previous.documents[pathname];
        const result =
            cached?.key === key
                ? cached.result
                : compileDocument(source, pathname, options.componentDir);
        if (cached?.key !== key) compiled++;
        next.documents[pathname] = { key, result };
        const entry = new Entry(pathname);
        documents.push({ entry, result, time: await timeOf(pathname, root) });
    }
    const raw = yaml.parse(
        await fs.readFile(path.join(root, "docs/config.yml"), "utf8"),
    ) as RawConfig;
    const config: Config = { ...raw, nav: navigation(raw.nav, documents) };
    // Publish only after every document and the navigation have validated successfully.
    for (const { entry, result } of documents) {
        for (const dependency of result.dependencies) {
            if (dependency.startsWith("/cache/temp/")) continue;
            if (!(await fs.pathExists(path.join(root, dependency.split(/[?#]/)[0]))))
                throw new Error(`${entry.pathname}: missing asset ${dependency}`);
        }
    }
    for (const { entry, result } of documents) {
        await writeChanged(path.join(root, entry.postPathname), result.componentSource);
        for (const asset of result.assets)
            await writeChanged(path.join(root, asset.filename), asset.content);
    }
    // Remove stale outputs without depending on whether a prior manifest survived.
    const expected = new Set(
        documents.flatMap((d) => [
            d.entry.postPathname,
            ...d.result.assets.map((a) => a.filename),
        ]),
    );
    for (const directory of ["cache/posts", "cache/temp"]) {
        if (!(await fs.pathExists(path.join(root, directory)))) continue;
        for (const file of globSync("**/*.*", { cwd: path.join(root, directory) })) {
            const relative = `${directory}/${file}`;
            if (!expected.has(relative)) await fs.remove(path.join(root, relative));
        }
    }
    await writeChanged(
        path.join(root, "cache/config.ts"),
        `import type { Config } from "vite-plugin-vue-xecades-note";\nconst config: Config = ${literal(config)};\nexport default config;\n`,
    );
    await writeChanged(
        path.join(root, "cache/stats.ts"),
        `export default ${literal(siteStats(documents))};\n`,
    );

    const byUrl = new Map(documents.map((d) => [d.entry.url, d]));
    const routes = documents.map(({ entry, result, time }) => {
        const meta: RouteMeta = {
            pathname: entry.pathname,
            category: entry.category,
            attr: result.metadata,
            toc: result.headings,
            ...time,
            type: entry.type,
            breadcrumb: entry.backUrls.map((link) => ({
                link,
                title: byUrl.get(link)?.result.metadata.title ?? "",
            })),
        };
        return `{ path: ${literal(entry.type === "404" ? "/:pathMatch(.*)*" : entry.url)}, component: () => import(${literal(entry.postImportPath + ".vue")}), meta: ${literal(meta)} }`;
    });
    await writeChanged(
        path.join(root, "cache/routes.ts"),
        `import type { CachedRouteRecord } from "vite-plugin-vue-xecades-note";\nconst routes: CachedRouteRecord[] = [\n${routes.join(",\n")}\n];\nexport default routes;\n`,
    );
    await fs.remove(path.join(root, "cache/routes.tsx"));
    const targets: SearchTarget[] = documents
        .filter((d) => d.entry.type !== "404")
        .map(({ entry, result, time }) => ({
            title: result.metadata.title,
            content: result.searchText,
            link: entry.url,
            is_index: entry.type === "index" || entry.type === "root",
            created: time.created,
        }))
        .sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
    const index = Fuse.createIndex(searchOptions.keys, targets).toJSON();
    await writeChanged(
        path.join(root, "cache/search.ts"),
        `import Fuse from "fuse.js";\nimport type { CachedSearchFn, SearchTarget } from "vite-plugin-vue-xecades-note";\nconst db: SearchTarget[] = ${literal(targets)};\nconst fuse = new Fuse(db, ${literal(searchOptions)}, Fuse.parseIndex<SearchTarget>(${literal(index)}));\nconst search: CachedSearchFn = query => query ? fuse.search(query) : db;\nexport default search;\n`,
    );
    await writeChanged(cacheFile, JSON.stringify(next));
    console.log(
        `[Note] ${compiled} compiled, ${documents.length - compiled} cached; navigation, search and statistics synchronized`,
    );
    return documents;
}
