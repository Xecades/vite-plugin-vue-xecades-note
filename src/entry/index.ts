import fs from "fs-extra";
import path from "path";
import chokidar from "chokidar";
import { reactive } from "vue";
import { createHash } from "node:crypto";

import { timeOf } from "./time";
import fm from "./fm";
import parse from "./parse";
import toc from "./toc";
import render from "./render";
import text from "./text";

import type { Token } from "markdown-it";
import type { MarkdownFrontMatter } from "../convention";
import type { MarkdownHeader } from "../global";

// All these types describe URI of the original file.
export type URL = `/${string}`;
export type Filename = string;
export type Pathname = `docs/${string}.md`;
export type PostPathname = `cache/posts/${string}.vue`;
export type PostImportPath = `@cache/posts/${string}`;
export type Type = "post" | "index" | "root" | "404";

export interface Dependency {
    /** File path, suitable for directly importing, i.e. it can be @-started */
    src: string;

    /** Unique ID, used as variable name */
    id: string;
}

export interface Await {
    /** Promise to be awaited, returns a piece of valid TS code */
    target: () => Promise<string>;

    /** Unique ID, used as variable name */
    id: string;
}

export interface Expression {
    /** Code content */
    content: string;

    /** Unique ID, used as variable name */
    id: string;
}

export interface Entry {
    /**
     * Markdown file name, obtained when traversing.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" // post
     *  "docs/sci/index.md"       // index
     *  "docs/index.md"           // root
     *  "docs/404.md"             // 404
     */
    pathname: Pathname;

    /**
     * A dependency is a file whose URI is not yet known.
     *
     * When parsing markdown, typst code are not rendered yet,
     * thus the URI is unknown, it will be replaced by a constant.
     * */
    dependencies: Dependency[];

    /**
     * An await is data not yet available, it will be fetched asynchronously.
     *
     * To measure size of an online image, we need to fetch it first.
     * The procedure is async, thus we need to await it after parsing.
     */
    awaits: Await[];

    /**
     * An expression is a piece of valid TSX code.
     *
     * Typically used for <></>-ish syntax.
     */
    expressions: Expression[];

    /**
     * Time information of the entry.
     */
    time: { created: string; updated: string };
}

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

/**
 * Entry is a data structure that represents a particular markdown file.
 */
export class Entry {
    // Cached values
    protected _raw?: string;
    protected _front_matter?: MarkdownFrontMatter;
    protected _markdown?: string;
    protected _tokens?: Token[];
    protected _toc?: MarkdownHeader[];
    protected _html?: string;
    protected _text?: string;

    constructor(pathname: Pathname) {
        this.pathname = pathname;
        this.dependencies = [];
        this.awaits = [];
        this.expressions = [];
    }

    /**
     * Create a reactive Entry object, and watch for file changes.
     */
    static async reactive(pathname: Pathname): Promise<Entry> {
        const res = reactive(new Entry(pathname));
        await res.updateTime();

        if (process.env.NODE_ENV == "development") {
            chokidar.watch(pathname).on("change", async () => {
                res.resetCache();
                await res.updateTime();
                console.log(`[Modified] ./${pathname}`);
            });
        }

        return res;
    }

    /**
     * Reset all cached data.
     */
    resetCache() {
        this._raw = undefined;
        this._front_matter = undefined;
        this._markdown = undefined;
        this._tokens = undefined;
        this._toc = undefined;
        this._html = undefined;
        this._text = undefined;
        this.dependencies = [];
        this.awaits = [];
        this.expressions = [];
    }

    /**
     * Update time.
     */
    async updateTime() {
        this.time = await timeOf(this.pathname);
    }

    /**
     * Require from a string.
     *
     * When compiling typst code, you get a piece of svg content,
     * this method will save it as a dependency and return its ID.
     *
     * (e.g. ID: `temp_0`  Src: `amortized-analysis.0.e0cec7bc.svg`)
     *
     * @param content - Content of the file to be saved.
     * @param ext - Extension, e.g. ".svg", etc.
     */
    require(content: string, ext: string): string {
        const filename: string =
            this.filename +
            "." +
            this.dependencies.length +
            "." +
            md5(this.pathname + this.dependencies.length).slice(0, 8);

        const dist = `cache/temp/${filename}${ext}`;
        const id = `temp_${this.dependencies.length}`;

        fs.outputFileSync("./" + dist, content);
        this.dependencies.push({ src: "@" + dist, id });

        return id;
    }

    /**
     * Use a file whose URI is not decided as dependency.
     *
     * The URI of asserts like images are not determined when parsing,
     * this method prepares a slot for it, and returns its unique ID.
     *
     * (e.g. ID: `dep_0`  Src: `/docs/cs/ads/assets/red-black-tree-example.svg`)
     *
     * @param src - Source path of the file.
     */
    use(src: string): string {
        const dist = "/" + path.join(path.dirname(this.pathname), src);
        const id = `dep_${this.dependencies.length}`;

        this.dependencies.push({ src: dist, id });
        return id;
    }

