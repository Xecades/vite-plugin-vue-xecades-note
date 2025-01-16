import fs from "fs-extra";
import path from "path";
import Token from "markdown-it/lib/token.mjs";
import chokidar from "chokidar";
import { createHash } from "node:crypto";
import { reactive } from "vue";
import { timeDataOf } from "../git";

import { type MarkdownFrontMatter, type MarkdownHeader } from "../../../types";

import fm from "../md/fm";
import parse from "../md/parse";
import toc from "../md/toc";
import render from "../md/render";
import text from "../md/text";

export interface Post {
    /**
     * Raw markdown file name obtained when traversing.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" // post
     *  "docs/cs/index.md"        // index
     *  "docs/index.md"           // root
     *  "docs/404.md"             // 404
     */
    pathname: string;
    dependencies: { src: string; name: string }[];
    awaits: { target: () => Promise<string>; name: string }[];
    time_data: { created: string; updated: string };
}

export class Post {
    // Cached values
    protected _raw?: string;
    protected _front_matter?: MarkdownFrontMatter;
    protected _markdown?: string;
    protected _tokens?: Token[];
    protected _toc?: MarkdownHeader[];
    protected _html?: string;
    protected _text?: string;

    constructor(pathname: string) {
        this.pathname = pathname;
        this.dependencies = [];
        this.awaits = [];
    }

    /** Create a reactive post object. */
    static async reactive(pathname: string): Promise<Post> {
        const res = reactive(new Post(pathname));
        await res.update_time_data();

        if (process.env.NODE_ENV == "development") {
            chokidar.watch(pathname).on("change", async () => {
                res.reset();
                await res.update_time_data();
                console.log(`[Modified] ./${pathname}`);
            });
        }

        return res;
    }

    /** Reset all cached data. */
    reset() {
        this._raw = undefined;
        this._front_matter = undefined;
        this._markdown = undefined;
        this._tokens = undefined;
        this._toc = undefined;
        this._html = undefined;
        this._text = undefined;
        this.dependencies = [];
        this.awaits = [];
    }

    /** Update time data. */
    async update_time_data() {
        this.time_data = await timeDataOf(this.pathname);
    }

    /** Require from a string. */
    require(content: string, ext: string): string {
        // e.g. amortized-analysis.0.e0cec7bc.svg
        const filename: string =
            this.filename +
            "." +
            this.dependencies.length +
            "." +
            createHash("md5")
                .update(this.pathname + this.dependencies.length)
                .digest("hex")
                .slice(0, 8) +
            ext;

        const dist = `./cache/temp/${filename}`;
        const name = `temp_${this.dependencies.length}`;

        fs.outputFileSync(dist, content);

        this.dependencies.push({ src: dist.slice(1), name });
        return name;
    }

    /** Require from a file. */
    use(src: string): string {
        const dist = "/" + path.join(path.dirname(this.pathname), src);
        const name = `dep_${this.dependencies.length}`;

        this.dependencies.push({ src: dist, name });
        return name;
    }

    /** Content that needs awaiting before injecting. */
    await(promise: () => Promise<string>): string {
        const name = `await_${this.awaits.length}`;
        this.awaits.push({ target: promise, name });
        return name;
    }

    /**
     * URL of the post, except for 404.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "/cs/ads/avl-tree"
     *  "docs/cs/index.md"        -> "/cs"
     *  "docs/index.md"           -> "/"
     *  "docs/404.md"             -> "/404"
     */
    get link(): string {
        const res = this.pathname
            .replace(/^docs\//, "/")
            .replace(/\.md$/, "")
            .replace(/index$/, "");
        return res === "/" ? res : res.replace(/\/$/, "");
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
    get filename(): string {
        return path.basename(this.link);
    }

    /**
     * Previous link.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "/cs/ads"
     *  "docs/cs/index.md"        -> "/"
     *  "docs/index.md"           -> ""
     *  "docs/404.md"             -> "/"
     */
    get back_link(): string {
        if (this.type == "root") {
            return "";
        } else if (this.type == "404") {
            return "/";
        }
        let res = this.link.replace(/\/[^/]+$/, "");
        return res === "" ? "/" : res;
    }

    /**
     * Location to save the TSX file.
     *
     * @example
     *  "docs/cs/ads/avl-tree.md" -> "cache/posts/cs/ads/avl-tree.tsx"
     *  "docs/cs/index.md"        -> "cache/posts/cs/index.tsx"
     *  "docs/index.md"           -> "cache/posts/index.tsx"
     *  "docs/404.md"             -> "cache/posts/404.tsx"
     */
    get tsx_pathname(): string {
        const dist = `./cache/posts`;

        let res = this.pathname.replace(/^.+?\//, "");
        res = res.replace(/\.md$/, ".tsx");
        res = path.join(dist, res);

        return res;
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
    get tsx_import_path(): string {
        return "@cache/posts" + this.tsx_pathname.slice(11, -4);
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
        }
        return this.link.split("/")[1];
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
    get type(): "index" | "post" | "404" | "root" {
        if (this.pathname === "docs/404.md") {
            return "404";
        } else if (this.pathname === "docs/index.md") {
            return "root";
        } else if (this.pathname.endsWith("/index.md")) {
            return "index";
        }
        return "post";
    }

    /** Raw file content. */
    get raw(): string {
        if (this._raw === undefined) {
            this._raw = fs.readFileSync(this.pathname, "utf-8");
        }
        return this._raw;
    }

    /** Front matter. */
    get front_matter(): MarkdownFrontMatter {
        if (this._front_matter === undefined) {
            this._front_matter = fm(this.raw).front_matter;
        }
        return this._front_matter;
    }

    /** Markdown content. */
    get markdown(): string {
        if (this._markdown === undefined) {
            this._markdown = fm(this.raw).markdown;
        }
        return this._markdown;
    }

    /** Tokens. */
    get tokens(): Token[] {
        if (this._tokens === undefined) {
            this._tokens = parse(this.markdown, this);
        }
        return this._tokens;
    }

    /** Table of contents. */
    get toc(): MarkdownHeader[] {
        if (this._toc === undefined) {
            this._toc = toc(this.tokens);
        }
        return this._toc;
    }

    /** Rendered JSX content. */
    get html(): string {
        if (this._html === undefined) {
            this._html = render(this.tokens, this);
        }
        return this._html;
    }

    /** Extracted text content. */
    get text(): string {
        if (this._text === undefined) {
            this._text = text(this.html);
        }
        return this._text;
    }
}
