export type URL = `/${string}`;
export type Filename = string;
export type Pathname = `docs/${string}.md`;
export type PostPathname = `cache/posts/${string}.vue`;
export type PostImportPath = `@cache/posts/${string}`;
export type Type = "post" | "index" | "root" | "404";