    /**
     * Use content that needs awaiting.
     *
     * When fetching online images, we need to await the response.
     * This method prepares a slot for it, and returns its unique ID.
     *
     * (e.g. ID: `await_0`  Target: `{"height":112,"width":389}`)
     *
     * @param promise - Promise to be awaited, returns a piece of valid TS code.
     */
    await(promise: () => Promise<string>): string {
        const id = `await_${this.awaits.length}`;
        this.awaits.push({ target: promise, id });
        return id;
    }

    /**
     * Use a piece of valid TSX code.
     * 
     * (e.g. ID: `expr_0`  Content: `<>JSX <span>Content</span></>`)
     * 
     * @param content - Code content.
     */
    expr(content: string): string {
        const id = `expr_${this.expressions.length}`;
        this.expressions.push({ content, id });
        return id;
    }

    /**
     * URL of the entry, for 404 page it is `/404`.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "/cs/ads/avl-tree"
     *  "docs/cs/index.md"        -> "/cs"
     *  "docs/index.md"           -> "/"
     *  "docs/404.md"             -> "/404"
     */
    get url(): URL {
        const res = this.pathname
            .replace(/^docs\//, "/")
            .replace(/\.md$/, "")
            .replace(/index$/, "");

        if (res === "/") return "/";
        else return res.replace(/\/$/, "") as URL;
    }

    /**
     * Name of the post, for indices it is the dir name.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "avl-tree"
     *  "docs/cs/index.md"        -> "cs"
     *  "docs/index.md"           -> ""
     *  "docs/404.md"             -> "404"
     */
    get filename(): Filename {
        return path.basename(this.url);
    }

    /**
     * Previous link.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "/cs/ads"
     *  "docs/cs/index.md"        -> "/"
     *  "docs/index.md"           -> "/"
     *  "docs/404.md"             -> "/"
     */
    get backUrl(): URL {
        if (this.type == "root" || this.type == "404") {
            return "/";
        } else {
            let res = this.url.replace(/\/[^/]+$/, "");
            return res === "" ? "/" : (res as URL);
        }
    }

    /**
     * Location to save the rendered post source.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "cache/posts/cs/ads/avl-tree.vue"
     *  "docs/cs/index.md"        -> "cache/posts/cs/index.vue"
     *  "docs/index.md"           -> "cache/posts/index.vue"
     *  "docs/404.md"             -> "cache/posts/404.vue"
     */
    get postPathname(): PostPathname {
        const dist = `cache/posts`;

        let res = this.pathname.replace(/^.+?\//, "");
        res = res.replace(/\.md$/, ".vue");
        res = path.join(dist, res);

        return res as PostPathname;
    }

    /**
     * "@"-started path to import the TSX file.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "@cache/posts/cs/ads/avl-tree"
     *  "docs/cs/index.md"        -> "@cache/posts/cs/index"
     *  "docs/index.md"           -> "@cache/posts/index"
     *  "docs/404.md"             -> "@cache/posts/404"
     */
    get postImportPath(): PostImportPath {
        return ("@" + this.postPathname.slice(0, -4)) as PostImportPath;
    }

    /**
     * Major category of the post. e.g. cs, sci, etc.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "cs"
     *  "docs/cs/index.md"        -> "cs"
     *  "docs/index.md"           -> ""
     *  "docs/404.md"             -> ""
     */
    get category(): string {
        if (this.type === "root" || this.type === "404") {
            return "";
        } else {
            return this.url.split("/")[1];
        }
    }

    /**
     * Type of the post.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "post"
     *  "docs/cs/index.md"        -> "index"
     *  "docs/index.md"           -> "root"
     *  "docs/404.md"             -> "404"
     */
    get type(): Type {
        if (this.pathname === "docs/404.md") {
            return "404";
        } else if (this.pathname === "docs/index.md") {
            return "root";
        } else if (this.pathname.endsWith("/index.md")) {
            return "index";
        } else {
            return "post";
        }
    }

    /**
     * Raw file content.
     */
    get raw(): string {
        if (this._raw === undefined) {
            this._raw = fs.readFileSync(this.pathname, "utf-8");
        }
        return this._raw;
    }

    /**
     * Front matter.
     */
    get front_matter(): MarkdownFrontMatter {
        if (this._front_matter === undefined) {
            this._front_matter = fm(this.raw).front_matter;
        }
        return this._front_matter;
    }

    /**
     * Markdown content.
     */
    get markdown(): string {
        if (this._markdown === undefined) {
            this._markdown = fm(this.raw).markdown;
        }
        return this._markdown;
    }

    /**
     * Tokens.
     */
    get tokens(): Token[] {
        if (this._tokens === undefined) {
            this._tokens = parse(this.markdown, this);
        }
        return this._tokens;
    }

    /**
     * Table of contents.
     */
    get toc(): MarkdownHeader[] {
        if (this._toc === undefined) {
            this._toc = toc(this.tokens, this);
        }
        return this._toc;
    }

    /**
     * Rendered JSX content.
     */
    get html(): string {
        if (this._html === undefined) {
            this._html = render(this.tokens, this);
        }
        return this._html;
    }

    /**
     * Extracted text content.
     */
    get text(): string {
        if (this._text === undefined) {
            this._text = text(this.html);
        }
        return this._text;
    }
}
