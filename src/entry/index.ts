import fs from "node:fs";
import { compileDocument } from "../compiler/index.ts";
import * as resolver from "./resolver.ts";
import type { CompiledDocument } from "../compiler/index.ts";

import type { Pathname } from "./identity.ts";
export type {
    URL,
    Filename,
    Pathname,
    PostPathname,
    PostImportPath,
    Type,
} from "./identity.ts";

/** File identity stays separate from the complete compilation result. */
export class Entry {
    pathname: Pathname;
    constructor(pathname: Pathname) {
        this.pathname = pathname;
    }
    get url() {
        return resolver.getUrl(this.pathname);
    }
    get filename() {
        return resolver.getFilename(this.url);
    }
    get backUrls() {
        return resolver.getBackUrls(this.url, this.type);
    }
    get postPathname() {
        return resolver.getPostPathname(this.pathname);
    }
    get postImportPath() {
        return resolver.getPostImportPath(this.postPathname);
    }
    get category() {
        return resolver.getCategory(this.url, this.type);
    }
    get type() {
        return resolver.getType(this.pathname);
    }
    compile(): CompiledDocument {
        return compileDocument(fs.readFileSync(this.pathname, "utf8"), this.pathname);
    }
}
